import { query, queryOne } from '../db/pool';
import { CATEGORY_LABELS, STORE_CATEGORIES } from '../seller/categories';
import { normalizeValue, slugify } from './normalize';

export interface KindRow {
  id: string; category: string; name: string; slug: string; version_type: string | null; is_default: boolean;
  status: string; source: string; confidence: number; observation_count: number; seller_count: number; merged_into: string | null; position: number; last_observed_at: string | null;
}

export interface AttributeRow {
  id: string; key: string; name: string; type: string; unit: string | null; status: string; source: string; confidence: number;
  observation_count: number; seller_count: number; merged_into: string | null; last_observed_at: string | null;
}

export interface OptionRow {
  id: string; attribute_id: string; kind_id: string | null; category: string | null; brand_slug: string | null; value: string; value_norm: string;
  display_hex: string | null; position: number; status: string; source: string; confidence: number; observation_count: number; seller_count: number; merged_into: string | null; last_observed_at: string | null;
}

export interface FormAttribute { key: string; name: string; type: string; unit: string | null; role: 'required' | 'optional'; options: string[] }

export interface FormKnowledge {
  category: string;
  kinds: { id: string; name: string; versionType: string | null; status: string }[];
  kind: { id: string; name: string; isDefault: boolean } | null;
  versionType: string;
  versionKey: string | null;
  versions: string[];
  attributes: FormAttribute[];
  brands: string[];
  colours: { name: string; hex: string | null }[];
  colourTitle: string;
  palette: { name: string; hex: string | null }[];
}

async function followMerge<T extends { id: string; merged_into: string | null }>(table: string, row: T | null, depth = 0): Promise<T | null> {
  if (!row || !row.merged_into || depth > 5) return row;
  const target = await queryOne<T>(`SELECT * FROM ${table} WHERE id = $1`, [row.merged_into]);
  return followMerge(table, target, depth + 1);
}

export async function defaultKind(category: string): Promise<KindRow | null> {
  return queryOne<KindRow>(`SELECT * FROM product_kinds WHERE category = $1 AND is_default ORDER BY created_at LIMIT 1`, [category]);
}

export async function findKind(category: string, name: string | null | undefined, opts: { includeCandidates?: boolean } = {}): Promise<KindRow | null> {
  const wanted = (name ?? '').trim();
  if (!wanted) return null;
  const statuses = opts.includeCandidates ? ['active', 'candidate', 'deprecated'] : ['active', 'deprecated'];
  const slug = slugify(wanted);
  const slugs = [slug, slug.endsWith('s') ? slug.slice(0, -1) : `${slug}s`, slug.endsWith('es') ? slug.slice(0, -2) : `${slug}es`];
  const direct = await queryOne<KindRow>(
    `SELECT * FROM product_kinds WHERE category = $1 AND NOT is_default AND (slug = ANY($2) OR lower(name) = $3) AND status = ANY($4) ORDER BY (status = 'active') DESC, (slug = $5) DESC LIMIT 1`,
    [category, slugs, wanted.toLowerCase(), statuses, slug]
  );
  if (direct) return followMerge('product_kinds', direct);
  const viaSynonym = await queryOne<KindRow>(
    `SELECT k.* FROM product_synonyms s JOIN product_kinds k ON k.id = s.entity_id
      WHERE s.entity_type = 'kind' AND s.status = 'active' AND s.term_norm = $1 AND k.category = $2 AND k.status = ANY($3) LIMIT 1`,
    [normalizeValue(wanted), category, statuses]
  );
  return followMerge('product_kinds', viaSynonym);
}

export async function findKindAnywhere(name: string, opts: { includeCandidates?: boolean } = {}): Promise<KindRow | null> {
  const wanted = name.trim();
  if (!wanted) return null;
  const statuses = opts.includeCandidates ? ['active', 'candidate', 'deprecated'] : ['active', 'deprecated'];
  const slug = slugify(wanted);
  const direct = await queryOne<KindRow>(
    `SELECT * FROM product_kinds WHERE NOT is_default AND (slug = $1 OR lower(name) = $2) AND status = ANY($3) ORDER BY observation_count DESC LIMIT 1`,
    [slug, wanted.toLowerCase(), statuses]
  );
  if (direct) return followMerge('product_kinds', direct);
  const viaSynonym = await queryOne<KindRow>(
    `SELECT k.* FROM product_synonyms s JOIN product_kinds k ON k.id = s.entity_id
      WHERE s.entity_type = 'kind' AND s.status = 'active' AND s.term_norm = $1 AND k.status = ANY($2) ORDER BY k.observation_count DESC LIMIT 1`,
    [normalizeValue(wanted), statuses]
  );
  return followMerge('product_kinds', viaSynonym);
}

