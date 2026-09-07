import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';
import { query, queryOne } from '../db/pool';
import { findUserById } from '../models/user.model';
import { storageService } from '../services/storage.service';
import { adminSellerStats } from './analytics';
import { setSuspended, setVerificationStatus } from './store.model';
import { setProductStatus } from './product.model';
import { notifySellerProductModerated, notifySellerSuspension, notifySellerVerification } from './notify';

async function audit(req: Request, action: string, summary: string, target: { type: string; id?: string | null }, metadata?: unknown) {
  const admin = req.user!.kind === 'staff'
    ? await queryOne<{ full_name: string }>('SELECT full_name FROM staff WHERE id = $1', [req.user!.id])
    : await findUserById(req.user!.id);
  await query(
    `INSERT INTO admin_audit_log (admin_id, admin_name, action, target_type, target_id, summary, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [req.user!.id, admin?.full_name ?? 'Admin', action, target.type, target.id ?? null, summary, metadata ? JSON.stringify(metadata) : null]
  ).catch(() => undefined);
}

export async function stats(_req: Request, res: Response) {
  res.json(await adminSellerStats());
}

export async function list(req: Request, res: Response) {
  const q = z.object({
    q: z.string().trim().max(80).optional(),
    status: z.enum(['all', 'active', 'suspended', 'pending', 'verified', 'unverified', 'no_store']).optional(),
    sort: z.enum(['newest', 'sales', 'followers', 'rating', 'products']).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  }).parse(req.query);
  const conditions = ["u.role = 'seller'"];
  const params: unknown[] = [];
  if (q.q) {
    params.push(`%${q.q.toLowerCase()}%`);
    conditions.push(`(LOWER(u.full_name) LIKE $${params.length} OR LOWER(COALESCE(u.email,'')) LIKE $${params.length} OR u.phone LIKE $${params.length} OR LOWER(COALESCE(s.name,'')) LIKE $${params.length})`);
  }
  switch (q.status) {
    case 'active': conditions.push('u.is_active AND NOT sp.is_suspended'); break;
    case 'suspended': conditions.push('sp.is_suspended'); break;
    case 'pending': conditions.push("sp.verification_status = 'pending'"); break;
    case 'verified': conditions.push("sp.verification_status = 'verified'"); break;
    case 'unverified': conditions.push("sp.verification_status IN ('unverified','rejected')"); break;
    case 'no_store': conditions.push('s.id IS NULL'); break;
  }
  const order = {
    newest: 'u.created_at DESC',
    sales: 'COALESCE(s.sales_count, 0) DESC, u.created_at DESC',
    followers: 'COALESCE(s.follower_count, 0) DESC, u.created_at DESC',
    rating: 'COALESCE(s.rating_avg, 0) DESC, COALESCE(s.rating_count, 0) DESC',
    products: 'COALESCE(s.product_count, 0) DESC, u.created_at DESC',
  }[q.sort ?? 'newest'];
  params.push(q.limit ?? 200);
  const rows = await query(
    `SELECT u.id, u.full_name, u.phone, u.email, u.avatar_url, u.is_active, u.created_at, u.last_seen_at,
            sp.verification_status, sp.is_suspended, sp.suspended_reason,
            s.id AS store_id, s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo, s.status AS store_status,
            s.category, s.city, s.product_count, s.follower_count, s.rating_avg, s.rating_count, s.sales_count,
            (SELECT count(*)::int FROM seller_orders o WHERE o.seller_id = u.id) AS orders,
            (SELECT COALESCE(SUM(total_ugx), 0)::bigint FROM seller_orders o WHERE o.seller_id = u.id AND o.status = 'completed') AS revenue_ugx
       FROM users u
       JOIN seller_profiles sp ON sp.user_id = u.id
       LEFT JOIN seller_stores s ON s.owner_id = u.id
      WHERE ${conditions.join(' AND ')}
      ORDER BY ${order}
      LIMIT $${params.length}`,
    params
  );
  res.json({ sellers: rows });
}

export async function detail(req: Request, res: Response) {
  const seller = await queryOne<any>(
    `SELECT u.id, u.full_name, u.phone, u.email, u.avatar_url, u.is_active, u.created_at, u.last_seen_at,
            sp.verification_status, sp.is_suspended, sp.suspended_reason, sp.suspended_at
       FROM users u JOIN seller_profiles sp ON sp.user_id = u.id
      WHERE u.id = $1 AND u.role = 'seller'`,
    [req.params.id]
  );
  if (!seller) throw new ApiError(404, 'Seller not found');
  const [store, products, orders, reviews, verifications, followers, linked] = await Promise.all([
    queryOne('SELECT * FROM seller_stores WHERE owner_id = $1', [seller.id]),
    query(
      `SELECT p.id, p.name, p.status, p.category, p.price_ugx, p.sale_price_ugx, p.stock_quantity - p.reserved_quantity AS available,
              p.sales_count, p.view_count, p.rating_avg, p.flagged_at, p.flagged_reason, p.created_at, p.published_at,
              (SELECT url FROM seller_product_images i WHERE i.product_id = p.id ORDER BY position LIMIT 1) AS image_url
         FROM seller_products p WHERE p.owner_id = $1 ORDER BY p.created_at DESC LIMIT 100`,
      [seller.id]
    ),
    query(
      `SELECT id, order_number, status, payment_status, total_ugx, customer_name, created_at, completed_at
         FROM seller_orders WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 50`,
      [seller.id]
    ),
    query(
      `SELECT r.id, r.stars, r.comment, r.reply, r.created_at, u.full_name AS author_name
         FROM seller_store_reviews r JOIN seller_stores s ON s.id = r.store_id JOIN users u ON u.id = r.author_id
        WHERE s.owner_id = $1 ORDER BY r.created_at DESC LIMIT 30`,
      [seller.id]
    ),
    query(
      `SELECT id, business_name, registration_number, note, status, review_note, reviewed_at, created_at, (document_key IS NOT NULL) AS has_document
         FROM seller_verifications WHERE seller_id = $1 ORDER BY created_at DESC`,
      [seller.id]
    ),
    queryOne<{ n: number }>('SELECT count(*)::int AS n FROM seller_followers f JOIN seller_stores s ON s.id = f.store_id WHERE s.owner_id = $1', [seller.id]),
    query(
      `SELECT id, role::text AS role, full_name FROM users WHERE id <> $1 AND regexp_replace(phone, '[^0-9+]', '', 'g') = regexp_replace($2, '[^0-9+]', '', 'g')`,
      [seller.id, seller.phone]
    ),
  ]);
  const totals = await queryOne<any>(
    `SELECT count(*)::int AS orders, count(*) FILTER (WHERE status = 'completed')::int AS completed,
            COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_ugx
       FROM seller_orders WHERE seller_id = $1`,
    [seller.id]
  );
  res.json({ seller, store, products, orders, reviews, verifications, followers: followers?.n ?? 0, linkedAccounts: linked, totals });
}

export async function verificationQueue(_req: Request, res: Response) {
  const rows = await query(
    `SELECT v.id, v.seller_id, v.business_name, v.registration_number, v.note, v.status, v.created_at, (v.document_key IS NOT NULL) AS has_document,
            u.full_name, u.phone, s.name AS store_name, s.slug AS store_slug
       FROM seller_verifications v
       JOIN users u ON u.id = v.seller_id
       LEFT JOIN seller_stores s ON s.owner_id = v.seller_id
      WHERE v.status = 'pending'
      ORDER BY v.created_at ASC`
  );
  res.json({ verifications: rows });
}

export async function verificationDocument(req: Request, res: Response) {
  const record = await queryOne<{ document_key: string | null }>('SELECT document_key FROM seller_verifications WHERE id = $1', [req.params.id]);
  if (!record?.document_key) throw new ApiError(404, 'No document was attached');
  const file = await storageService.read(record.document_key);
  if (!file) throw new ApiError(410, 'That document is no longer stored');
  res.setHeader('Content-Type', file.mimeType);
  res.setHeader('Content-Length', String(file.byteSize));
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.end(file.data);
}

const decisionSchema = z.object({ approve: z.boolean(), note: z.string().trim().max(500).nullable().optional() });

export async function decideVerification(req: Request, res: Response) {
  const input = decisionSchema.parse(req.body);
  const record = await queryOne<{ id: string; seller_id: string; status: string; document_key: string | null }>(
    'SELECT id, seller_id, status, document_key FROM seller_verifications WHERE id = $1',
    [req.params.id]
  );
  if (!record) throw new ApiError(404, 'Submission not found');
  if (record.status !== 'pending') throw new ApiError(409, 'Already decided');
  if (!input.approve && !input.note) throw new ApiError(400, 'Give the seller a reason');
  const status = input.approve ? 'verified' : 'rejected';
  await query(
    'UPDATE seller_verifications SET status = $2, review_note = $3, reviewed_by = $4, reviewed_at = now() WHERE id = $1',
    [record.id, status, input.note ?? null, req.user!.id]
  );
  await setVerificationStatus(record.seller_id, status);
  if (record.document_key) await storageService.delete(record.document_key).catch(() => undefined);
  await query('UPDATE seller_verifications SET document_key = NULL WHERE id = $1', [record.id]);
  await notifySellerVerification({ sellerId: record.seller_id, verified: input.approve, note: input.note });
  await audit(req, input.approve ? 'seller.verify' : 'seller.reject_verification', `${input.approve ? 'Verified' : 'Rejected verification for'} seller ${record.seller_id}`, { type: 'seller', id: record.seller_id }, { note: input.note });
  res.json({ status, documentDeleted: true });
}

export async function suspend(req: Request, res: Response) {
  const input = z.object({ reason: z.string().trim().min(3).max(500) }).parse(req.body);
  const seller = await queryOne<{ id: string; full_name: string }>("SELECT id, full_name FROM users WHERE id = $1 AND role = 'seller'", [req.params.id]);
  if (!seller) throw new ApiError(404, 'Seller not found');
  await setSuspended(seller.id, true, input.reason);
  await notifySellerSuspension({ sellerId: seller.id, suspended: true, reason: input.reason });
  await audit(req, 'seller.suspend', `Suspended seller ${seller.full_name}`, { type: 'seller', id: seller.id }, { reason: input.reason });
  res.json({ ok: true });
}

export async function reactivate(req: Request, res: Response) {
  const seller = await queryOne<{ id: string; full_name: string }>("SELECT id, full_name FROM users WHERE id = $1 AND role = 'seller'", [req.params.id]);
  if (!seller) throw new ApiError(404, 'Seller not found');
  await setSuspended(seller.id, false, null);
  await notifySellerSuspension({ sellerId: seller.id, suspended: false });
  await audit(req, 'seller.reactivate', `Reinstated seller ${seller.full_name}`, { type: 'seller', id: seller.id });
  res.json({ ok: true });
}

export async function products(req: Request, res: Response) {
  const q = z.object({
    q: z.string().trim().max(80).optional(),
    status: z.enum(['all', 'published', 'draft', 'archived', 'flagged', 'out_of_stock']).optional(),
    category: z.string().trim().max(40).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  }).parse(req.query);
  const conditions = ['TRUE'];
  const params: unknown[] = [];
  if (q.q) { params.push(`%${q.q.toLowerCase()}%`); conditions.push(`(LOWER(p.name) LIKE $${params.length} OR LOWER(s.name) LIKE $${params.length} OR LOWER(COALESCE(p.brand,'')) LIKE $${params.length})`); }
  if (q.category) { params.push(q.category); conditions.push(`p.category = $${params.length}`); }
  switch (q.status) {
    case 'published': conditions.push("p.status = 'published'"); break;
    case 'draft': conditions.push("p.status = 'draft'"); break;
    case 'archived': conditions.push("p.status = 'archived'"); break;
    case 'flagged': conditions.push('p.flagged_at IS NOT NULL'); break;
    case 'out_of_stock': conditions.push("p.status = 'published' AND p.stock_quantity - p.reserved_quantity <= 0"); break;
  }
  params.push(q.limit ?? 200);
  const rows = await query(
    `SELECT p.id, p.name, p.status, p.category, p.condition, p.price_ugx, p.sale_price_ugx,
            p.stock_quantity - p.reserved_quantity AS available, p.sales_count, p.view_count, p.rating_avg, p.rating_count,
            p.flagged_at, p.flagged_reason, p.created_at, p.published_at,
            s.id AS store_id, s.name AS store_name, s.slug AS store_slug, u.id AS seller_id, u.full_name AS seller_name,
            (SELECT url FROM seller_product_images i WHERE i.product_id = p.id ORDER BY position LIMIT 1) AS image_url
       FROM seller_products p
       JOIN seller_stores s ON s.id = p.store_id
       JOIN users u ON u.id = p.owner_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY p.created_at DESC
      LIMIT $${params.length}`,
    params
  );
  res.json({ products: rows });
}

export async function unpublishProduct(req: Request, res: Response) {
  const input = z.object({ reason: z.string().trim().min(3).max(500) }).parse(req.body);
  const product = await queryOne<{ id: string; name: string; owner_id: string }>('SELECT id, name, owner_id FROM seller_products WHERE id = $1', [req.params.id]);
  if (!product) throw new ApiError(404, 'Product not found');
  await setProductStatus(product.id, 'draft');
  await notifySellerProductModerated({ sellerId: product.owner_id, productId: product.id, productName: product.name, action: 'unpublished', reason: input.reason });
  await audit(req, 'seller_product.unpublish', `Unpublished ${product.name}`, { type: 'seller_product', id: product.id }, { reason: input.reason });
  res.json({ ok: true });
}

export async function flagProduct(req: Request, res: Response) {
  const input = z.object({ reason: z.string().trim().min(3).max(500) }).parse(req.body);
  const product = await queryOne<{ id: string; name: string; owner_id: string; store_id: string }>('SELECT id, name, owner_id, store_id FROM seller_products WHERE id = $1', [req.params.id]);
  if (!product) throw new ApiError(404, 'Product not found');
  await query('UPDATE seller_products SET flagged_at = now(), flagged_reason = $2, flagged_by = $3, updated_at = now() WHERE id = $1', [product.id, input.reason, req.user!.id]);
  await notifySellerProductModerated({ sellerId: product.owner_id, productId: product.id, productName: product.name, action: 'flagged', reason: input.reason });
  await audit(req, 'seller_product.flag', `Flagged ${product.name}`, { type: 'seller_product', id: product.id }, { reason: input.reason });
  res.json({ ok: true });
}

export async function unflagProduct(req: Request, res: Response) {
  const product = await queryOne<{ id: string; name: string }>('UPDATE seller_products SET flagged_at = NULL, flagged_reason = NULL, flagged_by = NULL, updated_at = now() WHERE id = $1 RETURNING id, name', [req.params.id]);
  if (!product) throw new ApiError(404, 'Product not found');
  await audit(req, 'seller_product.unflag', `Cleared the flag on ${product.name}`, { type: 'seller_product', id: product.id });
  res.json({ ok: true });
}

export async function orders(req: Request, res: Response) {
  const q = z.object({ status: z.string().max(20).optional(), limit: z.coerce.number().int().min(1).max(500).optional() }).parse(req.query);
  const params: unknown[] = [];
  let where = 'TRUE';
  if (q.status && q.status !== 'all') { params.push(q.status); where = `o.status = $1`; }
  params.push(q.limit ?? 200);
  const rows = await query(
    `SELECT o.id, o.order_number, o.status, o.payment_status, o.total_ugx, o.customer_name, o.created_at, o.completed_at,
            s.name AS store_name, s.slug AS store_slug, u.full_name AS seller_name, u.id AS seller_id,
            (SELECT count(*)::int FROM seller_order_items i WHERE i.order_id = o.id) AS item_count
       FROM seller_orders o JOIN seller_stores s ON s.id = o.store_id JOIN users u ON u.id = o.seller_id
      WHERE ${where} ORDER BY o.created_at DESC LIMIT $${params.length}`,
    params
  );
  res.json({ orders: rows });
}

export async function stores(_req: Request, res: Response) {
  const rows = await query(
    `SELECT s.*, u.full_name AS seller_name, sp.verification_status, sp.is_suspended,
            (SELECT count(*)::int FROM seller_orders o WHERE o.store_id = s.id) AS orders,
            (SELECT MAX(created_at) FROM seller_products p WHERE p.store_id = s.id) AS last_product_at
       FROM seller_stores s JOIN users u ON u.id = s.owner_id JOIN seller_profiles sp ON sp.user_id = s.owner_id
      ORDER BY s.created_at DESC LIMIT 500`
  );
  res.json({ stores: rows });
}
