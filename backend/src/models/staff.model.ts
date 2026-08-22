import { pool, query, queryOne } from '../db/pool';

export type StaffRole = 'admin' | 'super_admin';

export interface StaffRow {
  id: string;
  role: StaffRole;
  full_name: string;
  email: string | null;
  phone: string;
  password_hash: string;
  avatar_url: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_by: string | null;
  last_login_at: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  created_at: string;
}

/**
 * How many of each kind may exist.
 *
 * Two super admins, because one is a single point of failure — lose that
 * password and nobody can ever create staff again — and three is no longer a
 * closed circle of trust.
 *
 * Twenty admins between them, not twenty each: the cap is on the platform, so
 * once twenty exist neither super admin can add a twenty-first. Freeing a slot
 * means removing someone.
 */
export const MAX_SUPER_ADMINS = 2;
export const MAX_ADMINS = 20;

/** The public shape — never the password hash. */
export function toPublicStaff(row: StaffRow) {
  return {
    id: row.id,
    role: row.role,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    avatarUrl: row.avatar_url,
    isActive: row.is_active,
    mustChangePassword: row.must_change_password,
    lastLoginAt: row.last_login_at,
    suspendedAt: row.suspended_at,
    suspendedReason: row.suspended_reason,
    createdAt: row.created_at,
  };
}

export async function findStaffById(id: string): Promise<StaffRow | null> {
  return queryOne<StaffRow>('SELECT * FROM staff WHERE id = $1', [id]);
}

/**
 * Normalised the same way user phones are, so "+256 779 276767" and
 * "0779276767" are not two different people.
 */
export async function findStaffByPhone(phone: string): Promise<StaffRow | null> {
  return queryOne<StaffRow>(
    `SELECT * FROM staff
      WHERE regexp_replace(phone, '[^0-9+]', '', 'g') = regexp_replace($1, '[^0-9+]', '', 'g')
      LIMIT 1`,
    [phone]
  );
}

export async function countStaff(role: StaffRole): Promise<number> {
  const row = await queryOne<{ n: number }>(
    'SELECT count(*)::int AS n FROM staff WHERE role = $1',
    [role]
  );
  return row?.n ?? 0;
}

export async function touchStaffLogin(id: string) {
  await query('UPDATE staff SET last_login_at = now() WHERE id = $1', [id]);
}

/**
 * Creates a staff account, refusing if the cap for that role is already met.
 *
 * The count and the insert run inside one transaction behind an advisory lock,
 * because checking then inserting is a race: two super admins pressing "create"
 * at the same moment would both read nineteen and both write, giving
 * twenty-one. The lock makes the pair atomic — which is the only way a limit
 * like this actually holds.
 */
export async function createStaffWithinCap(input: {
  role: StaffRole;
  fullName: string;
  email?: string | null;
  phone: string;
  passwordHash: string;
  createdBy: string;
}): Promise<{ staff: StaffRow } | { error: string }> {
  const cap = input.role === 'super_admin' ? MAX_SUPER_ADMINS : MAX_ADMINS;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    // One well-known key for all staff-cap work, so both roles serialise.
    await client.query('SELECT pg_advisory_xact_lock($1)', [572_001]);

    const existing = await client.query(
      'SELECT count(*)::int AS n FROM staff WHERE role = $1', [input.role]
    );
    if (existing.rows[0].n >= cap) {
      await client.query('ROLLBACK');
      return {
        error: input.role === 'super_admin'
          ? `There are already ${cap} super admins. Remove one before adding another.`
          : `All ${cap} admin places are taken. Remove an admin to free one.`,
      };
    }

    const clash = await client.query(
      `SELECT 1 FROM staff
        WHERE regexp_replace(phone, '[^0-9+]', '', 'g') = regexp_replace($1, '[^0-9+]', '', 'g')
           OR ($2::text IS NOT NULL AND lower(email) = lower($2))`,
      [input.phone, input.email ?? null]
    );
    if (clash.rowCount) {
      await client.query('ROLLBACK');
      return { error: 'A staff account already uses that phone number or email' };
    }

    const created = await client.query<StaffRow>(
      `INSERT INTO staff (role, full_name, email, phone, password_hash, created_by, must_change_password)
       VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING *`,
      [input.role, input.fullName, input.email ?? null, input.phone, input.passwordHash, input.createdBy]
    );
    await client.query('COMMIT');
    return { staff: created.rows[0] };
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Staff with their activity, for the super admin's overview.
 *
 * Super admins are excluded by default: an admin has no business knowing the
 * layer above them exists, which is the same reason customers and shoppers
 * cannot see staff at all.
 */
export async function listStaff(includeSuperAdmins: boolean) {
  return query(
    `SELECT s.id, s.role, s.full_name, s.email, s.phone, s.avatar_url, s.is_active,
            s.last_login_at, s.suspended_at, s.suspended_reason, s.created_at,
            maker.full_name AS created_by_name,
            (SELECT count(*)::int FROM admin_audit_log a WHERE a.admin_id = s.id) AS actions,
            (SELECT max(a.created_at) FROM admin_audit_log a WHERE a.admin_id = s.id) AS last_action_at
       FROM staff s
       LEFT JOIN staff maker ON maker.id = s.created_by
      WHERE ($1::boolean OR s.role <> 'super_admin')
      ORDER BY s.role DESC, s.created_at`,
    [includeSuperAdmins]
  );
}
