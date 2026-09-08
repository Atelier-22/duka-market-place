import { query, queryOne } from '../db/pool';
import { cleanValue, normalizeValue, parseMeasure, slugify, titleCase } from './normalize';

export type SourceType = 'manufacturer' | 'retailer' | 'unknown' | 'seller' | 'admin';

export const TIER_WEIGHT: Record<number, number> = { 1: 0.7, 2: 0.45, 3: 0.2, 4: 0.3 };
export const VERIFIED_AT = 0.6;
export const CONFLICT_AT = 0.4;
export const SELLER_AUTO_PROMOTE_AT = 3;

export const PRICE_LIKE = /price|cost|ugx|usd|kes|fee|discount|deposit|rent\b|salary|budget/i;

export const FIXED_SPEC_KEYS = new Set([
  'screen-size', 'resolution', 'display-type', 'refresh-rate', 'processor', 'ram', 'battery', 'camera', 'front-camera', 'operating-system',
  'weight', 'dimensions', 'charging', 'network', 'sim', 'graphics', 'storage-type', 'engine-size', 'fuel', 'transmission', 'drive', 'seats',
  'body-type', 'capacity', 'power', 'energy-rating', 'material', 'wattage', 'voltage', 'megapixels', 'video', 'channels', 'year-released',
  'water-resistance', 'bluetooth', 'wireless', 'ports', 'panel', 'smart-tv', 'cooling', 'noise-cancelling', 'battery-life', 'connector',
]);

export interface CanonicalProductRow {
  id: string; brand: string; brand_slug: string; model: string; model_slug: string; category: string; kind_id: string | null; display_name: string;
  status: string; merged_into: string | null; listing_count: number; researched_at: string | null; created_by: string; created_at: string; updated_at: string;
}

export interface CanonicalSpecRow {
  id: string; product_id: string; attribute_key: string; label: string; value: string; value_norm: string; unit: string | null; confidence: number;
  status: 'verified' | 'pending' | 'conflict' | 'rejected'; source_count: number; best_tier: number | null; locked_by_admin: boolean; updated_at: string;
}

export function canonicalKey(brand: string, model: string): { brandSlug: string; modelSlug: string } | null {
  const brandSlug = slugify(brand);
  const modelSlug = slugify(model);
  if (!brandSlug || !modelSlug || modelSlug.length < 2) return null;
  return { brandSlug, modelSlug };
}

export async function findCanonical(brand: string, model: string): Promise<CanonicalProductRow | null> {
  const key = canonicalKey(brand, model);
  if (!key) return null;
  const row = await queryOne<CanonicalProductRow>(`SELECT * FROM canonical_products WHERE brand_slug = $1 AND model_slug = $2`, [key.brandSlug, key.modelSlug]);
  if (row?.merged_into) return queryOne<CanonicalProductRow>(`SELECT * FROM canonical_products WHERE id = $1`, [row.merged_into]);
  return row;
}

export async function findOrCreateCanonical(input: { brand: string; model: string; category: string; kindId?: string | null; createdBy: 'system' | 'admin' | 'seller' }): Promise<CanonicalProductRow | null> {
  const existing = await findCanonical(input.brand, input.model);
  if (existing) return existing;
  const key = canonicalKey(input.brand, input.model);
  if (!key) return null;
  const brand = titleCase(input.brand).slice(0, 80);
  const model = cleanValue(input.model, 120);
  return queryOne<CanonicalProductRow>(
    `INSERT INTO canonical_products (brand, brand_slug, model, model_slug, category, kind_id, display_name, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT (brand_slug, model_slug) DO UPDATE SET updated_at = now() RETURNING *`,
    [brand, key.brandSlug, model, key.modelSlug, input.category, input.kindId ?? null, `${brand} ${model}`.slice(0, 200), input.createdBy]
  );
}

export async function linkListing(listingId: string, canonicalId: string | null) {
  await query(`UPDATE seller_products SET canonical_product_id = $2 WHERE id = $1 AND canonical_product_id IS DISTINCT FROM $2`, [listingId, canonicalId]);
  if (canonicalId) await refreshListingCount(canonicalId);
}

