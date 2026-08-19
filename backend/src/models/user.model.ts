import { query, queryOne } from '../db/pool';
import { UserRole } from '../types';

export interface UserRow {
  id: string;
  role: UserRole;
  full_name: string;
  email: string | null;
  phone: string;
  password_hash: string;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
}

export async function findUserByPhone(phone: string): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE phone = $1', [phone]);
}

export async function findUserByEmail(email: string): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE email = $1', [email]);
} 

export async function findUserById(id: string): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE id = $1', [id]);
}

export async function createUser(input: {
  role: UserRole;
  fullName: string;
  email: string | null;
  phone: string;
  passwordHash: string;
}): Promise<UserRow> {
  const row = await queryOne<UserRow>(
    `INSERT INTO users (role, full_name, email, phone, password_hash)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [input.role, input.fullName, input.email, input.phone, input.passwordHash]
  );
  if (!row) throw new Error('Failed to create user');

  if (input.role === 'customer') {
    await query('INSERT INTO customer_profiles (user_id) VALUES ($1)', [row.id]);
  } else if (input.role === 'shopper') {
    await query('INSERT INTO shopper_profiles (user_id) VALUES ($1)', [row.id]);
  }

  return row;
}

export function toPublicUser(row: UserRow) {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
  };
}
