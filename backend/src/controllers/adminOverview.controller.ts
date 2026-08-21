import { Request, Response } from 'express';
import { z } from 'zod';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../middleware/errorHandler';

/**
 * The admin control centre: a single view of everything moving on the platform.
 *
 * Every handler here is mounted behind requireAuth + requireRole('admin') in
 * admin.routes.ts. Nothing in this file is reachable by a customer or shopper.
 */

const feedSchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
});

/**
 * Unified reverse-chronological feed across the whole platform.
 *
 * One round trip: the branches are UNION ALLed and sorted in the database, so
 * adding an event type costs a branch rather than another query per row. Each
 * branch produces the same shape — type, summary, actor, subject, timestamp —
 * so the frontend renders them uniformly.
 */
export async function getActivity(req: Request, res: Response) {
  const { limit } = feedSchema.parse(req.query);

  const rows = await query(
    `
    SELECT * FROM (
      -- New accounts
      SELECT
        'user_registered'                   AS type,
        u.created_at                        AS at,
        u.id                                AS actor_id,
        u.full_name                         AS actor_name,
        u.role::text                        AS actor_role,
        NULL::uuid                          AS order_id,
        u.id                                AS subject_id,
        u.full_name || ' signed up as a ' || u.role::text AS summary
      FROM users u

      UNION ALL

      -- Shopping requests posted
      SELECT
        'request_created',
        r.created_at,
        r.customer_id,
        cu.full_name,
        'customer',
        NULL::uuid,
        r.id,
        cu.full_name || ' requested "' || r.title || '"'
      FROM shopping_requests r
      JOIN users cu ON cu.id = r.customer_id

      UNION ALL

      -- Offers made by shoppers
      SELECT
        'offer_created',
        o.created_at,
        o.shopper_id,
        su.full_name,
        'shopper',
        NULL::uuid,
        o.request_id,
        su.full_name || ' offered to shop for "' || COALESCE(r.title, 'a request') || '"'
      FROM shopper_offers o
      JOIN users su ON su.id = o.shopper_id
      LEFT JOIN shopping_requests r ON r.id = o.request_id

      UNION ALL

      -- Every order status transition
      SELECT
        'order_status',
        h.created_at,
        h.changed_by,
        COALESCE(cb.full_name, 'System'),
        COALESCE(cb.role::text, 'system'),
        h.order_id,
        h.order_id,
        'Order #' || LEFT(h.order_id::text, 8) || ' moved to ' || REPLACE(h.to_status::text, '_', ' ')
      FROM order_status_history h
      LEFT JOIN users cb ON cb.id = h.changed_by

      UNION ALL

      -- Disputes raised
      SELECT
        'dispute_opened',
        d.created_at,
        d.raised_by,
        COALESCE(rb.full_name, 'Unknown'),
        COALESCE(rb.role::text, 'customer'),
        d.order_id,
        d.id,
        COALESCE(rb.full_name, 'Someone') || ' opened a dispute on order #' || LEFT(d.order_id::text, 8)
      FROM disputes d
      LEFT JOIN users rb ON rb.id = d.raised_by

      UNION ALL

      -- Ratings left
      SELECT
        'rating_left',
        rt.created_at,
        rt.rated_by,
        COALESCE(rby.full_name, 'Someone'),
        COALESCE(rby.role::text, 'customer'),
        rt.order_id,
        rt.id,
        COALESCE(rby.full_name, 'Someone') || ' rated ' || COALESCE(rus.full_name, 'a user')
          || ' ' || rt.stars || '/5'
      FROM ratings rt
      LEFT JOIN users rby ON rby.id = rt.rated_by
      LEFT JOIN users rus ON rus.id = rt.rated_user

      UNION ALL

      -- Verification documents submitted
      SELECT
        'verification_submitted',
        v.created_at,
        v.shopper_id,
        COALESCE(sv.full_name, 'A shopper'),
        'shopper',
        NULL::uuid,
        v.id,
        COALESCE(sv.full_name, 'A shopper') || ' submitted a ' || REPLACE(v.document_type, '_', ' ')
      FROM verification_records v
      LEFT JOIN users sv ON sv.id = v.shopper_id
    ) feed
    ORDER BY at DESC
    LIMIT $1
    `,
    [limit]
  );

  res.json({ activity: rows });
}

/**
 * "What is in motion right now" — online shoppers and every order that has not
 * reached a terminal state, broken down by status.
 */
