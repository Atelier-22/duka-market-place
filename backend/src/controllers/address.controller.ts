import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';

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
