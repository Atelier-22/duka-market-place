import { Request, Response } from 'express';
import { query } from '../db/pool';

export async function list(req: Request, res: Response) {
  const city = typeof req.query.city === 'string' && req.query.city.trim()
    ? req.query.city.trim().slice(0, 80)
    : undefined;
  const q = typeof req.query.q === 'string' && req.query.q.trim()
    ? req.query.q.trim().slice(0, 80)
    : undefined;

  const conditions = ['is_active = TRUE'];
  const params: unknown[] = [];

  if (city) {
    params.push(city);
    conditions.push(`city = $${params.length}`);
  }
  if (q) {

    params.push(`%${q}%`);
    conditions.push(
      `(name ILIKE $${params.length} OR city ILIKE $${params.length} OR description ILIKE $${params.length})`
    );
  }

  const locations = await query(
    `SELECT * FROM locations
      WHERE ${conditions.join(' AND ')}
      ORDER BY city, name`,
    params
  );

  res.json({ locations });
}

export async function cities(_req: Request, res: Response) {
  const rows = await query<{ city: string; count: number }>(
    `SELECT city, count(*)::int AS count
       FROM locations
      WHERE is_active = TRUE
      GROUP BY city
      ORDER BY city`
  );
  res.json({ cities: rows });
}