export async function getPresence(_req: Request, res: Response) {
  const [shoppers, byStatus, recentlyActive] = await Promise.all([
    queryOne<{ online: string; total: string }>(
      `SELECT
         COUNT(*) FILTER (WHERE is_online) AS online,
         COUNT(*)                          AS total
       FROM shopper_profiles`
    ),
    query<{ status: string; count: string }>(
      `SELECT status::text AS status, COUNT(*) AS count
         FROM orders
        WHERE status NOT IN ('completed','cancelled','refunded')
        GROUP BY status
        ORDER BY count DESC`
    ),
    queryOne<{ n: string }>(
      // A rough "is anything happening" pulse over the last 15 minutes.
      `SELECT COUNT(*) AS n FROM order_status_history WHERE created_at > now() - interval '15 minutes'`
    ),
  ]);

  const inFlight = byStatus.reduce((sum, r) => sum + Number(r.count), 0);

  res.json({
    shoppersOnline: Number(shoppers?.online ?? 0),
    shoppersTotal: Number(shoppers?.total ?? 0),
    ordersInFlight: inFlight,
    ordersByStatus: byStatus.map((r) => ({ status: r.status, count: Number(r.count) })),
    transitionsLast15Min: Number(recentlyActive?.n ?? 0),
  });
}

const searchSchema = z.object({ q: z.string().trim().min(1).max(100) });

/**
 * One box for "find me the thing this complaint is about" — matches users by
 * name, phone or email, and orders by the short id shown in the UI.
 */
export async function search(req: Request, res: Response) {
  const { q } = searchSchema.parse(req.query);
  const like = `%${q.toLowerCase()}%`;
  const digits = q.replace(/[^0-9+]/g, '');

  const [users, orders] = await Promise.all([
    query(
      `SELECT id, full_name, phone, email, role::text AS role, avatar_url, is_active, created_at
         FROM users
        WHERE LOWER(full_name) LIKE $1
           OR LOWER(COALESCE(email, '')) LIKE $1
           OR ($2 <> '' AND regexp_replace(phone, '[^0-9+]', '', 'g') LIKE '%' || $2 || '%')
        ORDER BY created_at DESC
        LIMIT 20`,
      [like, digits]
    ),
    query(
      `SELECT o.id, o.status::text AS status, o.total_amount_ugx, o.created_at,
              cu.full_name AS customer_name, su.full_name AS shopper_name, r.title AS request_title
         FROM orders o
         LEFT JOIN users cu ON cu.id = o.customer_id
         LEFT JOIN users su ON su.id = o.shopper_id
         LEFT JOIN shopping_requests r ON r.id = o.request_id
        WHERE o.id::text LIKE $1
           OR LOWER(COALESCE(r.title, '')) LIKE $2
        ORDER BY o.created_at DESC
        LIMIT 20`,
      [`${q.toLowerCase()}%`, like]
    ),
  ]);

  res.json({ users, orders });
}

