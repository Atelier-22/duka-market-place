import { Pool, types } from 'pg';
import { env } from '../config/env';

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

  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle Postgres client', err);
});

export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  const result = await pool.query(text, params as any[]);
  return result.rows as T[];
}

export async function queryOne<T = any>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
