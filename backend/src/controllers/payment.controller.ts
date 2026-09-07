import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { paymentService } from '../services/payment.service';
import { findOrderById } from '../models/order.model';
import { ApiError } from '../middleware/errorHandler';
import { hasOversight } from '../utils/roles';

export async function listForOrder(req: Request, res: Response) {
  const order = await findOrderById(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (!hasOversight(req.user!.role) && order.customer_id !== req.user!.id && order.shopper_id !== req.user!.id) {
    throw new ApiError(403, 'Not authorized');
  }
  const payments = await query('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC', [req.params.orderId]);
  res.json({ payments });
}

export async function listMine(req: Request, res: Response) {
  const payments = await query(
    `SELECT p.*, o.status AS order_status FROM payments p
     JOIN orders o ON o.id = p.order_id
     WHERE p.payer_id = $1 ORDER BY p.created_at DESC`,
    [req.user!.id]
  );
  res.json({ payments });
}

const confirmSchema = z.object({ paymentId: z.string().uuid() });

export async function confirm(req: Request, res: Response) {
  const { paymentId } = confirmSchema.parse(req.body);

  const existing = await queryOne<{ id: string; order_id: string; status: string }>(
    'SELECT id, order_id, status FROM payments WHERE id = $1',
    [paymentId]
  );
  if (!existing) throw new ApiError(404, 'Payment not found');

  const order = await findOrderById(existing.order_id);
  if (!order) throw new ApiError(404, 'Order not found');

  const isShopper = order.shopper_id === req.user!.id;
  if (!isShopper && !hasOversight(req.user!.role)) {
    throw new ApiError(403, 'Only the shopper who collected the payment, or Duka staff, can confirm it');
  }
  if (existing.status === 'paid') throw new ApiError(409, 'This payment is already confirmed');
  if (!['delivered', 'completed'].includes(order.status)) {
    throw new ApiError(409, 'A payment can only be confirmed once the order has been delivered');
  }

  const result = await paymentService.confirmManually(paymentId);
  const payment = await queryOne(
    `UPDATE payments SET status = $2, paid_at = now(), provider = $3 WHERE id = $1 RETURNING *`,
    [paymentId, result.status, result.provider]
  );
  res.json({ payment });
}
