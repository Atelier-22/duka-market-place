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

const DELIVERED_ORDER_STATUSES = ['delivered', 'completed', 'disputed', 'refunded'];

interface AddressRow {
  id: string;
  user_id: string;
  label: string;
  line1: string;
  landmark: string | null;
  city: string;
  lat: string | null;
  lng: string | null;
  phone: string | null;
  is_default: boolean;
  deleted_at: string | null;
}

async function loadOwnAddress(id: string, userId: string): Promise<AddressRow> {
  const row = await queryOne<AddressRow>(
    'SELECT * FROM addresses WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [id, userId]
  );
  if (!row) throw new ApiError(404, 'Address not found');
  return row;
}

async function usageOf(addressId: string) {
  const row = await queryOne<{ total: string; delivered: string }>(
    `SELECT
       count(*)::text AS total,
       count(*) FILTER (WHERE o.status::text = ANY($2))::text AS delivered
     FROM orders o
     WHERE o.delivery_address_id = $1`,
    [addressId, DELIVERED_ORDER_STATUSES]
  );
  return {
    usedByAnyOrder: Number(row?.total ?? 0) > 0,
    usedByFinishedOrder: Number(row?.delivered ?? 0) > 0,
  };
}

export async function list(req: Request, res: Response) {
  const rows = await query(
    `SELECT * FROM addresses
      WHERE user_id = $1 AND deleted_at IS NULL
      ORDER BY is_default DESC, created_at DESC`,
    [req.user!.id]
  );
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

export async function update(req: Request, res: Response) {
  const input = addressSchema.parse(req.body);
  const existing = await loadOwnAddress(req.params.id, req.user!.id);
  const usage = await usageOf(existing.id);

  const shouldBeDefault = input.isDefault ?? existing.is_default;
  if (shouldBeDefault) {
    await query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user!.id]);
  }

  if (!usage.usedByFinishedOrder) {
    const row = await queryOne(
      `UPDATE addresses
          SET label = $3, line1 = $4, landmark = $5, city = $6, lat = $7, lng = $8,
              phone = $9, is_default = $10
        WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
        RETURNING *`,
      [
        existing.id, req.user!.id, input.label ?? existing.label, input.line1,
        input.landmark ?? null, input.city ?? existing.city,
        input.lat ?? null, input.lng ?? null, input.phone ?? null, shouldBeDefault,
      ]
    );
    return res.json({ address: row, replaced: false });
  }

  const replacement = await queryOne<{ id: string }>(
    `INSERT INTO addresses (user_id, label, line1, landmark, city, lat, lng, phone, is_default)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [
      req.user!.id, input.label ?? existing.label, input.line1, input.landmark ?? null,
      input.city ?? existing.city, input.lat ?? null, input.lng ?? null,
      input.phone ?? null, shouldBeDefault,
    ]
  );

  await query(
    'UPDATE addresses SET deleted_at = now(), is_default = FALSE, replaced_by = $2 WHERE id = $1',
    [existing.id, replacement!.id]
  );

  return res.json({ address: replacement, replaced: true });
}

export async function remove(req: Request, res: Response) {
  const existing = await loadOwnAddress(req.params.id, req.user!.id);
  await query(
    'UPDATE addresses SET deleted_at = now(), is_default = FALSE WHERE id = $1 AND user_id = $2',
    [existing.id, req.user!.id]
  );
  if (existing.is_default) {
    await query(
      `UPDATE addresses SET is_default = TRUE
        WHERE id = (
          SELECT id FROM addresses
           WHERE user_id = $1 AND deleted_at IS NULL
           ORDER BY created_at DESC LIMIT 1
        )`,
      [req.user!.id]
    );
  }

  res.json({ ok: true });
}

export async function makeDefault(req: Request, res: Response) {
  const existing = await loadOwnAddress(req.params.id, req.user!.id);
  await query('UPDATE addresses SET is_default = FALSE WHERE user_id = $1', [req.user!.id]);
  const row = await queryOne(
    'UPDATE addresses SET is_default = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
    [existing.id, req.user!.id]
  );
  res.json({ address: row });
}

const pinSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
});

export async function pin(req: Request, res: Response) {
  const input = pinSchema.parse(req.body);
  const row = await queryOne(
    `UPDATE addresses SET lat = $3, lng = $4
      WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL RETURNING *`,
    [req.params.id, req.user!.id, input.lat, input.lng]
  );

  if (!row) throw new ApiError(404, 'Address not found');
  res.json({ address: row });
}
