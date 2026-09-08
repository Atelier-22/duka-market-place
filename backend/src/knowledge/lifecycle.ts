import { query, queryOne } from '../db/pool';
import { CANONICAL_CATALOGUE, CURRENT_GENERATIONS_BY_CATEGORY, DEFAULT_CURRENT_GENERATIONS } from './canonicalCatalogue';
import { findKind } from './knowledge.model';
import { normalizeValue, slugify } from './normalize';
import { CANONICAL_DETAILS } from './canonicalSpecs';


export type Lifecycle = 'current' | 'discontinued' | 'unknown';

export function currentGenerationsFor(category: string): number {
  const fromEnv = Number(process.env.CANONICAL_CURRENT_GENERATIONS ?? '');
  const base = Number.isInteger(fromEnv) && fromEnv >= 1 ? fromEnv : DEFAULT_CURRENT_GENERATIONS;
  const perCategory = CURRENT_GENERATIONS_BY_CATEGORY[category];
  if (perCategory === undefined) return base;
  return Number.isInteger(fromEnv) && fromEnv >= 1 ? Math.max(perCategory, Math.min(base, perCategory + (base - DEFAULT_CURRENT_GENERATIONS))) : perCategory;
}

export function computeLifecycles(products: { id: string; category: string; released_on: string | null; lifecycle_override: string | null }[]): Map<string, Lifecycle> {
  const out = new Map<string, Lifecycle>();
  const years = [...new Set(products.filter((p) => p.released_on).map((p) => Number(String(p.released_on).slice(0, 4))))].sort((a, b) => b - a);
  const category = products[0]?.category ?? 'general';
  const keep = currentGenerationsFor(category);
  for (const p of products) {
    if (p.lifecycle_override === 'current' || p.lifecycle_override === 'discontinued') { out.set(p.id, p.lifecycle_override); continue; }
    if (!p.released_on) { out.set(p.id, 'unknown'); continue; }
    const year = Number(String(p.released_on).slice(0, 4));
    out.set(p.id, years.indexOf(year) < keep ? 'current' : 'discontinued');
  }
  return out;
}

export async function recomputeFamily(brandSlug: string, familySlug: string | null) {
  const rows = await query<{ id: string; category: string; released_on: string | null; lifecycle_override: string | null; lifecycle: string }>(
    familySlug
      ? `SELECT id, category, released_on::text, lifecycle_override, lifecycle FROM canonical_products WHERE brand_slug = $1 AND family_slug = $2 AND status <> 'merged'`
      : `SELECT id, category, released_on::text, lifecycle_override, lifecycle FROM canonical_products WHERE brand_slug = $1 AND family_slug IS NULL AND status <> 'merged'`,
    familySlug ? [brandSlug, familySlug] : [brandSlug]
  );
  if (rows.length === 0) return;
  const byCategory = new Map<string, typeof rows>();
  for (const r of rows) byCategory.set(r.category, [...(byCategory.get(r.category) ?? []), r]);
  for (const group of byCategory.values()) {
    const computed = computeLifecycles(group);
    for (const r of group) {
      const next = computed.get(r.id) ?? 'unknown';
      if (next !== r.lifecycle) await query(`UPDATE canonical_products SET lifecycle = $2, updated_at = now() WHERE id = $1`, [r.id, next]);
    }
  }
}

export async function recomputeAllLifecycles() {
  const families = await query<{ brand_slug: string; family_slug: string | null }>(`SELECT DISTINCT brand_slug, family_slug FROM canonical_products WHERE status <> 'merged'`);
  for (const f of families) await recomputeFamily(f.brand_slug, f.family_slug);
}

