import { Request, Response } from 'express';
import { query } from '../db/pool';

export async function list(req: Request, res: Response) {
  const city = typeof req.query.city === 'string' ? req.query.city : undefined;
  const rows = city
    ? await query('SELECT * FROM locations WHERE is_active = TRUE AND city = $1 ORDER BY name', [city])
    : await query('SELECT * FROM locations WHERE is_active = TRUE ORDER BY name');
  res.json({ locations: rows });
}
