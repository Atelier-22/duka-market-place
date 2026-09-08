import { query, queryOne } from '../db/pool';
import { Tx, txQuery, withTransaction } from '../seller/db';
import { ANDROID_COLOURS, APPLE_COLOURS, CATEGORY_ENTRIES, CategoryEntry, SAMSUNG_COLOURS, SubEntry, Swatch } from './catalogue';
import { ATTRIBUTE_META, BRAND_SYNONYMS, GENERIC_PALETTE, KIND_SYNONYMS, REQUIRED_DETAILS } from './bootstrap';
import { inferAttributeType, normalizeValue, slugify } from './normalize';

interface AttrDef { key: string; name: string; type: string; unit: string | null }
interface KindDef { category: string; name: string; slug: string; versionType: string | null; isDefault: boolean; position: number }
interface LinkDef { kindSlug: string; category: string; attrKey: string; role: 'variant' | 'required' | 'optional'; position: number }
interface OptionDef { attrKey: string; kindSlug?: string; category?: string; brandSlug?: string; value: string; hex: string | null; position: number }
interface BrandDef { name: string; slug: string; categories: Set<string> }
interface SynonymDef { term: string; entityType: 'kind' | 'brand'; category?: string; kindSlug?: string; brandSlug?: string }

class Plan {
  attrs = new Map<string, AttrDef>();
  kinds = new Map<string, KindDef>();
  links = new Map<string, LinkDef>();
  options = new Map<string, OptionDef>();
  brands = new Map<string, BrandDef>();
  synonyms: SynonymDef[] = [];

  attribute(label: string, sample = ''): string {
    const meta = ATTRIBUTE_META[label];
    const key = meta ? meta.key : slugify(label);
    if (!this.attrs.has(key)) {
      const inferred = meta ?? inferAttributeType(label, sample);
      this.attrs.set(key, { key, name: meta ? label : label.trim().slice(0, 60), type: inferred.type, unit: inferred.unit ?? null });
    }
    return key;
  }

  kind(category: string, name: string, versionType: string | null, isDefault: boolean, position: number): string {
    const slug = isDefault ? `category-${category}` : slugify(name);
    const id = `${category}|${slug}`;
    if (!this.kinds.has(id)) this.kinds.set(id, { category, name, slug, versionType, isDefault, position });
    return slug;
  }

  link(category: string, kindSlug: string, attrKey: string, role: LinkDef['role'], position: number) {
    const id = `${category}|${kindSlug}|${attrKey}`;
    if (!this.links.has(id)) this.links.set(id, { kindSlug, category, attrKey, role, position });
  }

  option(def: OptionDef) {
    const id = `${def.attrKey}|${def.category ?? ''}|${def.kindSlug ?? ''}|${def.brandSlug ?? ''}|${normalizeValue(def.value)}`;
    if (!this.options.has(id)) this.options.set(id, def);
  }

  brand(name: string, category: string | null) {
    const slug = slugify(name);
    const existing = this.brands.get(slug) ?? { name, slug, categories: new Set<string>() };
    if (category) existing.categories.add(category);
    this.brands.set(slug, existing);
  }
}

function planKind(plan: Plan, entry: CategoryEntry, sub: SubEntry | null, position: number) {
  const versionType = sub?.versionType ?? entry.versionType;
  const kindSlug = plan.kind(entry.key, sub ? sub.name : entry.label, versionType, !sub, position);
  const versions = sub?.versions ?? entry.versions;
  if (versionType) {
    const variant = plan.attribute(versionType, versions[0] ?? '');
    plan.link(entry.key, kindSlug, variant, 'variant', 0);
    versions.forEach((v, i) => plan.option({ attrKey: variant, kindSlug, category: entry.key, value: v, hex: null, position: i }));
  }
  plan.link(entry.key, kindSlug, 'colour', 'variant', 1);
  const required = new Set(REQUIRED_DETAILS[entry.key] ?? []);
  (sub?.specs ?? entry.specs).forEach((label, i) => plan.link(entry.key, kindSlug, plan.attribute(label), required.has(label) ? 'required' : 'optional', 10 + i));
  (sub?.colours ?? []).forEach((c, i) => plan.option({ attrKey: 'colour', kindSlug, category: entry.key, value: c.name, hex: c.hex, position: i }));
}

function buildPlan(): Plan {
  const plan = new Plan();
  plan.attribute('Colour');
  plan.attribute('Brand');
  plan.attribute('Model');
  GENERIC_PALETTE.forEach((c, i) => plan.option({ attrKey: 'colour', value: c.name, hex: c.hex, position: i }));
  CATEGORY_ENTRIES.forEach((entry) => {
    planKind(plan, entry, null, 0);
    entry.subcategories.forEach((sub, i) => planKind(plan, entry, sub, i + 1));
    entry.colours.forEach((c, i) => plan.option({ attrKey: 'colour', category: entry.key, value: c.name, hex: c.hex, position: i }));
    entry.brands.forEach((b) => plan.brand(b, entry.key));
  });
  const range = (scope: { category?: string; brandSlug?: string }, colours: Swatch[]) => colours.forEach((c, i) => plan.option({ attrKey: 'colour', ...scope, value: c.name, hex: c.hex, position: i }));
  range({ category: 'phones' }, ANDROID_COLOURS);
  range({ brandSlug: 'apple' }, APPLE_COLOURS);
  range({ brandSlug: 'samsung' }, SAMSUNG_COLOURS);
  for (const syn of KIND_SYNONYMS) for (const term of syn.terms) plan.synonyms.push({ term, entityType: 'kind', category: syn.category, kindSlug: slugify(syn.kind) });
  for (const syn of BRAND_SYNONYMS) {
    plan.brand(syn.brand, null);
    for (const term of syn.terms) plan.synonyms.push({ term, entityType: 'brand', brandSlug: slugify(syn.brand) });
  }
  return plan;
}

