import { PoolClient } from 'pg';
import { pool } from '../db/pool';

export type Tx = PoolClient;

export async function withTransaction<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function txQuery<T = any>(tx: Tx, text: string, params?: unknown[]): Promise<T[]> {
  const result = await tx.query(text, params as any[]);
  return result.rows as T[];
}

export async function txOne<T = any>(tx: Tx, text: string, params?: unknown[]): Promise<T | null> {
  const rows = await txQuery<T>(tx, text, params);
  return rows[0] ?? null;
}
