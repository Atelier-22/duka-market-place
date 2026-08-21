import { Pool, types } from 'pg';
import { env } from '../config/env';

/**
 * Parse BIGINT (oid 20) as a JavaScript number.
 *
 * By default `pg` hands back int8 columns as STRINGS, because a 64-bit integer
 * can exceed Number.MAX_SAFE_INTEGER. Every money column in this schema is
 * BIGINT, so without this every price arrives as a string and `a + b` silently
 * concatenates instead of adding: an order of 100000 + 5000 + 5000 + 500 was
 * being stored and shown to the customer as 10,000,050,005,000,500 UGX.
 *
 * UGX amounts are safely inside the float53 range (9,007,199,254,740,991 —
 * about nine quadrillion shillings), so the precision concern does not apply
 * here. The guard below still refuses to silently round anything that somehow
 * exceeds it, rather than corrupting a figure people are paid from.
 */
types.setTypeParser(types.builtins.INT8, (value: string) => {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new Error(`BIGINT ${value} exceeds the safe integer range and cannot be used as a number`);
  }
  return parsed;
});

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

pool.on('error', (err) => {
  // A background/idle client failed — log and let the process supervisor
  // (pm2/docker/systemd) decide whether to restart. Never crash silently.
  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle Postgres client', err);
});

/**
 * Thin query helper. All model files go through this rather than importing
 * `pool` directly, so query logging/tracing can be added in one place later.
 */
export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params as any[]);
  return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