export async function findAttribute(label: string, opts: { includeCandidates?: boolean } = {}): Promise<AttributeRow | null> {
  const statuses = opts.includeCandidates ? ['active', 'candidate', 'deprecated'] : ['active', 'deprecated'];
  const key = slugify(label);
  const direct = await queryOne<AttributeRow>(`SELECT * FROM product_attributes WHERE (key = $1 OR lower(name) = $2) AND status = ANY($3) ORDER BY (status = 'active') DESC LIMIT 1`, [key, label.trim().toLowerCase(), statuses]);
  if (direct) return followMerge('product_attributes', direct);
  const viaSynonym = await queryOne<AttributeRow>(
    `SELECT a.* FROM product_synonyms s JOIN product_attributes a ON a.id = s.entity_id WHERE s.entity_type = 'attribute' AND s.status = 'active' AND s.term_norm = $1 AND a.status = ANY($2) LIMIT 1`,
    [normalizeValue(label), statuses]
  );
  return followMerge('product_attributes', viaSynonym);
}

export async function findBrand(name: string, opts: { includeCandidates?: boolean } = {}): Promise<{ id: string; name: string; slug: string; status: string; merged_into: string | null } | null> {
  const wanted = name.trim();
  if (!wanted) return null;
  const statuses = opts.includeCandidates ? ['active', 'candidate', 'deprecated'] : ['active', 'deprecated'];
  const direct = await queryOne<{ id: string; name: string; slug: string; status: string; merged_into: string | null }>(
    `SELECT id, name, slug, status, merged_into FROM product_brands WHERE (slug = $1 OR lower(name) = $2) AND status = ANY($3) ORDER BY (status = 'active') DESC LIMIT 1`,
    [slugify(wanted), wanted.toLowerCase(), statuses]
  );
  if (direct) return followMerge('product_brands', direct);
  const viaSynonym = await queryOne<{ id: string; name: string; slug: string; status: string; merged_into: string | null }>(
    `SELECT b.id, b.name, b.slug, b.status, b.merged_into FROM product_synonyms s JOIN product_brands b ON b.id = s.entity_id
      WHERE s.entity_type = 'brand' AND s.status = 'active' AND s.term_norm = $1 AND b.status = ANY($2) LIMIT 1`,
    [normalizeValue(wanted), statuses]
  );
  return followMerge('product_brands', viaSynonym);
}

export async function brandFromText(text: string): Promise<{ id: string; name: string; slug: string } | null> {
  const norm = ` ${normalizeValue(text)} `;
  const rows = await query<{ id: string; name: string; slug: string; term: string }>(
    `SELECT b.id, b.name, b.slug, lower(b.name) AS term FROM product_brands b WHERE b.status = 'active'
     UNION ALL
     SELECT b.id, b.name, b.slug, s.term_norm AS term FROM product_synonyms s JOIN product_brands b ON b.id = s.entity_id WHERE s.entity_type = 'brand' AND s.status = 'active' AND b.status = 'active'`
  );
  let best: { id: string; name: string; slug: string; term: string } | null = null;
  for (const row of rows) {
    if (row.term.length < 2) continue;
    if (norm.includes(` ${row.term} `) && (!best || row.term.length > best.term.length)) best = row;
  }
  return best ? { id: best.id, name: best.name, slug: best.slug } : null;
}

async function variantAttributeFor(kindId: string): Promise<AttributeRow | null> {
  return queryOne<AttributeRow>(
    `SELECT a.* FROM product_kind_attributes ka JOIN product_attributes a ON a.id = ka.attribute_id
      WHERE ka.kind_id = $1 AND ka.role = 'variant' AND a.type <> 'colour' AND ka.status IN ('active', 'candidate') AND a.status = 'active'
      ORDER BY (ka.status = 'active') DESC, ka.position LIMIT 1`,
    [kindId]
  );
}

async function optionsFor(attributeId: string, scope: { kindId?: string | null; category?: string | null; brandSlug?: string | null; global?: boolean }, limit = 60): Promise<OptionRow[]> {
  const conditions = ['o.attribute_id = $1', `o.status = 'active'`, 'o.merged_into IS NULL'];
  const params: unknown[] = [attributeId];
  const scopes: string[] = [];
  if (scope.kindId) { params.push(scope.kindId); scopes.push(`o.kind_id = $${params.length}`); }
  if (scope.category) { params.push(scope.category); scopes.push(`(o.kind_id IS NULL AND o.brand_slug IS NULL AND o.category = $${params.length})`); }
  if (scope.brandSlug) { params.push(scope.brandSlug); scopes.push(`(o.kind_id IS NULL AND o.brand_slug = $${params.length})`); }
  if (scope.global) scopes.push('(o.kind_id IS NULL AND o.category IS NULL AND o.brand_slug IS NULL)');
  if (scopes.length === 0) return [];
  conditions.push(`(${scopes.join(' OR ')})`);
  params.push(limit);
  return query<OptionRow>(`SELECT o.* FROM product_attribute_options o WHERE ${conditions.join(' AND ')} ORDER BY o.position, o.observation_count DESC, o.value LIMIT $${params.length}`, params);
}