export async function seedCanonicalCatalogue(): Promise<number> {
  let inserted = 0;
  const kindCache = new Map<string, string | null>();
  for (const item of CANONICAL_CATALOGUE) {
    const cacheKey = `${item.category}|${item.kind}`;
    if (!kindCache.has(cacheKey)) kindCache.set(cacheKey, (await findKind(item.category, item.kind))?.id ?? null);
    const kindId = kindCache.get(cacheKey) ?? null;
    const brandSlug = slugify(item.brand);
    const modelSlug = slugify(item.model);
    if (!brandSlug || !modelSlug) continue;
    const row = await queryOne<{ inserted: boolean }>(
      `INSERT INTO canonical_products (brand, brand_slug, model, model_slug, category, kind_id, display_name, created_by, family, family_slug, released_on, aliases)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'system', $8, $9, $10, $11)
       ON CONFLICT (brand_slug, model_slug) DO UPDATE SET
         family = COALESCE(canonical_products.family, EXCLUDED.family),
         family_slug = COALESCE(canonical_products.family_slug, EXCLUDED.family_slug),
         released_on = COALESCE(canonical_products.released_on, EXCLUDED.released_on),
         kind_id = COALESCE(canonical_products.kind_id, EXCLUDED.kind_id),
         aliases = CASE WHEN cardinality(canonical_products.aliases) = 0 THEN EXCLUDED.aliases ELSE canonical_products.aliases END,
         updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [item.brand, brandSlug, item.model, modelSlug, item.category, kindId, `${item.brand} ${item.model}`.slice(0, 200), item.family, slugify(item.family), item.releasedOn, item.aliases ?? []]
    );
    if (row?.inserted) inserted += 1;
  }
  await recomputeAllLifecycles();
  return inserted;
}

export async function seedCatalogueDetails(): Promise<{ products: number; specs: number; variants: number }> {
  const known = await query<{ id: string; brand_slug: string; model_slug: string }>(`SELECT id, brand_slug, model_slug FROM canonical_products WHERE status <> 'merged'`);
  const byKey = new Map(known.map((k) => [`${k.brand_slug}|${k.model_slug}`, k.id]));
  const seeded = new Set((await query<{ product_id: string }>(`SELECT DISTINCT product_id FROM canonical_spec_sources WHERE source_type = 'catalogue'`)).map((r) => r.product_id));
  const sourceRows: unknown[][] = [];
  const specRows: unknown[][] = [];
  const variantRows: unknown[][] = [];
  let products = 0;
  for (const detail of CANONICAL_DETAILS) {
    const id = byKey.get(`${slugify(detail.brand)}|${slugify(detail.model)}`);
    if (!id || seeded.has(id)) continue;
    products += 1;
    for (const [label, value] of Object.entries(detail.specs)) {
      const key = slugify(label);
      const norm = normalizeValue(value).slice(0, 200);
      sourceRows.push([id, key, value.slice(0, 200), norm, 'catalogue', 1, 'Duka catalogue']);
      specRows.push([id, key, label.slice(0, 60), value.slice(0, 200), norm, 0.85, 'verified', 1, 1]);
    }
    (detail.colours ?? []).forEach((colour, i) => variantRows.push([id, 'colour', colour.name, normalizeValue(colour.name).slice(0, 80), colour.hex, i]));
    (detail.storage ?? []).forEach((value, i) => variantRows.push([id, 'storage', value, normalizeValue(value).slice(0, 80), null, i]));
    (detail.sizes ?? []).forEach((value, i) => variantRows.push([id, 'size', value, normalizeValue(value).slice(0, 80), null, i]));
  }
  const bulk = async (table: string, columns: string[], rows: unknown[][], conflict: string) => {
    for (let i = 0; i < rows.length; i += 300) {
      const slice = rows.slice(i, i + 300);
      const params: unknown[] = [];
      const values = slice.map((row) => `(${row.map((v) => { params.push(v); return `$${params.length}`; }).join(', ')})`).join(', ');
      await query(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values} ${conflict}`, params);
    }
  };
  await bulk('canonical_spec_sources', ['product_id', 'attribute_key', 'value', 'value_norm', 'source_type', 'trust_tier', 'source_title'], sourceRows, 'ON CONFLICT DO NOTHING');
  await bulk('canonical_specs', ['product_id', 'attribute_key', 'label', 'value', 'value_norm', 'confidence', 'status', 'source_count', 'best_tier'], specRows, 'ON CONFLICT (product_id, attribute_key) DO NOTHING');
  await bulk('canonical_variants', ['product_id', 'dimension', 'value', 'value_norm', 'display_hex', 'position'], variantRows, 'ON CONFLICT (product_id, dimension, value_norm) DO NOTHING');
  invalidateSearchIndex();
  return { products, specs: specRows.length, variants: variantRows.length };
}

export async function seedCatalogueDetailsIfMissing(): Promise<boolean> {
  const row = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM canonical_spec_sources WHERE source_type = 'catalogue'`).catch(() => null);
  if (!row || row.n > 0) return false;
  const counts = await seedCatalogueDetails();
  console.log(`[knowledge] seeded details for ${counts.products} catalogue products: ${counts.specs} specs, ${counts.variants} variants`);
  return true;
}

export async function seedCanonicalCatalogueIfEmpty(): Promise<boolean> {
  const row = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM canonical_products WHERE created_by = 'system'`).catch(() => null);
  if (!row || row.n > 0) return false;
  const n = await seedCanonicalCatalogue();
  console.log(`[knowledge] seeded ${n} catalogue products`);
  return true;
}

export async function ensureCatalogue() {
  await seedCanonicalCatalogueIfEmpty();
  await seedCatalogueDetailsIfMissing();
}

export interface SearchHit {
  id: string; brand: string; model: string; family: string | null; displayName: string; category: string; kind: string | null;
  releasedOn: string | null; lifecycle: Lifecycle; specCount: number; colourCount: number; listingCount: number;
}

