import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';
import { query, queryOne } from '../db/pool';
import { STORE_CATEGORIES } from '../seller/categories';
import { alternativesFor, approveCorrections, findOrCreateCanonical, rejectCorrections, removeSpec, setSpecByAdmin } from './canonical';
import { enqueueResearch, extractSpecs, researchConfigured } from './research';
import { scheduleResearch } from './index';
import { slugify } from './normalize';

const pageSchema = z.object({ limit: z.coerce.number().int().min(1).max(200).optional().default(50), offset: z.coerce.number().int().min(0).optional().default(0) });

export async function products(req: Request, res: Response) {
  const { limit, offset } = pageSchema.parse(req.query);
  const { q, category, needsReview } = z.object({ q: z.string().max(120).optional(), category: z.string().max(40).optional(), needsReview: z.string().optional() }).parse(req.query);
  const params: unknown[] = [];
  const cond = [`cp.status <> 'merged'`];
  if (q) { params.push(`%${q.toLowerCase()}%`); cond.push(`(lower(cp.display_name) LIKE $${params.length} OR cp.brand_slug LIKE $${params.length})`); }
  if (category) { params.push(category); cond.push(`cp.category = $${params.length}`); }
  if (needsReview) cond.push(`(EXISTS (SELECT 1 FROM canonical_corrections c WHERE c.product_id = cp.id AND c.status = 'pending') OR EXISTS (SELECT 1 FROM canonical_specs s WHERE s.product_id = cp.id AND s.status = 'conflict'))`);
  const where = cond.join(' AND ');
  const rows = await query(
    `SELECT cp.*,
            (SELECT count(*)::int FROM canonical_specs s WHERE s.product_id = cp.id AND s.status = 'verified') AS verified_specs,
            (SELECT count(*)::int FROM canonical_specs s WHERE s.product_id = cp.id AND s.status = 'pending') AS pending_specs,
            (SELECT count(*)::int FROM canonical_specs s WHERE s.product_id = cp.id AND s.status = 'conflict') AS conflict_specs,
            (SELECT count(*)::int FROM canonical_corrections c WHERE c.product_id = cp.id AND c.status = 'pending') AS pending_corrections,
            (SELECT status FROM research_jobs j WHERE j.product_id = cp.id ORDER BY j.created_at DESC LIMIT 1) AS research_status
       FROM canonical_products cp WHERE ${where}
      ORDER BY pending_corrections DESC, conflict_specs DESC, cp.listing_count DESC, cp.updated_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM canonical_products cp WHERE ${where}`, params);
  res.json({ products: rows, total: total?.n ?? 0, researchConfigured: researchConfigured() });
}

export async function product(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const row = await queryOne(`SELECT * FROM canonical_products WHERE id = $1`, [id]);
  if (!row) throw new ApiError(404, 'Product not found');
  const [specs, sources, corrections, jobs, listings] = await Promise.all([
    query(`SELECT * FROM canonical_specs WHERE product_id = $1 ORDER BY (status = 'conflict') DESC, (status = 'verified') DESC, label`, [id]),
    query(`SELECT * FROM canonical_spec_sources WHERE product_id = $1 ORDER BY attribute_key, trust_tier, observed_at DESC`, [id]),
    query(`SELECT c.*, u.full_name AS seller_name FROM canonical_corrections c LEFT JOIN users u ON u.id = c.seller_id WHERE c.product_id = $1 ORDER BY (c.status = 'pending') DESC, c.created_at DESC LIMIT 100`, [id]),
    query(`SELECT * FROM research_jobs WHERE product_id = $1 ORDER BY created_at DESC LIMIT 10`, [id]),
    query(`SELECT p.id, p.name, p.status, s.name AS store_name FROM seller_products p LEFT JOIN seller_stores s ON s.id = p.store_id WHERE p.canonical_product_id = $1 ORDER BY p.created_at DESC LIMIT 20`, [id]),
  ]);
  const alternatives: Record<string, unknown> = {};
  for (const s of specs as { attribute_key: string; status: string }[]) if (s.status === 'conflict') alternatives[s.attribute_key] = await alternativesFor(id, s.attribute_key);
  res.json({ product: row, specs, sources, corrections, jobs, listings, alternatives, researchConfigured: researchConfigured() });
}

export async function createProduct(req: Request, res: Response) {
  const body = z.object({ brand: z.string().trim().min(1).max(80), model: z.string().trim().min(2).max(120), category: z.enum(STORE_CATEGORIES) }).parse(req.body);
  const created = await findOrCreateCanonical({ ...body, createdBy: 'admin' });
  if (!created) throw new ApiError(400, 'Give a brand and a model');
  res.status(201).json({ product: created });
}

export async function upsertSpec(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const body = z.object({ key: z.string().trim().max(60).optional(), label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200), unit: z.string().trim().max(20).nullable().optional() }).parse(req.body);
  if (/price|cost|ugx|fee/i.test(body.label) || /price|cost|ugx|fee/i.test(body.key ?? '')) throw new ApiError(400, 'Price is never part of product knowledge. Sellers set it per listing.');
  const key = slugify(body.key || body.label);
  if (!key) throw new ApiError(400, 'Give the detail a name');
  const exists = await queryOne(`SELECT 1 FROM canonical_products WHERE id = $1`, [id]);
  if (!exists) throw new ApiError(404, 'Product not found');
  const spec = await setSpecByAdmin(id, key, body.label, body.value, body.unit ?? null, req.user!.id);
  res.json({ spec });
}