async function bulkInsert(tx: Tx, table: string, columns: string[], rows: unknown[][], conflict: string, chunk = 400) {
  for (let i = 0; i < rows.length; i += chunk) {
    const slice = rows.slice(i, i + chunk);
    const params: unknown[] = [];
    const values = slice.map((row) => `(${row.map((v) => { params.push(v); return `$${params.length}`; }).join(', ')})`).join(', ');
    await txQuery(tx, `INSERT INTO ${table} (${columns.join(', ')}) VALUES ${values} ${conflict}`, params);
  }
}

export async function seedKnowledge(): Promise<{ kinds: number; attributes: number; options: number; brands: number }> {
  const plan = buildPlan();
  await withTransaction(async (tx) => {
    await bulkInsert(tx, 'product_attributes', ['key', 'name', 'type', 'unit', 'status', 'source', 'confidence'],
      [...plan.attrs.values()].map((a) => [a.key, a.name, a.type, a.unit, 'active', 'bootstrap', 1]), 'ON CONFLICT (key) DO NOTHING');
    const attrIds = new Map((await txQuery<{ id: string; key: string }>(tx, `SELECT id, key FROM product_attributes`)).map((r) => [r.key, r.id]));

    await bulkInsert(tx, 'product_kinds', ['category', 'name', 'slug', 'version_type', 'is_default', 'status', 'source', 'confidence', 'position'],
      [...plan.kinds.values()].map((k) => [k.category, k.name, k.slug, k.versionType, k.isDefault, 'active', 'bootstrap', 1, k.position]), 'ON CONFLICT (category, slug) DO NOTHING');
    const kindIds = new Map((await txQuery<{ id: string; category: string; slug: string }>(tx, `SELECT id, category, slug FROM product_kinds`)).map((r) => [`${r.category}|${r.slug}`, r.id]));

    await bulkInsert(tx, 'product_kind_attributes', ['kind_id', 'attribute_id', 'role', 'position', 'status', 'source', 'confidence'],
      [...plan.links.values()].map((l) => [kindIds.get(`${l.category}|${l.kindSlug}`), attrIds.get(l.attrKey), l.role, l.position, 'active', 'bootstrap', 1]).filter((r) => r[0] && r[1]),
      'ON CONFLICT (kind_id, attribute_id) DO NOTHING');

    await bulkInsert(tx, 'product_attribute_options', ['attribute_id', 'kind_id', 'category', 'brand_slug', 'value', 'value_norm', 'display_hex', 'position', 'status', 'source', 'confidence'],
      [...plan.options.values()].map((o) => [attrIds.get(o.attrKey), o.kindSlug ? kindIds.get(`${o.category}|${o.kindSlug}`) ?? null : null, o.kindSlug ? null : o.category ?? null, o.brandSlug ?? null, o.value.slice(0, 80), normalizeValue(o.value).slice(0, 80), o.hex, o.position, 'active', 'bootstrap', 1]).filter((r) => r[0]),
      'ON CONFLICT DO NOTHING');

    await bulkInsert(tx, 'product_brands', ['name', 'slug', 'status', 'source', 'confidence'],
      [...plan.brands.values()].map((b) => [b.name, b.slug, 'active', 'bootstrap', 1]), 'ON CONFLICT (slug) DO NOTHING');
    const brandIds = new Map((await txQuery<{ id: string; slug: string }>(tx, `SELECT id, slug FROM product_brands`)).map((r) => [r.slug, r.id]));
    await bulkInsert(tx, 'product_brand_categories', ['brand_id', 'category'],
      [...plan.brands.values()].flatMap((b) => [...b.categories].map((c) => [brandIds.get(b.slug), c])).filter((r) => r[0]), 'ON CONFLICT DO NOTHING');

    await bulkInsert(tx, 'product_synonyms', ['term', 'term_norm', 'entity_type', 'entity_id'],
      plan.synonyms.map((s) => [s.term, normalizeValue(s.term), s.entityType, s.entityType === 'kind' ? kindIds.get(`${s.category}|${s.kindSlug}`) : brandIds.get(s.brandSlug!)]).filter((r) => r[3]),
      'ON CONFLICT DO NOTHING');
  });
  const [kinds, attributes, options, brands] = await Promise.all([
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_kinds`),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_attributes`),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_attribute_options`),
    queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_brands`),
  ]);
  return { kinds: kinds?.n ?? 0, attributes: attributes?.n ?? 0, options: options?.n ?? 0, brands: brands?.n ?? 0 };
}

export async function seedKnowledgeIfEmpty(): Promise<boolean> {
  const existing = await query<{ n: number }>(`SELECT count(*)::int AS n FROM product_attributes`).catch(() => null);
  if (!existing) return false;
  if (existing[0].n > 0) return false;
  const counts = await seedKnowledge();
  console.log(`[knowledge] seeded ${counts.kinds} kinds, ${counts.attributes} attributes, ${counts.options} options, ${counts.brands} brands`);
  return true;
}