interface IndexEntry extends SearchHit { words: string[]; text: string }

let index: { loadedAt: number; entries: IndexEntry[] } | null = null;
const INDEX_TTL = 60_000;

export function invalidateSearchIndex() { index = null; }

async function loadIndex(): Promise<IndexEntry[]> {
  if (index && Date.now() - index.loadedAt < INDEX_TTL) return index.entries;
  const rows = await query<{ id: string; brand: string; model: string; family: string | null; display_name: string; category: string; kind: string | null; released_on: string | null; lifecycle: Lifecycle; lifecycle_override: Lifecycle | null; aliases: string[]; listing_count: number; spec_count: number; colour_count: number }>(
    `SELECT cp.id, cp.brand, cp.model, cp.family, cp.display_name, cp.category, k.name AS kind, cp.released_on::text, cp.lifecycle, cp.lifecycle_override, cp.aliases, cp.listing_count,
            (SELECT count(*)::int FROM canonical_specs s WHERE s.product_id = cp.id AND s.status IN ('verified', 'pending')) AS spec_count,
            (SELECT count(*)::int FROM canonical_variants v WHERE v.product_id = cp.id AND v.dimension = 'colour') AS colour_count
       FROM canonical_products cp LEFT JOIN product_kinds k ON k.id = cp.kind_id
      WHERE cp.status = 'active' ORDER BY cp.released_on DESC NULLS LAST, cp.display_name LIMIT 5000`
  );
  const entries: IndexEntry[] = rows.map((r) => {
    const text = normalizeValue([r.brand, r.family ?? '', r.model, r.kind ?? '', ...(r.aliases ?? [])].join(' ')).replace(/[()]/g, ' ');
    return {
      id: r.id, brand: r.brand, model: r.model, family: r.family, displayName: r.display_name, category: r.category, kind: r.kind, releasedOn: r.released_on,
      lifecycle: r.lifecycle_override ?? r.lifecycle, specCount: Number(r.spec_count), colourCount: Number(r.colour_count), listingCount: Number(r.listing_count), words: text.split(/[\s/,-]+/).filter(Boolean), text,
    };
  });
  index = { loadedAt: Date.now(), entries };
  return entries;
}

const LIFECYCLE_ORDER: Record<Lifecycle, number> = { current: 0, unknown: 1, discontinued: 2 };

export async function searchCanonical(q: string, limit = 60): Promise<{ total: number; hits: SearchHit[] }> {
  const tokens = normalizeValue(q).replace(/[()]/g, ' ').split(/[\s/,-]+/).filter(Boolean);
  if (tokens.length === 0) return { total: 0, hits: [] };
  const entries = await loadIndex();
  const scored: { entry: IndexEntry; score: number }[] = [];
  for (const entry of entries) {
    let score = 0;
    let ok = true;
    for (const token of tokens) {
      const exact = entry.words.includes(token);
      const prefix = exact || entry.words.some((w) => w.startsWith(token));
      const inside = prefix || (token.length >= 3 && entry.text.includes(token));
      if (!inside) { ok = false; break; }
      score += exact ? 3 : prefix ? 2 : 1;
    }
    if (!ok) continue;
    if (normalizeValue(entry.brand) === tokens.join(' ')) score += 2;
    scored.push({ entry, score });
  }
  scored.sort((a, b) => b.score - a.score || LIFECYCLE_ORDER[a.entry.lifecycle] - LIFECYCLE_ORDER[b.entry.lifecycle] || (b.entry.releasedOn ?? '').localeCompare(a.entry.releasedOn ?? '') || a.entry.displayName.localeCompare(b.entry.displayName));
  return { total: scored.length, hits: scored.slice(0, limit).map(({ entry }) => ({ id: entry.id, brand: entry.brand, model: entry.model, family: entry.family, displayName: entry.displayName, category: entry.category, kind: entry.kind, releasedOn: entry.releasedOn, lifecycle: entry.lifecycle, specCount: entry.specCount, colourCount: entry.colourCount, listingCount: entry.listingCount })) };
}

export async function lifecycleFor(brand: string | null | undefined, model: string | null | undefined): Promise<{ id: string; lifecycle: Lifecycle; displayName: string } | null> {
  if (!brand?.trim() || !model?.trim()) return null;
  const row = await queryOne<{ id: string; lifecycle: Lifecycle; lifecycle_override: Lifecycle | null; display_name: string; merged_into: string | null }>(
    `SELECT id, lifecycle, lifecycle_override, display_name, merged_into FROM canonical_products WHERE brand_slug = $1 AND model_slug = $2`,
    [slugify(brand), slugify(model)]
  );
  if (!row) return null;
  return { id: row.id, lifecycle: row.lifecycle_override ?? row.lifecycle, displayName: row.display_name };
}
