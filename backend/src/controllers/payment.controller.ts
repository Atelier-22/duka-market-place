import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { paymentService } from '../services/payment.service';
import { findOrderById } from '../models/order.model';
import { ApiError } from '../middleware/errorHandler';

export async function listForOrder(req: Request, res: Response) {
  const order = await findOrderById(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (req.user!.role !== 'admin' && order.customer_id !== req.user!.id && order.shopper_id !== req.user!.id) {
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

/** Customer/admin confirms a cash-on-delivery or manual payment was received. */
export async function confirm(req: Request, res: Response) {
  const { paymentId } = confirmSchema.parse(req.body);
  const result = await paymentService.confirmManually(paymentId);
  const payment = await queryOne(
    `UPDATE payments SET status = $2, paid_at = now(), provider = $3 WHERE id = $1 RETURNING *`,
    [paymentId, result.status, result.provider]
  );
  if (!payment) throw new ApiError(404, 'Payment not found');
  res.json({ payment });
}