export async function refreshListingCount(canonicalId: string) {
  await query(`UPDATE canonical_products SET listing_count = (SELECT count(*)::int FROM seller_products WHERE canonical_product_id = $1 AND status = 'published'), updated_at = now() WHERE id = $1`, [canonicalId]);
}

export interface SourceInput {
  type: SourceType;
  tier: 1 | 2 | 3 | 4;
  url?: string | null;
  title?: string | null;
  sellerId?: string | null;
  adminId?: string | null;
}

export async function recordSource(productId: string, attributeKey: string, label: string, value: string, unit: string | null, source: SourceInput) {
  const cleaned = cleanValue(value, 200);
  if (!cleaned) return;
  await query(
    `INSERT INTO canonical_spec_sources (product_id, attribute_key, value, value_norm, source_type, trust_tier, source_url, source_title, seller_id, admin_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (product_id, attribute_key, value_norm, COALESCE(source_url, ''), COALESCE(seller_id, '00000000-0000-0000-0000-000000000000'::uuid)) DO UPDATE SET observed_at = now()`,
    [productId, attributeKey, cleaned, normalizeValue(cleaned).slice(0, 200), source.type, source.tier, source.url ?? null, source.title?.slice(0, 300) ?? null, source.sellerId ?? null, source.adminId ?? null]
  );
  await recomputeSpec(productId, attributeKey, label, unit);
}

export function scoreValues(sources: { value: string; value_norm: string; trust_tier: number; source_type: string; seller_id: string | null; source_url: string | null }[]) {
  const byValue = new Map<string, { value: string; miss: number; count: number; bestTier: number; seen: Set<string> }>();
  for (const s of sources) {
    const entry = byValue.get(s.value_norm) ?? { value: s.value, miss: 1, count: 0, bestTier: 9, seen: new Set<string>() };
    const identity = s.source_type === 'seller' ? `seller:${s.seller_id}` : s.source_type === 'admin' ? 'admin' : `url:${s.source_url ?? ''}`;
    if (!entry.seen.has(identity)) {
      entry.seen.add(identity);
      entry.count += 1;
      entry.miss *= 1 - (s.source_type === 'admin' ? 1 : s.source_type === 'seller' ? 0.3 : TIER_WEIGHT[s.trust_tier] ?? 0.2);
      entry.bestTier = Math.min(entry.bestTier, s.trust_tier);
    }
    byValue.set(s.value_norm, entry);
  }
  return [...byValue.entries()].map(([norm, e]) => ({ norm, value: e.value, confidence: Math.round(Math.min(0.99, 1 - e.miss) * 1000) / 1000, count: e.count, bestTier: e.bestTier })).sort((a, b) => b.confidence - a.confidence || a.bestTier - b.bestTier);
}

