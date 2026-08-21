import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { findOrderById } from '../models/order.model';
import { findUserById } from '../models/user.model';
import { notifyNewMessage } from '../services/notification.service';
import { ApiError } from '../middleware/errorHandler';

async function assertParticipant(orderId: string, userId: string, role: string) {
  const order = await findOrderById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (role !== 'admin' && order.customer_id !== userId && order.shopper_id !== userId) {
    throw new ApiError(403, 'Not authorized to view this conversation');
  }
  return order;
}

/**
 * Every conversation this user is part of — one per order — newest activity
 * first, with the other person's name, the last line, and an unread count.
 * This is the inbox behind the chat list.
 */
export async function conversations(req: Request, res: Response) {
  const userId = req.user!.id;
  const isShopper = req.user!.role === 'shopper';

  const rows = await query(
    `SELECT
       o.id                AS order_id,
       o.status            AS order_status,
       o.created_at        AS order_created_at,
       other.id            AS other_id,
       other.full_name     AS other_name,
       other.avatar_url    AS other_avatar,
       other.role          AS other_role,
       -- Exposed only to the counterparty on a live order, so the two people
       -- working on it can call each other directly.
       other.phone         AS other_phone,
       r.title             AS request_title,
       last.body           AS last_body,
       last.attachment_url AS last_attachment,
       last.created_at     AS last_at,
       last.sender_id      AS last_sender_id,
       COALESCE(unread.n, 0)::int AS unread
     FROM orders o
     JOIN users other
       ON other.id = CASE WHEN o.customer_id = $1 THEN o.shopper_id ELSE o.customer_id END
     LEFT JOIN shopping_requests r ON r.id = o.request_id
     LEFT JOIN LATERAL (
       SELECT body, attachment_url, created_at, sender_id
         FROM messages WHERE order_id = o.id
        ORDER BY created_at DESC LIMIT 1
     ) last ON TRUE
     LEFT JOIN LATERAL (
       SELECT count(*) AS n FROM messages
        WHERE order_id = o.id AND sender_id <> $1 AND read_at IS NULL
     ) unread ON TRUE
     WHERE ($2 AND o.shopper_id = $1) OR (NOT $2 AND o.customer_id = $1)
     ORDER BY COALESCE(last.created_at, o.created_at) DESC`,
    [userId, isShopper]
  );

  res.json({ conversations: rows });
}

/** Marks the other side's messages in this order as read. */
export async function markRead(req: Request, res: Response) {
  await assertParticipant(req.params.orderId, req.user!.id, req.user!.role);
  const rows = await query(
    `UPDATE messages SET read_at = now()
      WHERE order_id = $1 AND sender_id <> $2 AND read_at IS NULL
      RETURNING id`,
    [req.params.orderId, req.user!.id]
  );
  res.json({ marked: rows.length });
}

export async function list(req: Request, res: Response) {
  await assertParticipant(req.params.orderId, req.user!.id, req.user!.role);
  const messages = await query(
    `SELECT m.*, u.full_name AS sender_name, u.role AS sender_role
     FROM messages m JOIN users u ON u.id = m.sender_id
     WHERE m.order_id = $1 ORDER BY m.created_at ASC`,
    [req.params.orderId]
  );
  res.json({ messages });
}

const sendSchema = z.object({
  body: z.string().max(2000).optional(),
  attachmentUrl: z.string().url().optional(),
}).refine((v) => v.body || v.attachmentUrl, { message: 'Message must have text or an attachment' });

export async function send(req: Request, res: Response) {
  const order = await assertParticipant(req.params.orderId, req.user!.id, req.user!.role);
  const input = sendSchema.parse(req.body);
  const message = await queryOne(
    `INSERT INTO messages (order_id, sender_id, body, attachment_url) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.orderId, req.user!.id, input.body ?? null, input.attachmentUrl ?? null]
  );

  // Whoever is on the other side of this order gets the bell entry.
  const isSenderCustomer = order.customer_id === req.user!.id;
  const recipientId = isSenderCustomer ? order.shopper_id : order.customer_id;
  if (recipientId) {
    const sender = await findUserById(req.user!.id);
    await notifyNewMessage({
      orderId: order.id,
      recipientId,
      recipientRole: isSenderCustomer ? 'shopper' : 'customer',
      senderName: sender?.full_name ?? 'Someone',
      preview: input.body ?? 'Sent an attachment',
    });
  }

  res.status(201).json({ message });
}