/** Full picture of one customer: profile, requests, orders, spend, disputes. */
export async function getCustomerDetail(req: Request, res: Response) {
  const { id } = req.params;

  const user = await queryOne(
    `SELECT u.id, u.full_name, u.phone, u.email, u.avatar_url, u.is_active, u.created_at,
            u.role::text AS role, cp.total_orders, cp.total_spent_ugx
       FROM users u
       LEFT JOIN customer_profiles cp ON cp.user_id = u.id
      WHERE u.id = $1`,
    [id]
  );
  if (!user) throw new ApiError(404, 'Customer not found');

  const [requests, orders, disputes, addresses, totals] = await Promise.all([
    query(
      `SELECT id, title, status::text AS status, budget_max_ugx, created_at
         FROM shopping_requests WHERE customer_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [id]
    ),
    query(
      `SELECT o.id, o.status::text AS status, o.total_amount_ugx, o.created_at,
              su.full_name AS shopper_name, r.title AS request_title
         FROM orders o
         LEFT JOIN users su ON su.id = o.shopper_id
         LEFT JOIN shopping_requests r ON r.id = o.request_id
        WHERE o.customer_id = $1 ORDER BY o.created_at DESC LIMIT 100`,
      [id]
    ),
    query(
      `SELECT d.id, d.order_id, d.status::text AS status, d.reason, d.created_at
         FROM disputes d WHERE d.raised_by = $1 ORDER BY d.created_at DESC`,
      [id]
    ),
    query('SELECT id, label, line1, city, is_default FROM addresses WHERE user_id = $1', [id]),
    queryOne<{ spent: string; completed: string }>(
      `SELECT COALESCE(SUM(total_amount_ugx) FILTER (WHERE status = 'completed'), 0) AS spent,
              COUNT(*) FILTER (WHERE status = 'completed') AS completed
         FROM orders WHERE customer_id = $1`,
      [id]
    ),
  ]);

  res.json({
    user,
    requests,
    orders,
    disputes,
    addresses,
    totals: {
      lifetimeSpentUgx: Number(totals?.spent ?? 0),
      completedOrders: Number(totals?.completed ?? 0),
    },
  });
}

/** Full picture of one shopper: profile, verification, jobs, earnings, ratings. */
export async function getShopperDetail(req: Request, res: Response) {
  const { id } = req.params;

  const user = await queryOne(
    `SELECT u.id, u.full_name, u.phone, u.email, u.avatar_url, u.is_active, u.created_at,
            u.role::text AS role,
            sp.bio, sp.operating_area, sp.verification_status::text AS verification_status,
            sp.is_online, sp.rating_avg, sp.rating_count, sp.completed_jobs, sp.cancelled_jobs,
            sp.completion_rate, sp.available_balance_ugx, sp.lifetime_earnings_ugx
       FROM users u
       LEFT JOIN shopper_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1`,
    [id]
  );
  if (!user) throw new ApiError(404, 'Shopper not found');

  const [verifications, orders, earnings, ratings, offers] = await Promise.all([
    query(
      `SELECT id, document_type, document_url, status::text AS status, rejection_reason, created_at, reviewed_at
         FROM verification_records WHERE shopper_id = $1 ORDER BY created_at DESC`,
      [id]
    ),
    query(
      `SELECT o.id, o.status::text AS status, o.total_amount_ugx, o.created_at,
              cu.full_name AS customer_name, r.title AS request_title
         FROM orders o
         LEFT JOIN users cu ON cu.id = o.customer_id
         LEFT JOIN shopping_requests r ON r.id = o.request_id
        WHERE o.shopper_id = $1 ORDER BY o.created_at DESC LIMIT 100`,
      [id]
    ),
    query(
      `SELECT id, order_id, amount_ugx, status, created_at
         FROM shopper_earnings WHERE shopper_id = $1 ORDER BY created_at DESC LIMIT 100`,
      [id]
    ).catch(() => []),
    query(
      `SELECT rt.id, rt.stars, rt.created_at, rt.order_id, rby.full_name AS rated_by_name
         FROM ratings rt
         LEFT JOIN users rby ON rby.id = rt.rated_by
        WHERE rt.rated_user = $1 ORDER BY rt.created_at DESC LIMIT 100`,
      [id]
    ),
    query(
      `SELECT id, request_id, status::text AS status, shopping_fee_ugx, created_at
         FROM shopper_offers WHERE shopper_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [id]
    ),
  ]);

  res.json({ user, verifications, orders, earnings, ratings, offers });
}

/** Everything about one order: parties, timeline, evidence, receipts, messages. */
export async function getOrderDetail(req: Request, res: Response) {
  const { id } = req.params;

  const order = await queryOne(
    `SELECT o.*, o.status::text AS status,
            cu.full_name AS customer_name, cu.phone AS customer_phone, cu.id AS customer_id,
            su.full_name AS shopper_name, su.phone AS shopper_phone, su.id AS shopper_id,
            r.title AS request_title, r.description AS request_description,
            a.line1 AS delivery_line1, a.city AS delivery_city
       FROM orders o
       LEFT JOIN users cu ON cu.id = o.customer_id
       LEFT JOIN users su ON su.id = o.shopper_id
       LEFT JOIN shopping_requests r ON r.id = o.request_id
       LEFT JOIN addresses a ON a.id = o.delivery_address_id
      WHERE o.id = $1`,
    [id]
  );
  if (!order) throw new ApiError(404, 'Order not found');

  const [history, items, evidence, receipts, messages, disputes, payments] = await Promise.all([
    query(
      `SELECT h.*, h.to_status::text AS to_status, h.from_status::text AS from_status,
              u.full_name AS changed_by_name
         FROM order_status_history h
         LEFT JOIN users u ON u.id = h.changed_by
        WHERE h.order_id = $1 ORDER BY h.created_at ASC`,
      [id]
    ),
    query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [id]),
    query(
      `SELECT e.id, e.type::text AS type, e.file_url, e.caption, e.created_at,
              u.full_name AS uploaded_by_name
         FROM evidence e LEFT JOIN users u ON u.id = e.uploaded_by
        WHERE e.order_id = $1 ORDER BY e.created_at ASC`,
      [id]
    ),
    query('SELECT * FROM receipts WHERE order_id = $1 ORDER BY created_at', [id]),
    query(
      `SELECT m.id, m.body, m.attachment_url, m.created_at, m.read_at,
              u.full_name AS sender_name, u.role::text AS sender_role, m.sender_id
         FROM messages m JOIN users u ON u.id = m.sender_id
        WHERE m.order_id = $1 ORDER BY m.created_at ASC`,
      [id]
    ),
    query(
      `SELECT d.*, d.status::text AS status FROM disputes d WHERE d.order_id = $1 ORDER BY d.created_at DESC`,
      [id]
    ),
    query('SELECT * FROM payments WHERE order_id = $1 ORDER BY created_at DESC', [id]),
  ]);

  res.json({ order, history, items, evidence, receipts, messages, disputes, payments });
}

