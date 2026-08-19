import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../middleware/errorHandler';

export async function getDashboard(_req: Request, res: Response) {
  const [users, orders, gmv, disputes, pendingVerifications] = await Promise.all([
    queryOne<{ customers: string; shoppers: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE role = 'customer') AS customers,
         COUNT(*) FILTER (WHERE role = 'shopper') AS shoppers
       FROM users`
    ),
    queryOne<{ active: string; completed_today: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('completed','cancelled','refunded')) AS active,
         COUNT(*) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE) AS completed_today
       FROM orders`
    ),
    queryOne<{ total: string }>(
      `SELECT COALESCE(SUM(total_amount_ugx), 0) AS total FROM orders WHERE status = 'completed'`
    ),
    queryOne<{ open: string }>(`SELECT COUNT(*) AS open FROM disputes WHERE status = 'open'`),
    queryOne<{ count: string }>(`SELECT COUNT(*) AS count FROM shopper_profiles WHERE verification_status = 'pending'`),
  ]);

  res.json({
    customers: Number(users?.customers ?? 0),
    shoppers: Number(users?.shoppers ?? 0),
    activeOrders: Number(orders?.active ?? 0),
    completedToday: Number(orders?.completed_today ?? 0),
    grossMerchandiseValueUgx: Number(gmv?.total ?? 0),
    openDisputes: Number(disputes?.open ?? 0),
    pendingVerifications: Number(pendingVerifications?.count ?? 0),
  });
}

export async function listCustomers(_req: Request, res: Response) {
  const rows = await query(
    `SELECT u.id, u.full_name, u.phone, u.email, u.created_at, cp.total_orders, cp.total_spent_ugx
     FROM users u JOIN customer_profiles cp ON cp.user_id = u.id
     ORDER BY u.created_at DESC LIMIT 200`
  );
  res.json({ customers: rows });
}

export async function listShoppers(_req: Request, res: Response) {
  const rows = await query(
    `SELECT u.id, u.full_name, u.phone, u.email, u.created_at, sp.verification_status,
            sp.rating_avg, sp.completed_jobs, sp.available_balance_ugx, sp.is_online
     FROM users u JOIN shopper_profiles sp ON sp.user_id = u.id
     ORDER BY u.created_at DESC LIMIT 200`
  );
  res.json({ shoppers: rows });
}

export async function listPendingVerifications(_req: Request, res: Response) {
  const rows = await query(
    `SELECT vr.*, u.full_name, u.phone FROM verification_records vr
     JOIN users u ON u.id = vr.shopper_id
     WHERE vr.status = 'pending' ORDER BY vr.created_at ASC`
  );
  res.json({ verifications: rows });
}

const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().max(500).optional(),
});

export async function reviewVerification(req: Request, res: Response) {
  const input = reviewSchema.parse(req.body);
  const record = await queryOne<{ id: string; shopper_id: string }>(
    `UPDATE verification_records SET status = $2, reviewed_by = $3, reviewed_at = now(), rejection_reason = $4
     WHERE id = $1 RETURNING id, shopper_id`,
    [req.params.id, input.status, req.user!.id, input.rejectionReason ?? null]
  );
  if (!record) throw new ApiError(404, 'Verification record not found');

  await query(`UPDATE shopper_profiles SET verification_status = $2 WHERE user_id = $1`, [
    record.shopper_id,
    input.status,
  ]);

  res.json({ success: true });
}

export async function listOrders(_req: Request, res: Response) {
  const rows = await query(
    `SELECT o.*, cu.full_name AS customer_name, su.full_name AS shopper_name
     FROM orders o
     JOIN users cu ON cu.id = o.customer_id
     JOIN users su ON su.id = o.shopper_id
     ORDER BY o.created_at DESC LIMIT 200`
  );
  res.json({ orders: rows });
}

export async function listRequests(_req: Request, res: Response) {
  const rows = await query(
    `SELECT r.*, u.full_name AS customer_name FROM shopping_requests r
     JOIN users u ON u.id = r.customer_id
     ORDER BY r.created_at DESC LIMIT 200`
  );
  res.json({ requests: rows });
}

const feeSchema = z.object({
  name: z.string().min(2).max(100),
  feeType: z.enum(['platform_percentage', 'flat_delivery', 'per_km_delivery']),
  value: z.number().nonnegative(),
});

export async function listFees(_req: Request, res: Response) {
  const rows = await query(`SELECT * FROM fees WHERE is_active = TRUE ORDER BY created_at DESC`);
  res.json({ fees: rows });
}

export async function createFee(req: Request, res: Response) {
  const input = feeSchema.parse(req.body);
  const row = await queryOne(
    `INSERT INTO fees (name, fee_type, value) VALUES ($1,$2,$3) RETURNING *`,
    [input.name, input.feeType, input.value]
  );
  res.status(201).json({ fee: row });
}