export async function deleteSpec(req: Request, res: Response) {
  const { id, key } = z.object({ id: z.string().uuid(), key: z.string().max(60) }).parse(req.params);
  await removeSpec(id, key);
  res.json({ ok: true });
}

export async function rejectSpec(req: Request, res: Response) {
  const { id, key } = z.object({ id: z.string().uuid(), key: z.string().max(60) }).parse(req.params);
  await query(`UPDATE canonical_specs SET status = 'rejected', locked_by_admin = TRUE, updated_at = now() WHERE product_id = $1 AND attribute_key = $2`, [id, key]);
  res.json({ ok: true });
}

export async function corrections(req: Request, res: Response) {
  const { limit, offset } = pageSchema.parse(req.query);
  const { status } = z.object({ status: z.enum(['pending', 'approved', 'rejected', 'superseded', 'all']).optional().default('pending') }).parse(req.query);
  const params: unknown[] = [];
  const cond = ['TRUE'];
  if (status !== 'all') { params.push(status); cond.push(`c.status = $${params.length}`); }
  const rows = await query(
    `SELECT c.*, cp.display_name, cp.category, u.full_name AS seller_name,
            (SELECT count(DISTINCT c2.seller_id)::int FROM canonical_corrections c2 WHERE c2.product_id = c.product_id AND c2.attribute_key = c.attribute_key AND c2.proposed_norm = c.proposed_norm AND c2.status = 'pending') AS agreeing_sellers
       FROM canonical_corrections c JOIN canonical_products cp ON cp.id = c.product_id LEFT JOIN users u ON u.id = c.seller_id
      WHERE ${cond.join(' AND ')} ORDER BY agreeing_sellers DESC, c.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM canonical_corrections c WHERE ${cond.join(' AND ')}`, params);
  res.json({ corrections: rows, total: total?.n ?? 0 });
}

export async function decideCorrection(req: Request, res: Response) {
  const { id, action } = z.object({ id: z.string().uuid(), action: z.enum(['approve', 'reject']) }).parse(req.params);
  const { reason } = z.object({ reason: z.string().trim().max(300).optional() }).parse(req.body ?? {});
  const n = action === 'approve' ? await approveCorrections([id], { adminId: req.user!.id, reason }) : await rejectCorrections([id], { adminId: req.user!.id, reason });
  if (n === 0) throw new ApiError(404, 'That correction is no longer pending');
  res.json({ ok: true });
}

export async function requestResearch(req: Request, res: Response) {
  const { id } = z.object({ id: z.string().uuid() }).parse(req.params);
  const product = await queryOne<any>(`SELECT * FROM canonical_products WHERE id = $1`, [id]);
  if (!product) throw new ApiError(404, 'Product not found');
  await query(`UPDATE research_jobs SET status = 'failed', error = 'Superseded by a manual request', finished_at = now() WHERE product_id = $1 AND status = 'done'`, [id]).catch(() => undefined);
  const job = await enqueueResearch(product, req.user!.id);
  if (job.status === 'queued') scheduleResearch(job.id);
  res.json({ research: job, researchConfigured: researchConfigured() });
}

export async function dataQuality(_req: Request, res: Response) {
  const [fields, categories, totals] = await Promise.all([
    query(`SELECT c.attribute_key, max(c.label) AS label, count(*)::int AS corrections, count(DISTINCT c.seller_id)::int AS sellers, count(*) FILTER (WHERE c.status = 'approved')::int AS approved
             FROM canonical_corrections c GROUP BY c.attribute_key ORDER BY corrections DESC LIMIT 12`),
    query(`SELECT cp.category, count(*)::int AS corrections, count(DISTINCT c.product_id)::int AS products
             FROM canonical_corrections c JOIN canonical_products cp ON cp.id = c.product_id GROUP BY cp.category ORDER BY corrections DESC LIMIT 12`),
    queryOne(`SELECT (SELECT count(*)::int FROM canonical_products WHERE status <> 'merged') AS products,
                     (SELECT count(*)::int FROM canonical_specs WHERE status = 'verified') AS verified,
                     (SELECT count(*)::int FROM canonical_specs WHERE status = 'pending') AS pending,
                     (SELECT count(*)::int FROM canonical_specs WHERE status = 'conflict') AS conflicts,
                     (SELECT count(*)::int FROM canonical_corrections WHERE status = 'pending') AS pending_corrections,
                     (SELECT count(*)::int FROM canonical_corrections WHERE status = 'approved' AND decided_by IS NULL) AS auto_promoted,
                     (SELECT count(*)::int FROM research_jobs WHERE status = 'done') AS research_done,
                     (SELECT count(*)::int FROM research_jobs WHERE status = 'skipped') AS research_skipped,
                     (SELECT count(*)::int FROM research_jobs WHERE status = 'failed') AS research_failed`),
  ]);
  res.json({ fields, categories, totals, researchConfigured: researchConfigured() });
}

export async function extractPreview(req: Request, res: Response) {
  const { text, category } = z.object({ text: z.string().min(1).max(5000), category: z.enum(STORE_CATEGORIES) }).parse(req.query);
  res.json({ specs: extractSpecs(text, category) });
}