function dedupeValues(rows: { value: string; value_norm: string }[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of rows) {
    if (seen.has(r.value_norm)) continue;
    seen.add(r.value_norm);
    out.push(r.value);
  }
  return out;
}

export async function resolveForm(category: string, kindName: string, brandName: string): Promise<FormKnowledge> {
  const [kinds, fallback] = await Promise.all([
    query<KindRow>(`SELECT * FROM product_kinds WHERE category = $1 AND NOT is_default AND status = 'active' AND merged_into IS NULL ORDER BY position, observation_count DESC, name`, [category]),
    defaultKind(category),
  ]);
  const matched = await findKind(category, kindName);
  const kind = matched ?? fallback;
  const colourAttr = await findAttribute('Colour');
  const brand = brandName.trim() ? await findBrand(brandName) ?? await brandFromText(brandName) : null;

  let versionType = kind?.version_type ?? fallback?.version_type ?? 'Option';
  let versions: string[] = [];
  let versionKey: string | null = null;
  if (kind) {
    const variant = await variantAttributeFor(kind.id);
    if (variant) {
      versionKey = variant.key;
      versionType = kind.version_type ?? variant.name;
      versions = dedupeValues(await optionsFor(variant.id, { kindId: kind.id }));
      if (versions.length === 0 && fallback && fallback.id !== kind.id) versions = dedupeValues(await optionsFor(variant.id, { kindId: fallback.id }));
    }
  }

  const attributes: FormAttribute[] = [];
  if (kind) {
    const links = await query<AttributeRow & { role: string; link_status: string }>(
      `SELECT a.*, ka.role, ka.status AS link_status FROM product_kind_attributes ka JOIN product_attributes a ON a.id = ka.attribute_id
        WHERE ka.kind_id = $1 AND ka.status = 'active' AND a.status = 'active' AND a.merged_into IS NULL AND ka.role <> 'variant' AND a.key NOT IN ('brand', 'model', 'colour')
        ORDER BY (ka.role = 'required') DESC, ka.position, ka.observation_count DESC LIMIT 30`,
      [kind.id]
    );
    for (const link of links) {
      const opts = ['select', 'multi_select', 'year'].includes(link.type) ? dedupeValues(await optionsFor(link.id, { kindId: kind.id, category, global: true }, 40)) : [];
      attributes.push({ key: link.key, name: link.name, type: link.type, unit: link.unit, role: link.role === 'required' ? 'required' : 'optional', options: opts });
    }
  }

  const brandRows = await query<{ name: string }>(
    `SELECT b.name FROM product_brand_categories bc JOIN product_brands b ON b.id = bc.brand_id
      WHERE bc.category = $1 AND b.status = 'active' AND b.merged_into IS NULL ORDER BY bc.observation_count DESC, b.name LIMIT 30`,
    [category]
  );

  let colours: OptionRow[] = [];
  let colourTitle = '';
  if (colourAttr) {
    if (brand) {
      colours = await optionsFor(colourAttr.id, { brandSlug: brand.slug });
      if (colours.length) colourTitle = `${brand.name} colours`;
    }
    if (colours.length === 0 && kind) {
      const kindScoped = await optionsFor(colourAttr.id, { kindId: kind.id });
      const categoryScoped = await optionsFor(colourAttr.id, { category });
      colours = [...kindScoped, ...categoryScoped];
      if (colours.length) colourTitle = `${kind.is_default ? CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS] ?? category : kind.name} colours`;
    }
  }
  const palette = colourAttr ? await optionsFor(colourAttr.id, { global: true }) : [];
  const seenColours = new Set<string>();
  const colourList = colours.filter((c) => { if (seenColours.has(c.value_norm)) return false; seenColours.add(c.value_norm); return true; });

  return {
    category,
    kinds: kinds.map((k) => ({ id: k.id, name: k.name, versionType: k.version_type, status: k.status })),
    kind: kind ? { id: kind.id, name: kind.name, isDefault: kind.is_default } : null,
    versionType,
    versionKey,
    versions,
    attributes,
    brands: brandRows.map((b) => b.name),
    colours: colourList.map((c) => ({ name: c.value, hex: c.display_hex })),
    colourTitle,
    palette: palette.filter((p) => !seenColours.has(p.value_norm)).map((c) => ({ name: c.value, hex: c.display_hex })),
  };
}

