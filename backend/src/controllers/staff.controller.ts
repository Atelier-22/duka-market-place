import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { hashPassword } from '../utils/auth';
import {
  MAX_ADMINS, MAX_SUPER_ADMINS, countStaff, createStaffWithinCap,
  findStaffById, listStaff, toPublicStaff,
} from '../models/staff.model';
import { ApiError } from '../middleware/errorHandler';

async function audit(
  req: Request,
  action: string,
  summary: string,
  targetId?: string | null,
  metadata?: unknown
) {
  const me = await findStaffById(req.user!.id);
  await query(
    `INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, summary, metadata)
     VALUES ($1,$2,$3,'staff',$4,$5,$6)`,
    [
      req.user!.id,
      me?.full_name ?? 'Unknown super admin',
      action,
      targetId ?? null,
      summary,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

export async function listStaffAccounts(req: Request, res: Response) {
  const [admins, superAdmins, rows] = await Promise.all([
    countStaff('admin'),
    countStaff('super_admin'),
    listStaff(true),
  ]);

  res.json({
    staff: rows,
    capacity: {
      admins: { used: admins, limit: MAX_ADMINS, remaining: Math.max(0, MAX_ADMINS - admins) },
      superAdmins: {
        used: superAdmins,
        limit: MAX_SUPER_ADMINS,
        remaining: Math.max(0, MAX_SUPER_ADMINS - superAdmins),
      },
    },
    me: req.user!.id,
  });
}

const createSchema = z.object({
  role: z.enum(['admin', 'super_admin']).default('admin'),
  fullName: z.string().min(2).max(150),
  email: z.string().email().optional(),
  phone: z.string().min(9).max(30),
});

export async function createStaffAccount(req: Request, res: Response) {
  const input = createSchema.parse(req.body);

  const temporary = `Duka-${randomBytes(4).toString('hex')}`;
  const result = await createStaffWithinCap({
    role: input.role,
    fullName: input.fullName,
    email: input.email ?? null,
    phone: input.phone,
    passwordHash: await hashPassword(temporary),
    createdBy: req.user!.id,
  });

  if ('error' in result) throw new ApiError(409, result.error);

  await audit(req, 'staff.create', `Created ${input.role.replace('_', ' ')} ${input.fullName}`,
    result.staff.id, { role: input.role });

  res.status(201).json({
    staff: toPublicStaff(result.staff),
    temporaryPassword: temporary,
    note: 'Shown once. Give it to them directly; they must change it on first sign-in.',
  });
}

const suspendSchema = z.object({ reason: z.string().min(3).max(500) });

export async function suspendStaff(req: Request, res: Response) {
  const { reason } = suspendSchema.parse(req.body);
  const target = await findStaffById(req.params.id);
  if (!target) throw new ApiError(404, 'Staff account not found');
  if (target.id === req.user!.id) throw new ApiError(409, 'You cannot suspend your own account');

  if (target.role === 'super_admin') {
    const others = await queryOne<{ n: number }>(
      "SELECT count(*)::int AS n FROM staff WHERE role = 'super_admin' AND is_active AND id <> $1",
      [target.id]
    );
    if ((others?.n ?? 0) === 0) {
      throw new ApiError(409, 'That is the only active super admin — there would be nobody left to create staff');
    }
  }

  const updated = await queryOne(
    `UPDATE staff SET is_active = FALSE, suspended_at = now(), suspended_reason = $2, updated_at = now()
      WHERE id = $1 RETURNING *`,
    [target.id, reason]
  );
  await audit(req, 'staff.suspend', `Suspended ${target.role.replace('_', ' ')} ${target.full_name}`,
    target.id, { reason });

  res.json({ staff: toPublicStaff(updated as never) });
}

export async function reactivateStaff(req: Request, res: Response) {
  const target = await findStaffById(req.params.id);
  if (!target) throw new ApiError(404, 'Staff account not found');
  if (target.is_active) throw new ApiError(409, 'That account is already active');

  const updated = await queryOne(
    `UPDATE staff SET is_active = TRUE, suspended_at = NULL, suspended_reason = NULL, updated_at = now()
      WHERE id = $1 RETURNING *`,
    [target.id]
  );
  await audit(req, 'staff.reactivate', `Reinstated ${target.full_name}`, target.id);
  res.json({ staff: toPublicStaff(updated as never) });
}

export async function resetStaffPassword(req: Request, res: Response) {
  const target = await findStaffById(req.params.id);
  if (!target) throw new ApiError(404, 'Staff account not found');

  const temporary = `Duka-${randomBytes(4).toString('hex')}`;
  await query(
    'UPDATE staff SET password_hash = $2, must_change_password = TRUE, updated_at = now() WHERE id = $1',
    [target.id, await hashPassword(temporary)]
  );
  await audit(req, 'staff.reset_password', `Reset the password for ${target.full_name}`, target.id);

  res.json({ temporaryPassword: temporary });
}

export async function removeStaff(req: Request, res: Response) {
  const target = await findStaffById(req.params.id);
  if (!target) throw new ApiError(404, 'Staff account not found');
  if (target.id === req.user!.id) throw new ApiError(409, 'You cannot remove your own account');

  if (target.role === 'super_admin') {
    const others = await queryOne<{ n: number }>(
      "SELECT count(*)::int AS n FROM staff WHERE role = 'super_admin' AND id <> $1",
      [target.id]
    );
    if ((others?.n ?? 0) === 0) {
      throw new ApiError(409, 'That is the last super admin — removing them would leave nobody who can create staff');
    }
  }

  await query('DELETE FROM staff WHERE id = $1', [target.id]);
  await audit(req, 'staff.remove', `Removed ${target.role.replace('_', ' ')} ${target.full_name}`,
    target.id, { role: target.role });

  res.json({ ok: true });
}

export async function godView(_req: Request, res: Response) {
  const platform = await queryOne(
    `SELECT
       (SELECT count(*)::int FROM users WHERE role = 'customer')                          AS customers,
       (SELECT count(*)::int FROM users WHERE role = 'shopper')                           AS shoppers,
       (SELECT count(*)::int FROM users WHERE NOT is_active)                              AS suspended_users,
       (SELECT count(*)::int FROM orders)                                                 AS orders,
       (SELECT count(*)::int FROM orders
         WHERE status NOT IN ('completed','cancelled','refunded'))                        AS orders_in_flight,
       (SELECT count(*)::int FROM disputes WHERE status = 'open')                         AS open_disputes,
       (SELECT count(*)::int FROM verification_records WHERE status = 'pending')          AS pending_verifications,
       (SELECT COALESCE(SUM(total_amount_ugx),0)::bigint FROM orders WHERE status='completed') AS gmv_ugx,
       (SELECT COALESCE(SUM(platform_fee_ugx),0)::bigint FROM orders WHERE status='completed') AS revenue_ugx,
       (SELECT COALESCE(SUM(amount_ugx),0)::bigint FROM shopper_earnings WHERE status='available') AS owed_ugx`
  );

  const staffActivity = await query(
    `SELECT a.id, a.admin_id, a.admin_name, a.action, a.summary, a.target_type, a.target_id, a.created_at,
            s.role AS admin_role
       FROM admin_audit_log a
       LEFT JOIN staff s ON s.id = a.admin_id
      ORDER BY a.created_at DESC LIMIT 60`
  );

  const [admins, superAdmins] = await Promise.all([countStaff('admin'), countStaff('super_admin')]);

  res.json({
    platform,
    staffActivity,
    capacity: {
      admins: { used: admins, limit: MAX_ADMINS },
      superAdmins: { used: superAdmins, limit: MAX_SUPER_ADMINS },
    },
  });
}
