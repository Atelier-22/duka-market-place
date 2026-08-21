import { randomBytes } from 'crypto';
import { Request, Response } from 'express';
import { z } from 'zod';
import { pool, query, queryOne } from '../db/pool';
import { hashPassword } from '../utils/auth';
import { findUserById } from '../models/user.model';
import { findOrderById, updateOrderStatus } from '../models/order.model';
import { assertValidTransition } from '../utils/orderStateMachine';
import { ApiError } from '../middleware/errorHandler';

/**
 * Operational powers for the admin console: moderation, money, announcements,
 * places and reporting.
 *
 * Everything that changes something writes to admin_audit_log first, naming the
 * admin who did it. That is not bookkeeping for its own sake — these actions
 * lock people out of their livelihood and move money, and "who did this and
 * why" has to be answerable afterwards without anyone's memory being involved.
 */

async function audit(
  req: Request,
  action: string,
  summary: string,
  target?: { type: string; id?: string | null },
  metadata?: unknown
) {
  const admin = await findUserById(req.user!.id);
  await query(
    `INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, summary, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [
      req.user!.id,
      admin?.full_name ?? 'Unknown admin',
      action,
      target?.type ?? null,
      target?.id ?? null,
      summary,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );
}

/** Loads a user or 404s, so every handler below reads the same way. */
async function targetUser(id: string) {
  const user = await findUserById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

// ---------------------------------------------------------------------------
// Moderation
// ---------------------------------------------------------------------------

const suspendSchema = z.object({ reason: z.string().min(3).max(500) });

export async function suspendUser(req: Request, res: Response) {
  const { reason } = suspendSchema.parse(req.body);
  const user = await targetUser(req.params.id);

  // Suspending yourself locks you out of the console you are standing in.
  if (user.id === req.user!.id) {
    throw new ApiError(409, 'You cannot suspend your own account');
  }
  if (!user.is_active) throw new ApiError(409, 'That account is already suspended');

  const updated = await queryOne(
    `UPDATE users SET is_active = FALSE, suspended_at = now(), suspended_reason = $2
      WHERE id = $1 RETURNING id, full_name, role, is_active, suspended_at, suspended_reason`,
    [user.id, reason]
  );

  // Tell them, and tell them why — a silent lockout is indistinguishable from
  // the app being broken.
  await query(
    `INSERT INTO notifications (user_id, channel, title, body)
     VALUES ($1,'in_app',$2,$3)`,
    [user.id, 'Your account has been suspended', reason]
  );

  await audit(req, 'user.suspend', `Suspended ${user.full_name} (${user.role})`,
    { type: 'user', id: user.id }, { reason });

  res.json({ user: updated });
}

export async function reactivateUser(req: Request, res: Response) {
  const user = await targetUser(req.params.id);
  if (user.is_active) throw new ApiError(409, 'That account is already active');

  const updated = await queryOne(
    `UPDATE users SET is_active = TRUE, suspended_at = NULL, suspended_reason = NULL
      WHERE id = $1 RETURNING id, full_name, role, is_active`,
    [user.id]
  );
  await query(
    `INSERT INTO notifications (user_id, channel, title, body)
     VALUES ($1,'in_app',$2,$3)`,
    [user.id, 'Your account has been reinstated', 'You can sign in and use Duka again.']
  );
  await audit(req, 'user.reactivate', `Reinstated ${user.full_name} (${user.role})`,
    { type: 'user', id: user.id });

  res.json({ user: updated });
}

/**
 * Issues a one-time password and returns it exactly once.
 *
 * Never emailed or stored in the clear: the admin reads it out to the person
 * over whatever channel they are already using, and the account is flagged so
 * the next sign-in has to replace it.
 */
export async function resetUserPassword(req: Request, res: Response) {
  const user = await targetUser(req.params.id);

  const temporary = `Duka-${randomBytes(4).toString('hex')}`;
  await query(
    'UPDATE users SET password_hash = $2, must_change_password = TRUE WHERE id = $1',
    [user.id, await hashPassword(temporary)]
  );
  await audit(req, 'user.reset_password', `Reset the password for ${user.full_name}`,
    { type: 'user', id: user.id });

  res.json({
    temporaryPassword: temporary,
    note: 'Shown once. Give it to them directly; they will be asked to change it.',
  });
}

const roleSchema = z.object({ role: z.enum(['customer', 'shopper', 'admin']) });

export async function changeUserRole(req: Request, res: Response) {
  const { role } = roleSchema.parse(req.body);
  const user = await targetUser(req.params.id);

  if (user.id === req.user!.id && role !== 'admin') {
    throw new ApiError(409, 'You cannot remove your own admin access');
  }
  if (user.role === 'admin' && role !== 'admin') {
    const others = await queryOne<{ n: number }>(
      "SELECT count(*)::int AS n FROM users WHERE role = 'admin' AND is_active AND id <> $1",
      [user.id]
    );
    // Removing the last admin leaves a console nobody can reach, and no way in
    // the product to make a new one.
    if ((others?.n ?? 0) === 0) {
      throw new ApiError(409, 'This is the only admin left — promote someone else first');
    }
  }
  if (user.role === role) throw new ApiError(409, `They are already a ${role}`);

  const updated = await queryOne(
    'UPDATE users SET role = $2 WHERE id = $1 RETURNING id, full_name, role',
    [user.id, role]
  );
  await audit(req, 'user.change_role', `Changed ${user.full_name} from ${user.role} to ${role}`,
    { type: 'user', id: user.id }, { from: user.role, to: role });

  res.json({ user: updated });
}

// ---------------------------------------------------------------------------
// Verification
// ---------------------------------------------------------------------------

const revokeSchema = z.object({ reason: z.string().min(3).max(500) });

export async function revokeVerification(req: Request, res: Response) {
  const { reason } = revokeSchema.parse(req.body);
  const user = await targetUser(req.params.id);
  if (user.role !== 'shopper') throw new ApiError(409, 'Only a shopper holds a verification');

  await query(
    "UPDATE shopper_profiles SET verification_status = 'rejected' WHERE user_id = $1",
    [user.id]
  );
  await query(
    `INSERT INTO notifications (user_id, channel, title, body)
     VALUES ($1,'in_app',$2,$3)`,
    [user.id, 'Your verification was withdrawn', reason]
  );
  await audit(req, 'shopper.revoke_verification', `Revoked verification for ${user.full_name}`,
    { type: 'user', id: user.id }, { reason });

  res.json({ ok: true });
}

// ---------------------------------------------------------------------------
// Disputes
// ---------------------------------------------------------------------------

/**
 * The outcomes the schema actually defines. A dispute is not "resolved" in the
 * abstract — it is resolved in someone's favour, split between them, or closed
 * with no action, and the record has to say which. `under_review` is here too
 * so a dispute can be parked while it is looked into rather than sitting in
 * the same state as one nobody has touched.
 */
const resolveSchema = z.object({
  outcome: z.enum(['under_review', 'resolved_customer', 'resolved_shopper', 'resolved_split', 'closed']),
  note: z.string().min(3).max(1000),
  /** Where the order itself should land — refunded, or completed anyway. */
  finalOrderStatus: z.enum(['refunded', 'completed', 'cancelled']).optional(),
});

const OUTCOME_WORDING: Record<string, string> = {
  under_review: 'Your dispute is being looked into',
  resolved_customer: "Dispute resolved in the customer's favour",
  resolved_shopper: "Dispute resolved in the shopper's favour",
  resolved_split: 'Dispute settled between both sides',
  closed: 'Dispute closed with no action',
};

export async function resolveDispute(req: Request, res: Response) {
  const { outcome, note, finalOrderStatus } = resolveSchema.parse(req.body);
  const dispute = await queryOne<{ id: string; order_id: string; raised_by: string; status: string }>(
    'SELECT id, order_id, raised_by, status FROM disputes WHERE id = $1',
    [req.params.id]
  );
  if (!dispute) throw new ApiError(404, 'Dispute not found');
  // Only an open or under-review dispute can move; a decided one stays decided.
  if (!['open', 'under_review'].includes(dispute.status)) {
    throw new ApiError(409, 'That dispute has already been decided');
  }

  const updated = await queryOne(
    `UPDATE disputes SET status = $2, resolution_note = $3, resolved_by = $4, resolved_at = now()
      WHERE id = $1 RETURNING *`,
    [dispute.id, outcome, note, req.user!.id]
  );

  // Deciding a dispute usually decides the order with it — refund the
  // customer, or let it stand as completed. Done through the state machine so
  // an impossible jump is refused here exactly as it would be anywhere else.
  if (finalOrderStatus) {
    const order = await findOrderById(dispute.order_id);
    if (order && order.status !== finalOrderStatus) {
      assertValidTransition(order.status, finalOrderStatus, 'admin');
      await updateOrderStatus(order.id, finalOrderStatus, req.user!.id, {
        note: `Dispute ${outcome.replace(/_/g, ' ')}: ${note}`,
      });
    }
  }

  // Both sides of the order hear the outcome, not only whoever raised it.
  const order = await queryOne<{ customer_id: string; shopper_id: string }>(
    'SELECT customer_id, shopper_id FROM orders WHERE id = $1',
    [dispute.order_id]
  );
  for (const uid of [order?.customer_id, order?.shopper_id].filter(Boolean) as string[]) {
    await query(
      `INSERT INTO notifications (user_id, channel, title, body, link)
       VALUES ($1,'in_app',$2,$3,$4)`,
      [uid, OUTCOME_WORDING[outcome], note, `/app/orders/${dispute.order_id}`]
    );
  }

  await audit(req, 'dispute.resolve', `Set dispute to ${outcome.replace(/_/g, ' ')}`,
    { type: 'dispute', id: dispute.id }, { outcome, note });

  res.json({ dispute: updated });
}

// ---------------------------------------------------------------------------
// Money
// ---------------------------------------------------------------------------

/** What each shopper is owed, and what they have already been paid. */
export async function listPayouts(_req: Request, res: Response) {
  const rows = await query(
    `SELECT u.id AS shopper_id, u.full_name, u.phone,
            COALESCE(sp.available_balance_ugx, 0)  AS balance_ugx,
            COALESCE(sp.lifetime_earnings_ugx, 0)  AS lifetime_ugx,
            COUNT(*) FILTER (WHERE se.status = 'available')::int AS owed_jobs,
            COALESCE(SUM(se.amount_ugx) FILTER (WHERE se.status = 'available'), 0)::bigint AS owed_ugx,
            COALESCE(SUM(se.amount_ugx) FILTER (WHERE se.status = 'paid_out'), 0)::bigint  AS paid_ugx,
            MAX(se.paid_out_at) AS last_paid_at
       FROM users u
       JOIN shopper_profiles sp ON sp.user_id = u.id
       LEFT JOIN shopper_earnings se ON se.shopper_id = u.id
      WHERE u.role = 'shopper'
      GROUP BY u.id, u.full_name, u.phone, sp.available_balance_ugx, sp.lifetime_earnings_ugx
      ORDER BY owed_ugx DESC, u.full_name`
  );
  res.json({ payouts: rows });
}

/**
 * Settles everything a shopper is currently owed.
 *
 * One transaction: the earnings rows, the running balance and the ledger entry
 * have to move together or not at all — a crash between them would either pay
 * someone twice or lose the record that they were paid.
 */
export async function payOutShopper(req: Request, res: Response) {
  const shopper = await targetUser(req.params.id);
  if (shopper.role !== 'shopper') throw new ApiError(409, 'That account is not a shopper');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const owed = await client.query(
      `SELECT COALESCE(SUM(amount_ugx), 0)::bigint AS total, count(*)::int AS n
         FROM shopper_earnings WHERE shopper_id = $1 AND status = 'available'`,
      [shopper.id]
    );
    const total = Number(owed.rows[0].total);
    const count = Number(owed.rows[0].n);
    if (total <= 0) {
      await client.query('ROLLBACK');
      throw new ApiError(409, 'Nothing is owed to this shopper right now');
    }

    await client.query(
      `UPDATE shopper_earnings SET status = 'paid_out', paid_out_at = now(), paid_out_by = $2
        WHERE shopper_id = $1 AND status = 'available'`,
      [shopper.id, req.user!.id]
    );
    await client.query(
      `UPDATE shopper_profiles
          SET available_balance_ugx = GREATEST(0, available_balance_ugx - $2)
        WHERE user_id = $1`,
      [shopper.id, total]
    );
    await client.query(
      `INSERT INTO transactions (user_id, type, amount_ugx, description)
       VALUES ($1,'shopper_payout',$2,$3)`,
      [shopper.id, -total, `Paid out ${count} job(s) by an admin`]
    );
    await client.query('COMMIT');

    await query(
      `INSERT INTO notifications (user_id, channel, title, body)
       VALUES ($1,'in_app',$2,$3)`,
      [shopper.id, 'You have been paid', `${new Intl.NumberFormat('en-UG').format(total)} UGX for ${count} job(s).`]
    );
    await audit(req, 'shopper.payout', `Paid ${shopper.full_name} ${total} UGX`,
      { type: 'user', id: shopper.id }, { amountUgx: total, jobs: count });

    res.json({ paidUgx: total, jobs: count });
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
  }
}

export async function listPayments(req: Request, res: Response) {
  const status = typeof req.query.status === 'string' ? req.query.status : null;
  const rows = await query(
    `SELECT p.*, u.full_name AS payer_name, u.phone AS payer_phone, r.title AS request_title
       FROM payments p
       JOIN users u ON u.id = p.payer_id
       LEFT JOIN orders o ON o.id = p.order_id
       LEFT JOIN shopping_requests r ON r.id = o.request_id
      WHERE ($1::text IS NULL OR p.status = $1::payment_status)
      ORDER BY p.created_at DESC LIMIT 200`,
    [status]
  );
  res.json({ payments: rows });
}

export async function settlePayment(req: Request, res: Response) {
  const payment = await queryOne<{ id: string; status: string; amount_ugx: number }>(
    'SELECT id, status, amount_ugx FROM payments WHERE id = $1',
    [req.params.id]
  );
  if (!payment) throw new ApiError(404, 'Payment not found');
  if (payment.status === 'paid') throw new ApiError(409, 'That payment is already settled');

  const updated = await queryOne(
    `UPDATE payments SET status = 'paid', paid_at = now(), provider = COALESCE(provider, 'manual'),
            updated_at = now()
      WHERE id = $1 RETURNING *`,
    [payment.id]
  );
  await audit(req, 'payment.settle', `Marked a payment of ${payment.amount_ugx} UGX settled`,
    { type: 'payment', id: payment.id });

  res.json({ payment: updated });
}

// ---------------------------------------------------------------------------
// Announcements
// ---------------------------------------------------------------------------

const broadcastSchema = z.object({
  audience: z.enum(['all', 'customers', 'shoppers']),
  title: z.string().min(3).max(120),
  body: z.string().max(500).optional(),
  link: z.string().max(200).optional(),
});

/**
 * One notification to a whole audience, as a single INSERT..SELECT.
 *
 * Suspended accounts are excluded — telling someone who cannot sign in about a
 * new feature is not a message, it is noise on a locked door. So is anyone who
 * turned marketing off.
 */
export async function broadcast(req: Request, res: Response) {
  const input = broadcastSchema.parse(req.body);
  const roles =
    input.audience === 'all' ? ['customer', 'shopper'] :
    input.audience === 'customers' ? ['customer'] : ['shopper'];

  const rows = await query<{ user_id: string }>(
    `INSERT INTO notifications (user_id, channel, title, body, link)
     SELECT u.id, 'in_app', $2, $3, $4
       FROM users u
       LEFT JOIN user_preferences p ON p.user_id = u.id
      WHERE u.role = ANY($1) AND u.is_active AND COALESCE(p.notify_marketing, FALSE)
     RETURNING user_id`,
    [roles, input.title, input.body ?? null, input.link ?? null]
  );

  await audit(req, 'broadcast', `Announced "${input.title}" to ${rows.length} ${input.audience}`,
    { type: 'broadcast' }, { audience: input.audience, reached: rows.length });

  res.json({ reached: rows.length, audience: input.audience });
}

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

export async function listLocations(_req: Request, res: Response) {
  const rows = await query(
    `SELECT l.*, (SELECT count(*)::int FROM shopping_requests r WHERE r.location_id = l.id) AS request_count
       FROM locations l ORDER BY l.is_active DESC, l.city, l.name`
  );
  res.json({ locations: rows });
}

const locationSchema = z.object({
  name: z.string().min(2).max(150),
  type: z.enum(['market', 'mall', 'shop', 'supermarket']).default('market'),
  city: z.string().min(2).max(100).default('Kampala'),
  description: z.string().max(500).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export async function createLocation(req: Request, res: Response) {
  const input = locationSchema.parse(req.body);
  const row = await queryOne(
    `INSERT INTO locations (name, type, city, description, lat, lng)
     VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
    [input.name, input.type, input.city, input.description ?? null, input.lat ?? null, input.lng ?? null]
  );
  await audit(req, 'location.create', `Added ${input.name} (${input.city})`,
    { type: 'location', id: (row as { id: string }).id });
  res.status(201).json({ location: row });
}

