import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { findOrderById, updateOrderStatus } from '../models/order.model';
import { assertValidTransition } from '../utils/orderStateMachine';
import { ApiError } from '../middleware/errorHandler';

const raiseSchema = z.object({
  orderId: z.string().uuid(),
  reason: z.string().min(3).max(100),
  description: z.string().min(10).max(2000),
});

export async function raise(req: Request, res: Response) {
  const input = raiseSchema.parse(req.body);
  const order = await findOrderById(input.orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.customer_id !== req.user!.id && order.shopper_id !== req.user!.id) {
    throw new ApiError(403, 'Not part of this order');
  }

  const dispute = await queryOne(
    `INSERT INTO disputes (order_id, raised_by, reason, description) VALUES ($1,$2,$3,$4) RETURNING *`,
    [input.orderId, req.user!.id, input.reason, input.description]
  );

  if (order.status !== 'disputed') {
    assertValidTransition(order.status, 'disputed', req.user!.role);
    await updateOrderStatus(order.id, 'disputed', req.user!.id, { note: `Dispute raised: ${input.reason}` });
  }

  res.status(201).json({ dispute });
}

export async function listAll(_req: Request, res: Response) {
  const disputes = await query(
    `SELECT d.*, o.status AS order_status, o.customer_id, o.shopper_id
     FROM disputes d JOIN orders o ON o.id = d.order_id
     ORDER BY d.created_at DESC`
  );
  res.json({ disputes });
}

const resolveSchema = z.object({
  status: z.enum(['resolved_customer', 'resolved_shopper', 'resolved_split', 'closed']),
  resolutionNote: z.string().max(2000).optional(),
  finalOrderStatus: z.enum(['completed', 'cancelled', 'refunded']).optional(),
});

/** Admin-only: resolves a dispute and optionally forces the order to a terminal status. */
export async function resolve(req: Request, res: Response) {
  const input = resolveSchema.parse(req.body);
  const dispute = await queryOne<{ id: string; order_id: string }>(
    `UPDATE disputes SET status = $2, resolution_note = $3, resolved_by = $4, resolved_at = now()
     WHERE id = $1 RETURNING id, order_id`,
    [req.params.id, input.status, input.resolutionNote ?? null, req.user!.id]
  );
  if (!dispute) throw new ApiError(404, 'Dispute not found');

  if (input.finalOrderStatus) {
    const order = await findOrderById(dispute.order_id);
    if (order) {
      assertValidTransition(order.status, input.finalOrderStatus, 'admin');
      await updateOrderStatus(order.id, input.finalOrderStatus, req.user!.id, {
        note: `Dispute resolved: ${input.resolutionNote ?? ''}`,
      });
    }
  }

  res.json({ success: true });
}
