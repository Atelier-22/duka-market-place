import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { findOrderById } from '../models/order.model';
import { ApiError } from '../middleware/errorHandler';

const rateSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function rateOrder(req: Request, res: Response) {
  const input = rateSchema.parse(req.body);
  const order = await findOrderById(req.params.orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.status !== 'completed') throw new ApiError(409, 'Can only rate a completed order');

  const isCustomer = order.customer_id === req.user!.id;
  const isShopper = order.shopper_id === req.user!.id;
  if (!isCustomer && !isShopper) throw new ApiError(403, 'Not part of this order');

  const ratedUser = isCustomer ? order.shopper_id : order.customer_id;

  const rating = await queryOne<{ id: string }>(
    `INSERT INTO ratings (order_id, rated_by, rated_user, stars)
     VALUES ($1,$2,$3,$4)
     ON CONFLICT (order_id, rated_by) DO UPDATE SET stars = EXCLUDED.stars
     RETURNING id`,
    [order.id, req.user!.id, ratedUser, input.stars]
  );

  if (input.comment && rating) {
    await query(`INSERT INTO reviews (rating_id, comment) VALUES ($1,$2)`, [rating.id, input.comment]);
  }

  // Recompute the shopper's rolling average when a shopper was rated.
  if (isCustomer) {
    await query(
      `UPDATE shopper_profiles sp SET
         rating_count = agg.count,
         rating_avg = agg.avg
       FROM (
         SELECT rated_user, COUNT(*) AS count, ROUND(AVG(stars)::numeric, 2) AS avg
         FROM ratings WHERE rated_user = $1 GROUP BY rated_user
       ) agg
       WHERE sp.user_id = agg.rated_user AND sp.user_id = $1`,
      [ratedUser]
    );
  }

  res.status(201).json({ success: true });
}