export async function toggleLocation(req: Request, res: Response) {
  const row = await queryOne<{ id: string; name: string; is_active: boolean }>(
    'UPDATE locations SET is_active = NOT is_active WHERE id = $1 RETURNING id, name, is_active',
    [req.params.id]
  );
  if (!row) throw new ApiError(404, 'Location not found');
  await audit(req, 'location.toggle', `${row.is_active ? 'Enabled' : 'Hid'} ${row.name}`,
    { type: 'location', id: row.id });
  res.json({ location: row });
}

// ---------------------------------------------------------------------------
// Reporting
// ---------------------------------------------------------------------------

/**
 * The numbers an operator actually runs the business on, over a window.
 *
 * generate_series so days with no orders come back as zero rather than being
 * missing — a gap in a chart reads as "no data", which is a different claim
 * from "nothing happened".
 */
export async function analytics(req: Request, res: Response) {
  const days = Math.min(180, Math.max(7, Number(req.query.days) || 30));

  const daily = await query(
    `SELECT d::date AS day,
            COUNT(o.id)::int AS orders,
            COUNT(o.id) FILTER (WHERE o.status = 'completed')::int AS completed,
            COUNT(o.id) FILTER (WHERE o.status = 'cancelled')::int AS cancelled,
            COALESCE(SUM(o.total_amount_ugx) FILTER (WHERE o.status = 'completed'), 0)::bigint AS gmv_ugx,
            COALESCE(SUM(o.platform_fee_ugx) FILTER (WHERE o.status = 'completed'), 0)::bigint AS revenue_ugx
       FROM generate_series(now()::date - ($1::int - 1), now()::date, '1 day') d
       LEFT JOIN orders o ON o.created_at::date = d::date
      GROUP BY d ORDER BY d`,
    [days]
  );

  const totals = await queryOne(
    `SELECT
       (SELECT count(*)::int FROM users WHERE role = 'customer')                        AS customers,
       (SELECT count(*)::int FROM users WHERE role = 'shopper')                         AS shoppers,
       (SELECT count(*)::int FROM users WHERE NOT is_active)                            AS suspended,
       (SELECT count(*)::int FROM orders)                                               AS orders,
       (SELECT count(*)::int FROM orders WHERE status = 'completed')                    AS completed,
       (SELECT count(*)::int FROM orders WHERE status = 'cancelled')                    AS cancelled,
       (SELECT count(*)::int FROM disputes WHERE status = 'open')                       AS open_disputes,
       (SELECT COALESCE(SUM(total_amount_ugx),0)::bigint FROM orders WHERE status='completed')  AS gmv_ugx,
       (SELECT COALESCE(SUM(platform_fee_ugx),0)::bigint FROM orders WHERE status='completed')  AS revenue_ugx,
       (SELECT COALESCE(SUM(amount_ugx),0)::bigint FROM shopper_earnings WHERE status='available') AS owed_ugx`
  );

  const topShoppers = await query(
    `SELECT u.id, u.full_name, sp.rating_avg, sp.completed_jobs,
            COALESCE(SUM(o.total_amount_ugx) FILTER (WHERE o.status = 'completed'), 0)::bigint AS gmv_ugx
       FROM users u
       JOIN shopper_profiles sp ON sp.user_id = u.id
       LEFT JOIN orders o ON o.shopper_id = u.id
      WHERE u.role = 'shopper'
      GROUP BY u.id, u.full_name, sp.rating_avg, sp.completed_jobs
      ORDER BY gmv_ugx DESC, sp.completed_jobs DESC LIMIT 10`
  );

  res.json({ days, daily, totals, topShoppers });
}

export async function auditLog(req: Request, res: Response) {
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 100));
  const rows = await query(
    'SELECT * FROM admin_audit_log ORDER BY created_at DESC LIMIT $1',
    [limit]
  );
  res.json({ entries: rows });
}