export async function recomputeSpec(productId: string, attributeKey: string, label?: string | null, unit?: string | null) {
  const current = await queryOne<CanonicalSpecRow>(`SELECT * FROM canonical_specs WHERE product_id = $1 AND attribute_key = $2`, [productId, attributeKey]);
  if (current?.locked_by_admin) {
    const agreeing = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM canonical_spec_sources WHERE product_id = $1 AND attribute_key = $2 AND value_norm = $3`, [productId, attributeKey, current.value_norm]);
    await query(`UPDATE canonical_specs SET source_count = $3, updated_at = now() WHERE id = $1 AND product_id = $2`, [current.id, productId, agreeing?.n ?? 0]);
    return current;
  }
  const sources = await query<{ value: string; value_norm: string; trust_tier: number; source_type: string; seller_id: string | null; source_url: string | null }>(
    `SELECT value, value_norm, trust_tier, source_type, seller_id, source_url FROM canonical_spec_sources WHERE product_id = $1 AND attribute_key = $2`,
    [productId, attributeKey]
  );
  if (sources.length === 0) {
    if (current) await query(`DELETE FROM canonical_specs WHERE id = $1`, [current.id]);
    return null;
  }
  const scored = scoreValues(sources);
  const top = scored[0];
  const runnerUp = scored[1];
  const status = runnerUp && runnerUp.confidence >= CONFLICT_AT ? 'conflict' : top.confidence >= VERIFIED_AT ? 'verified' : 'pending';
  const measure = parseMeasure(top.value);
  const row = await queryOne<CanonicalSpecRow>(
    `INSERT INTO canonical_specs (product_id, attribute_key, label, value, value_norm, unit, confidence, status, source_count, best_tier)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (product_id, attribute_key) DO UPDATE SET label = COALESCE(canonical_specs.label, EXCLUDED.label), value = EXCLUDED.value, value_norm = EXCLUDED.value_norm,
       unit = COALESCE(EXCLUDED.unit, canonical_specs.unit), confidence = EXCLUDED.confidence, status = CASE WHEN canonical_specs.status = 'rejected' THEN 'rejected' ELSE EXCLUDED.status END,
       source_count = EXCLUDED.source_count, best_tier = EXCLUDED.best_tier, updated_at = now()
     RETURNING *`,
    [productId, attributeKey, (label ?? current?.label ?? titleCase(attributeKey.replace(/-/g, ' '))).slice(0, 60), top.value, top.norm, unit ?? measure?.unit ?? current?.unit ?? null, top.confidence, status, top.count, top.bestTier === 9 ? null : top.bestTier]
  );
  return row;
}

export async function specsFor(productId: string, opts: { minConfidence?: number; statuses?: string[] } = {}) {
  const statuses = opts.statuses ?? ['verified', 'pending', 'conflict'];
  return query<CanonicalSpecRow>(
    `SELECT * FROM canonical_specs WHERE product_id = $1 AND status = ANY($2) AND confidence >= $3 ORDER BY (status = 'verified') DESC, confidence DESC, label`,
    [productId, statuses, opts.minConfidence ?? 0]
  );
}

export async function alternativesFor(productId: string, attributeKey: string) {
  const sources = await query<{ value: string; value_norm: string; trust_tier: number; source_type: string; seller_id: string | null; source_url: string | null }>(
    `SELECT value, value_norm, trust_tier, source_type, seller_id, source_url FROM canonical_spec_sources WHERE product_id = $1 AND attribute_key = $2`,
    [productId, attributeKey]
  );
  return scoreValues(sources);
}

export async function applySellerSpecs(listingId: string): Promise<{ agreed: number; corrections: number; contributed: number } | null> {
  const listing = await queryOne<{ id: string; owner_id: string; canonical_product_id: string | null; status: string; specifications: { label: string; value: string }[] }>(
    `SELECT id, owner_id, canonical_product_id, status, specifications FROM seller_products WHERE id = $1`,
    [listingId]
  );
  if (!listing || !listing.canonical_product_id || listing.status !== 'published') return null;
  const canonicalId = listing.canonical_product_id;
  const attrs = await query<{ attribute_key: string; label: string; value: string; value_norm: string; unit: string | null; type: string | null }>(
    `SELECT spa.attribute_key, spa.label, spa.value, spa.value_norm, spa.unit, a.type FROM seller_product_attributes spa LEFT JOIN product_attributes a ON a.id = spa.attribute_id
      WHERE spa.product_id = $1 AND spa.source = 'seller_structured' AND spa.confidence >= 0.9`,
    [listingId]
  );
  const result = { agreed: 0, corrections: 0, contributed: 0 };
  const seen = new Set<string>();
  for (const a of attrs) {
    if (seen.has(a.attribute_key)) continue;
    seen.add(a.attribute_key);
    if (a.type === 'currency' || PRICE_LIKE.test(a.attribute_key) || PRICE_LIKE.test(a.label)) continue;
    if (['brand', 'model', 'colour', 'size', 'waist', 'chest', 'age', 'condition', 'location', 'registration', 'mileage', 'year', 'storage', 'pack-size', 'pack', 'portion', 'package', 'shade', 'length', 'sizes-available', 'warranty', 'delivery', 'sold-per'].includes(a.attribute_key)) continue;
    if (!FIXED_SPEC_KEYS.has(a.attribute_key) && !(await queryOne(`SELECT 1 FROM canonical_specs WHERE product_id = $1 AND attribute_key = $2`, [canonicalId, a.attribute_key]))) {
      if (!['select', 'measurement', 'number', 'text', 'boolean', 'year'].includes(a.type ?? 'select')) continue;
    }
    const current = await queryOne<CanonicalSpecRow>(`SELECT * FROM canonical_specs WHERE product_id = $1 AND attribute_key = $2`, [canonicalId, a.attribute_key]);
    if (!current) {
      await recordSource(canonicalId, a.attribute_key, a.label, a.value, a.unit, { type: 'seller', tier: 4, sellerId: listing.owner_id });
      result.contributed += 1;
      continue;
    }
    if (current.value_norm === a.value_norm) {
      await recordSource(canonicalId, a.attribute_key, a.label, a.value, a.unit, { type: 'seller', tier: 4, sellerId: listing.owner_id });
      await query(`UPDATE canonical_corrections SET status = 'superseded' WHERE product_id = $1 AND attribute_key = $2 AND seller_id = $3 AND status = 'pending'`, [canonicalId, a.attribute_key, listing.owner_id]);
      result.agreed += 1;
      continue;
    }
    await query(
      `INSERT INTO canonical_corrections (product_id, attribute_key, label, canonical_value, proposed_value, proposed_norm, seller_id, listing_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (product_id, attribute_key, seller_id, proposed_norm) DO UPDATE SET listing_id = EXCLUDED.listing_id, canonical_value = EXCLUDED.canonical_value`,
      [canonicalId, a.attribute_key, a.label.slice(0, 60), current.value, cleanValue(a.value, 200), a.value_norm.slice(0, 200), listing.owner_id, listingId]
    );
    result.corrections += 1;
    await maybeAutoPromote(canonicalId, a.attribute_key, a.value_norm);
  }
  return result;
}

async function maybeAutoPromote(canonicalId: string, attributeKey: string, proposedNorm: string) {
  const agreeing = await query<{ id: string; seller_id: string; proposed_value: string; label: string }>(
    `SELECT id, seller_id, proposed_value, label FROM canonical_corrections WHERE product_id = $1 AND attribute_key = $2 AND proposed_norm = $3 AND status = 'pending'`,
    [canonicalId, attributeKey, proposedNorm]
  );
  const sellers = new Set(agreeing.map((c) => c.seller_id));
  if (sellers.size < SELLER_AUTO_PROMOTE_AT) return;
  const locked = await queryOne<{ locked_by_admin: boolean }>(`SELECT locked_by_admin FROM canonical_specs WHERE product_id = $1 AND attribute_key = $2`, [canonicalId, attributeKey]);
  if (locked?.locked_by_admin) return;
  const reason = `${sellers.size} sellers independently reported ${agreeing[0].proposed_value}`;
  for (const c of agreeing) await query(`UPDATE canonical_corrections SET status = 'approved', decided_by = NULL, decided_at = now(), reason = $2 WHERE id = $1 AND status = 'pending'`, [c.id, reason]);
  for (const c of agreeing) await recordSource(canonicalId, attributeKey, c.label, c.proposed_value, null, { type: 'seller', tier: 4, sellerId: c.seller_id });
}

export async function approveCorrections(ids: string[], by: { adminId: string | null; reason?: string }) {
  const rows = await query<{ id: string; product_id: string; attribute_key: string; label: string; proposed_value: string; proposed_norm: string; seller_id: string }>(
    `SELECT id, product_id, attribute_key, label, proposed_value, proposed_norm, seller_id FROM canonical_corrections WHERE id = ANY($1) AND status = 'pending'`,
    [ids]
  );
  for (const c of rows) {
    await query(`UPDATE canonical_corrections SET status = 'approved', decided_by = $2, decided_at = now(), reason = $3 WHERE id = $1 AND status = 'pending'`, [c.id, by.adminId, by.reason ?? null]);
    await query(`UPDATE canonical_corrections SET status = 'superseded', decided_at = now() WHERE product_id = $1 AND attribute_key = $2 AND status = 'pending' AND proposed_norm = $3`, [c.product_id, c.attribute_key, c.proposed_norm]);
    if (by.adminId) {
      await setSpecByAdmin(c.product_id, c.attribute_key, c.label, c.proposed_value, null, by.adminId);
      await recordSource(c.product_id, c.attribute_key, c.label, c.proposed_value, null, { type: 'seller', tier: 4, sellerId: c.seller_id });
    } else {
      await query(`DELETE FROM canonical_spec_sources WHERE product_id = $1 AND attribute_key = $2 AND source_type IN ('manufacturer', 'retailer', 'unknown') AND value_norm <> $3`, [c.product_id, c.attribute_key, c.proposed_norm]);
      await recordSource(c.product_id, c.attribute_key, c.label, c.proposed_value, null, { type: 'seller', tier: 4, sellerId: c.seller_id });
    }
  }
  return rows.length;
}

export async function rejectCorrections(ids: string[], by: { adminId: string; reason?: string }) {
  const res = await query(`UPDATE canonical_corrections SET status = 'rejected', decided_by = $2, decided_at = now(), reason = $3 WHERE id = ANY($1) AND status = 'pending' RETURNING id`, [ids, by.adminId, by.reason ?? null]);
  return res.length;
}

export async function setSpecByAdmin(productId: string, attributeKey: string, label: string, value: string, unit: string | null, adminId: string) {
  await query(`DELETE FROM canonical_spec_sources WHERE product_id = $1 AND attribute_key = $2 AND source_type = 'admin'`, [productId, attributeKey]);
  await query(`UPDATE canonical_specs SET locked_by_admin = FALSE WHERE product_id = $1 AND attribute_key = $2`, [productId, attributeKey]);
  await recordSource(productId, attributeKey, label, value, unit, { type: 'admin', tier: 1, adminId });
  await query(`UPDATE canonical_specs SET locked_by_admin = TRUE, status = 'verified', confidence = 1, label = $3, updated_at = now() WHERE product_id = $1 AND attribute_key = $2`, [productId, attributeKey, label.slice(0, 60)]);
  await query(`UPDATE canonical_corrections SET status = 'superseded', decided_by = $3, decided_at = now() WHERE product_id = $1 AND attribute_key = $2 AND status = 'pending'`, [productId, attributeKey, adminId]);
  return queryOne<CanonicalSpecRow>(`SELECT * FROM canonical_specs WHERE product_id = $1 AND attribute_key = $2`, [productId, attributeKey]);
}

export async function removeSpec(productId: string, attributeKey: string) {
  await query(`DELETE FROM canonical_spec_sources WHERE product_id = $1 AND attribute_key = $2`, [productId, attributeKey]);
  await query(`DELETE FROM canonical_specs WHERE product_id = $1 AND attribute_key = $2`, [productId, attributeKey]);
}

export async function verifiedSpecsForListings(listingIds: string[]): Promise<Record<string, { key: string; label: string; value: string; unit: string | null; confidence: number }[]>> {
  if (listingIds.length === 0) return {};
  const rows = await query<{ listing_id: string; attribute_key: string; label: string; value: string; unit: string | null; confidence: number }>(
    `SELECT p.id AS listing_id, cs.attribute_key, cs.label, cs.value, cs.unit, cs.confidence
       FROM seller_products p JOIN canonical_specs cs ON cs.product_id = p.canonical_product_id
      WHERE p.id = ANY($1) AND cs.status = 'verified' AND cs.confidence >= $2
        AND NOT EXISTS (SELECT 1 FROM seller_product_attributes spa WHERE spa.product_id = p.id AND spa.attribute_key = cs.attribute_key)
      ORDER BY cs.confidence DESC, cs.label`,
    [listingIds, VERIFIED_AT]
  );
  const out: Record<string, { key: string; label: string; value: string; unit: string | null; confidence: number }[]> = {};
  for (const r of rows) (out[r.listing_id] ??= []).push({ key: r.attribute_key, label: r.label, value: r.value, unit: r.unit, confidence: Number(r.confidence) });
  return out;
}