const forceCancelSchema = z.object({ reason: z.string().min(3).max(500) });

/**
 * Support intervention: cancel an order regardless of where it sits.
 *
 * This bypasses the normal state machine on purpose — assertValidTransition
 * already grants admins that latitude for exactly this case. The reason is
 * required and recorded in the status history, so an override is always
 * attributable to a person.
 */
export async function forceCancelOrder(req: Request, res: Response) {
  const { reason } = forceCancelSchema.parse(req.body);
  const { id } = req.params;

  const order = await queryOne<{ id: string; status: string }>(
    'SELECT id, status::text AS status FROM orders WHERE id = $1',
    [id]
  );
  if (!order) throw new ApiError(404, 'Order not found');
  if (['cancelled', 'refunded'].includes(order.status)) {
    throw new ApiError(409, `This order is already ${order.status}`);
  }

  const updated = await queryOne(
    `UPDATE orders SET status = 'cancelled', cancelled_at = now(), updated_at = now()
      WHERE id = $1 RETURNING *`,
    [id]
  );

  await query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
     VALUES ($1, $2::order_status, 'cancelled', $3, $4)`,
    [id, order.status, req.user!.id, `Admin force-cancel: ${reason}`]
  );

  res.json({ order: updated });
}

const openDisputeSchema = z.object({
  reason: z.string().min(3).max(100),
  description: z.string().min(3).max(2000),
  /** Whose behalf this is raised on; defaults to the customer. */
  onBehalfOf: z.enum(['customer', 'shopper']).default('customer'),
});

/**
 * Opens a dispute for a user who complained through a channel outside the app
 * (a phone call, a message to support). Recorded against the person it is for,
 * not the admin, so the case reads correctly to whoever handles it next.
 */
export async function openDisputeForOrder(req: Request, res: Response) {
  const input = openDisputeSchema.parse(req.body);
  const { id } = req.params;

  const order = await queryOne<{ id: string; customer_id: string; shopper_id: string | null; status: string }>(
    'SELECT id, customer_id, shopper_id, status::text AS status FROM orders WHERE id = $1',
    [id]
  );
  if (!order) throw new ApiError(404, 'Order not found');

  const raisedBy = input.onBehalfOf === 'shopper' ? order.shopper_id : order.customer_id;
  if (!raisedBy) throw new ApiError(409, 'That side of the order has no user assigned');

  const dispute = await queryOne(
    `INSERT INTO disputes (order_id, raised_by, reason, description)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [id, raisedBy, input.reason, `${input.description}\n\n(Opened by admin on their behalf.)`]
  );

  // Mirror it on the order so the state machine and every dashboard agree.
  if (!['completed', 'cancelled', 'refunded', 'disputed'].includes(order.status)) {
    await query(`UPDATE orders SET status = 'disputed', updated_at = now() WHERE id = $1`, [id]);
    await query(
      `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
       VALUES ($1, $2::order_status, 'disputed', $3, $4)`,
      [id, order.status, req.user!.id, `Dispute opened by admin on behalf of the ${input.onBehalfOf}`]
    );
  }

  res.status(201).json({ dispute });
}
