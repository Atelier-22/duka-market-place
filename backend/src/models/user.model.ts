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

/** Strips formatting so "0700 000 000" and "0700-000-000" resolve to one account. */
export function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9+]/g, '');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

const PHONE_NORMALIZED = "regexp_replace(phone, '[^0-9+]', '', 'g')";

/**
 * A phone number is only unique per role now, so a lookup by phone alone can
 * return more than one row (one customer account, one shopper account).
 * Callers that need a single account must disambiguate — login does it by
 * checking which candidates the submitted password verifies against.
 */
export async function findUsersByPhone(phone: string): Promise<UserRow[]> {
  // Compare on the normalized form on both sides so rows written before
  // normalization (with spaces/dashes) still match.
  return query<UserRow>(
    `SELECT * FROM users WHERE ${PHONE_NORMALIZED} = $1 ORDER BY created_at`,
    [normalizePhone(phone)]
  );
}

export async function findUserByPhoneAndRole(phone: string, role: UserRole): Promise<UserRow | null> {
  return queryOne<UserRow>(
    `SELECT * FROM users WHERE ${PHONE_NORMALIZED} = $1 AND role = $2`,
    [normalizePhone(phone), role]
  );
}

export async function findUserByEmailAndRole(email: string, role: UserRole): Promise<UserRow | null> {
  return queryOne<UserRow>('SELECT * FROM users WHERE LOWER(email) = $1 AND role = $2', [
    normalizeEmail(email),
    role,
  ]);
}

/**
 * Other accounts that plausibly belong to the same person — same email, or the
 * same phone under a different role. Plausibly only: the caller must still
 * prove ownership with the password before treating one as linked.
 */
export async function findSiblingAccounts(user: UserRow): Promise<UserRow[]> {
  // A NULL email must never match another NULL email, or every account without
  // an email would be siblings with every other one.
  return query<UserRow>(
    `SELECT * FROM users
      WHERE id <> $1
        AND is_active
        AND (
          ${PHONE_NORMALIZED} = $2
          OR ($3::text IS NOT NULL AND LOWER(email) = $3)
        )
      ORDER BY role`,
    [user.id, normalizePhone(user.phone), user.email ? normalizeEmail(user.email) : null]
  );
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

export async function ensureCustomerProfile(userId: string): Promise<void> {
  await query(
    'INSERT INTO customer_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [userId]
  );
}

export async function ensureShopperProfile(userId: string): Promise<void> {
  await query(
    'INSERT INTO shopper_profiles (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING',
    [userId]
  );
}

export async function updateUserRole(userId: string, role: UserRole): Promise<UserRow> {
  const row = await queryOne<UserRow>(
    'UPDATE users SET role = $2 WHERE id = $1 RETURNING *',
    [userId, role]
  );
  if (!row) throw new Error('Failed to update user role');
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
