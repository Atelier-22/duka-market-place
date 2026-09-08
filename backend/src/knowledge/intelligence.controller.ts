import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';
import { STORE_CATEGORIES } from '../seller/categories';
import { findCanonical, findOrCreateCanonical, specsFor, variantsFor } from './canonical';
import { findKind } from './knowledge.model';
import { enqueueResearch, latestJob, researchConfigured } from './research';
import { CATEGORY_LABELS } from '../seller/categories';
import { searchCanonical } from './lifecycle';
import { scheduleResearch } from './index';

const lookupSchema = z.object({
  brand: z.string().trim().max(80).optional().default(''),
  model: z.string().trim().max(120).optional().default(''),
  category: z.enum(STORE_CATEGORIES).optional(),
});

function presentSpec(s: { attribute_key: string; label: string; value: string; unit: string | null; confidence: number; status: string; source_count: number; best_tier: number | null }) {
  return { key: s.attribute_key, label: s.label, value: s.value, unit: s.unit, confidence: Number(s.confidence), status: s.status, sourceCount: Number(s.source_count), bestTier: s.best_tier };
}

export async function lookup(req: Request, res: Response) {
  const { brand, model } = lookupSchema.parse(req.query);
  if (!brand || !model) { res.json({ known: false, product: null, research: null, researchConfigured: researchConfigured() }); return; }
  const product = await findCanonical(brand, model);
  if (!product) { res.json({ known: false, product: null, research: null, researchConfigured: researchConfigured() }); return; }
  const [specs, job, variants] = await Promise.all([specsFor(product.id, { statuses: ['verified', 'pending', 'conflict'] }), latestJob(product.id), variantsFor(product.id)]);
  res.setHeader('Cache-Control', 'no-store');
  res.json({
    known: true,
    product: { id: product.id, brand: product.brand, model: product.model, displayName: product.display_name, category: product.category, listingCount: product.listing_count, researchedAt: product.researched_at, family: (product as any).family ?? null, releasedOn: (product as any).released_on ?? null, lifecycle: (product as any).lifecycle_override ?? (product as any).lifecycle ?? 'unknown', specs: specs.map(presentSpec), variants },
    research: job ? { status: job.status, specsFound: job.specs_found, finishedAt: job.finished_at, error: job.status === 'failed' || job.status === 'skipped' ? job.error : null } : null,
    researchConfigured: researchConfigured(),
  });
}

export async function research(req: Request, res: Response) {
  const body = z.object({ brand: z.string().trim().min(1).max(80), model: z.string().trim().min(2).max(120), category: z.enum(STORE_CATEGORIES), kind: z.string().trim().max(80).optional() }).parse(req.body);
  const user = req.user;
  if (!user || (user.role !== 'seller' && user.role !== 'admin' && user.role !== 'super_admin')) throw new ApiError(403, 'Only sellers can ask Duka to look up a product');
  const kind = body.kind ? await findKind(body.category, body.kind) : null;
  const product = await findOrCreateCanonical({ brand: body.brand, model: body.model, category: body.category, kindId: kind?.id ?? null, createdBy: 'seller' });
  if (!product) throw new ApiError(400, 'Give a brand and a model');
  const job = await enqueueResearch(product, user.id);
  if (job.status === 'queued') scheduleResearch(job.id);
  const specs = await specsFor(product.id);
  res.json({ product: { id: product.id, displayName: product.display_name, specs: specs.map(presentSpec) }, research: { id: job.id, status: job.status }, researchConfigured: researchConfigured() });
}

export async function search(req: Request, res: Response) {
  const { q, limit } = z.object({ q: z.string().trim().min(1).max(120), limit: z.coerce.number().int().min(1).max(100).optional() }).parse(req.query);
  const result = await searchCanonical(q, limit ?? 60);
  const groups = new Map<string, { category: string; label: string; products: typeof result.hits }>();
  for (const hit of result.hits) {
    const group = groups.get(hit.category) ?? { category: hit.category, label: CATEGORY_LABELS[hit.category as keyof typeof CATEGORY_LABELS] ?? hit.category, products: [] };
    group.products.push(hit);
    groups.set(hit.category, group);
  }
  res.setHeader('Cache-Control', 'public, max-age=30');
  res.json({ query: q, total: result.total, groups: [...groups.values()] });
}
