import { Request, Response } from 'express';
import { z } from 'zod';
import { mediaUrl } from '../utils/validators';
import { query, queryOne } from '../db/pool';
import { MAX_ACTIVE_JOBS, listActiveJobsForShopper } from '../models/order.model';
import { onlineExpr } from '../services/presence.service';
import { ApiError } from '../middleware/errorHandler';

export async function getDashboard(req: Request, res: Response) {
  const shopperId = req.user!.id;

  const profile = await queryOne(`SELECT * FROM shopper_profiles WHERE user_id = $1`, [shopperId]);
  const today = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount_ugx), 0) AS total FROM shopper_earnings
     WHERE shopper_id = $1 AND released_at::date = CURRENT_DATE`,
    [shopperId]
  );
  const week = await queryOne<{ total: string }>(
    `SELECT COALESCE(SUM(amount_ugx), 0) AS total FROM shopper_earnings
     WHERE shopper_id = $1 AND released_at >= date_trunc('week', now())`,
    [shopperId]
  );
  // Every job in flight, oldest first, each carrying the customer's name — a
  // shopper thinks in terms of who they are shopping for, not order ids.
  const activeOrders = await listActiveJobsForShopper(shopperId);

  const availableCount = await queryOne<{ count: string }>(
    `SELECT COUNT(*) AS count FROM shopping_requests WHERE status = 'open'`
  );

  res.json({
    profile,
    earnings: { today: Number(today?.total ?? 0), week: Number(week?.total ?? 0) },
    activeOrders,
    activeJobLimit: MAX_ACTIVE_JOBS,
    atCapacity: activeOrders.length >= MAX_ACTIVE_JOBS,
    availableJobsCount: Number(availableCount?.count ?? 0),
  });
}

export async function getEarnings(req: Request, res: Response) {
  const shopperId = req.user!.id;
  const rows = await query(
    `SELECT se.*, o.item_price_ugx, o.shopping_fee_ugx, o.delivery_fee_ugx
     FROM shopper_earnings se JOIN orders o ON o.id = se.order_id
     WHERE se.shopper_id = $1 ORDER BY se.created_at DESC`,
    [shopperId]
  );
  res.json({ earnings: rows });
}

const updateProfileSchema = z.object({
  bio: z.string().max(1000).optional(),
  operatingArea: z.string().max(150).optional(),
  operatingLat: z.number().optional(),
  operatingLng: z.number().optional(),
  operatingRadiusKm: z.number().positive().optional(),
  specialties: z.array(z.string()).optional(),
  isOnline: z.boolean().optional(),
});

export async function updateProfile(req: Request, res: Response) {
  const input = updateProfileSchema.parse(req.body);
  const row = await queryOne(
    `UPDATE shopper_profiles SET
       bio = COALESCE($2, bio),
       operating_area = COALESCE($3, operating_area),
       operating_lat = COALESCE($4, operating_lat),
       operating_lng = COALESCE($5, operating_lng),
       operating_radius_km = COALESCE($6, operating_radius_km),
       specialties = COALESCE($7, specialties),
       is_online = COALESCE($8, is_online)
     WHERE user_id = $1 RETURNING *`,
    [
      req.user!.id, input.bio, input.operatingArea, input.operatingLat, input.operatingLng,
      input.operatingRadiusKm, input.specialties, input.isOnline,
    ]
  );
  if (!row) throw new ApiError(404, 'Shopper profile not found');
  res.json({ profile: row });
}

const verificationSchema = z.object({
  documentType: z.string().min(2).max(50),
  documentUrl: mediaUrl,
});

export async function submitVerification(req: Request, res: Response) {
  const input = verificationSchema.parse(req.body);
  const record = await queryOne(
    `INSERT INTO verification_records (shopper_id, document_type, document_url) VALUES ($1,$2,$3) RETURNING *`,
    [req.user!.id, input.documentType, input.documentUrl]
  );
  await query(`UPDATE shopper_profiles SET verification_status = 'pending' WHERE user_id = $1`, [req.user!.id]);
  res.status(201).json({ record });
}

/**
 * What a customer may see about a shopper before trusting them with money.
 *
 * Columns are listed explicitly rather than selected with `sp.*`, which used to
 * ship available_balance_ugx and lifetime_earnings_ugx to anyone who asked —
 * a shopper's wallet balance and total income are nobody else's business.
 * Anything added to shopper_profiles later stays private until it is named here.
 */
export async function getPublicProfile(req: Request, res: Response) {
  const profile = await queryOne(
    `SELECT u.id, u.full_name, u.avatar_url, u.created_at AS joined_at,
            sp.bio, sp.operating_area, sp.specialties, sp.verification_status,
            sp.is_online, sp.rating_avg, sp.rating_count,
            sp.completed_jobs, sp.completion_rate,
            ${onlineExpr('u')} AS is_active_now
       FROM shopper_profiles sp
       JOIN users u ON u.id = sp.user_id
      WHERE sp.user_id = $1 AND u.is_active`,
    [req.params.id]
  );
  if (!profile) throw new ApiError(404, 'Shopper not found');

  // What other customers said, which is the part people actually read. The
  // rater's name is shown; nothing else about them is.
  const reviews = await query(
    `SELECT r.stars, r.created_at, rater.full_name AS rated_by_name, rater.avatar_url AS rated_by_avatar
       FROM ratings r
       JOIN users rater ON rater.id = r.rated_by
      WHERE r.rated_user = $1
      ORDER BY r.created_at DESC LIMIT 10`,
    [req.params.id]
  );

  res.json({ profile, reviews });
}
