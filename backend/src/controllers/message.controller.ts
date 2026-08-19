import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { findOrderById } from '../models/order.model';
import { ApiError } from '../middleware/errorHandler';

async function assertParticipant(orderId: string, userId: string, role: string) {
  const order = await findOrderById(orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (role !== 'admin' && order.customer_id !== userId && order.shopper_id !== userId) {
    throw new ApiError(403, 'Not authorized to view this conversation');
  }
  return order;
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
  await assertParticipant(req.params.orderId, req.user!.id, req.user!.role);
  const input = sendSchema.parse(req.body);
  const message = await queryOne(
    `INSERT INTO messages (order_id, sender_id, body, attachment_url) VALUES ($1,$2,$3,$4) RETURNING *`,
    [req.params.orderId, req.user!.id, input.body ?? null, input.attachmentUrl ?? null]
  );
  res.status(201).json({ message });
}
