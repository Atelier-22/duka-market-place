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
  idleTimeoutMillis: 60_000,
  connectionTimeoutMillis: 45_000,
  keepAlive: true,
});

const CONNECTION_LOST = /terminated unexpectedly|ECONNRESET|EPIPE|terminating connection|Connection ended|socket hang up/i;

function readOnly(text: string): boolean {
  return /^\s*(select|with)\b/i.test(text);
}

pool.on('error', (err) => {

  // eslint-disable-next-line no-console
  console.error('Unexpected error on idle Postgres client', err);
});

export async function query<T = any>(text: string, params?: unknown[]): Promise<T[]> {
  try {
    const result = await pool.query(text, params as any[]);
    return result.rows as T[];
  } catch (err) {
    if (readOnly(text) && CONNECTION_LOST.test(String((err as Error).message))) {
      const result = await pool.query(text, params as any[]);
      return result.rows as T[];
    }
    throw err;
  }
}

export async function queryOne<T = any>(text: string, params?: unknown[]): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}
