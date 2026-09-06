import { Request, Response } from 'express';
import { query } from '../db/pool';

/**
 * Every place a shopper can be sent to, ordered by city and then by name.
 *
 * The ordering is done here rather than in each consumer because the list
 * stopped being five Kampala markets: it now spans the trading centres of most
 * of the country, and a picker that is not grouped by city is unusable on a
 * phone.
 *
 * `?city=` narrows to one city, `?q=` matches a name, city or description so
 * someone can type "Owino" or "Gulu" instead of scrolling.
 */
export async function list(req: Request, res: Response) {
  const city = typeof req.query.city === 'string' && req.query.city.trim()
    ? req.query.city.trim()
    : undefined;
  const q = typeof req.query.q === 'string' && req.query.q.trim()
    ? req.query.q.trim()
    : undefined;

  const conditions = ['is_active = TRUE'];
  const params: unknown[] = [];

  if (city) {
    params.push(city);
    conditions.push(`city = $${params.length}`);
  }
  if (q) {
    // One parameter, three columns. ILIKE rather than a text-search index:
    // the table is a few hundred rows and will stay that way.
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

/**
 * The distinct cities that have somewhere to shop, so a picker can offer them
 * without downloading every location first.
 */
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
