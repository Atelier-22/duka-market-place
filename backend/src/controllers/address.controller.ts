import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../middleware/errorHandler';

const addressSchema = z.object({
  label: z.string().max(50).optional(),
  line1: z.string().min(3).max(255),
  landmark: z.string().max(255).optional(),
  city: z.string().max(100).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  phone: z.string().max(30).optional(),
  isDefault: z.boolean().optional(),
});

export async function list(req: Request, res: Response) {
  const rows = await query('SELECT * FROM addresses WHERE user_id = $1 ORDER BY is_default DESC, created_at DESC', [req.user!.id]);
  res.json({ addresses: rows });
}

export async function create(req: Request, res: Response) {
  const input = addressSchema.parse(req.body);
  if (input.isDefault) {
    await query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user!.id]);
  }
  const row = await queryOne(
    `INSERT INTO addresses (user_id, label, line1, landmark, city, lat, lng, phone, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      req.user!.id, input.label ?? 'Home', input.line1, input.landmark ?? null,
      input.city ?? 'Kampala', input.lat ?? null, input.lng ?? null, input.phone ?? null,
      input.isDefault ?? false,
    ]
  );
  res.status(201).json({ address: row });
}

const pinSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

/**
 * Attach coordinates to an address that has none.
 *
 * Every address in this system was stored as typed text — "Mbalwa", "Ndejje" —
 * which is not somewhere a shopper can navigate to. Capturing coordinates when
 * the address is first created only helps new ones, and only if the customer
 * happened to allow the prompt at that moment. This lets them pin it whenever
 * they are actually standing there, which is when the answer is correct.
 */
export async function pin(req: Request, res: Response) {
  const input = pinSchema.parse(req.body);
  const row = await queryOne(
    `UPDATE addresses SET lat = $3, lng = $4 WHERE id = $1 AND user_id = $2 RETURNING *`,
    [req.params.id, req.user!.id, input.lat, input.lng]
  );
  // Scoped to the caller's own addresses: a missing row means it is not theirs,
  // and that is deliberately indistinguishable from it not existing.
  if (!row) throw new ApiError(404, 'Address not found');
  res.json({ address: row });
}