export async function categoryOverview() {
  const counts = await query<{ category: string; kinds: number }>(`SELECT category, count(*)::int AS kinds FROM product_kinds WHERE status = 'active' AND NOT is_default GROUP BY category`);
  const map = new Map(counts.map((c) => [c.category, c.kinds]));
  return STORE_CATEGORIES.map((key) => ({ key, label: CATEGORY_LABELS[key], kinds: map.get(key) ?? 0 }));
}

export interface FilterFacet { key: string; name: string; type: string; unit: string | null; values: { value: string; count: number; hex: string | null }[] }

export async function filtersFor(category: string | null, kindName: string | null): Promise<FilterFacet[]> {
  const params: unknown[] = [];
  const conditions = [`p.status = 'published'`, `p.flagged_at IS NULL`, `s.status = 'active'`, `spa.confidence >= 0.9`];
  if (category) { params.push(category); conditions.push(`p.category = $${params.length}`); }
  if (kindName) { params.push(kindName.toLowerCase()); conditions.push(`lower(coalesce(p.subcategory, '')) = $${params.length}`); }
  const rows = await query<{ attribute_key: string; name: string; type: string; unit: string | null; value: string; value_norm: string; n: number }>(
    `SELECT spa.attribute_key, coalesce(a.name, spa.label) AS name, coalesce(a.type, 'select') AS type, a.unit, min(spa.value) AS value, spa.value_norm, count(DISTINCT p.id)::int AS n
       FROM seller_product_attributes spa
       JOIN seller_products p ON p.id = spa.product_id
       JOIN seller_stores s ON s.id = p.store_id
       LEFT JOIN product_attributes a ON a.id = spa.attribute_id
      WHERE ${conditions.join(' AND ')} AND coalesce(a.type, 'select') IN ('select', 'colour', 'year', 'multi_select', 'measurement', 'number')
      GROUP BY spa.attribute_key, a.name, spa.label, a.type, a.unit, spa.value_norm
      ORDER BY spa.attribute_key, n DESC, spa.value_norm`,
    params
  );
  const hexes = await query<{ value_norm: string; display_hex: string }>(`SELECT DISTINCT ON (value_norm) value_norm, display_hex FROM product_attribute_options WHERE display_hex IS NOT NULL ORDER BY value_norm, observation_count DESC`);
  const hexMap = new Map(hexes.map((h) => [h.value_norm, h.display_hex]));
  const facets = new Map<string, FilterFacet>();
  for (const r of rows) {
    let facet = facets.get(r.attribute_key);
    if (!facet) { facet = { key: r.attribute_key, name: r.name, type: r.type, unit: r.unit, values: [] }; facets.set(r.attribute_key, facet); }
    if (facet.values.length >= 12) continue;
    facet.values.push({ value: r.value, count: r.n, hex: r.type === 'colour' ? hexMap.get(r.value_norm) ?? null : null });
  }
  return [...facets.values()].filter((f) => f.values.length >= 1 && !['model', 'registration', 'location'].includes(f.key)).sort((a, b) => b.values.reduce((s, v) => s + v.count, 0) - a.values.reduce((s, v) => s + v.count, 0)).slice(0, 8);
}

export interface ProductAttribute { key: string; name: string; value: string; unit: string | null; type: string }

export async function attributesForProducts(productIds: string[]): Promise<Record<string, ProductAttribute[]>> {
  if (productIds.length === 0) return {};
  const rows = await query<{ product_id: string; attribute_key: string; label: string; name: string | null; value: string; unit: string | null; type: string | null }>(
    `SELECT spa.product_id, spa.attribute_key, spa.label, a.name, spa.value, coalesce(spa.unit, a.unit) AS unit, a.type
       FROM seller_product_attributes spa LEFT JOIN product_attributes a ON a.id = spa.attribute_id
      WHERE spa.product_id = ANY($1) AND spa.confidence >= 0.9
      ORDER BY spa.product_id, spa.created_at, spa.attribute_key`,
    [productIds]
  );
  const out: Record<string, ProductAttribute[]> = {};
  for (const r of rows) {
    (out[r.product_id] ??= []).push({ key: r.attribute_key, name: r.name ?? r.label, value: r.value, unit: r.unit, type: r.type ?? 'text' });
  }
  return out;
}

export async function activeColourHex(name: string): Promise<string | null> {
  const row = await queryOne<{ display_hex: string }>(`SELECT display_hex FROM product_attribute_options WHERE value_norm = $1 AND display_hex IS NOT NULL ORDER BY (status = 'active') DESC, observation_count DESC LIMIT 1`, [normalizeValue(name)]);
  return row?.display_hex ?? null;
}
