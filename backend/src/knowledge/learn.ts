import { query, queryOne } from '../db/pool';
import { Tx, txOne, txQuery, withTransaction } from '../seller/db';
import { AttributeRow, KindRow, brandFromText, defaultKind, findAttribute, findBrand, findKind } from './knowledge.model';
import { cleanValue, inferAttributeType, isHex, normalizeValue, parseMeasure, slugify, titleCase } from './normalize';
import { refreshAttribute, refreshBrand, refreshKind, refreshKindAttribute, refreshOptions } from './promote';

type Source = 'seller_structured' | 'seller_description' | 'system_inference';

interface Observation {
  entity: 'kind' | 'attribute' | 'option' | 'brand';
  attributeKey?: string | null;
  value: string;
  valueNorm?: string;
  hex?: string | null;
  source: Source;
  confidence: number;
}

interface ProductAttr { attributeId: string | null; key: string; label: string; value: string; unit: string | null; numeric: number | null; source: Source; confidence: number }

interface ProductRow {
  id: string; owner_id: string; name: string; description: string | null; category: string; subcategory: string | null; brand: string | null; model: string | null;
  status: string; specifications: { label: string; value: string }[];
}

interface VariationRow { name: string; value: string; color_name: string | null; color_hex: string | null }

interface Touched { kinds: Set<string>; attributes: Set<string>; options: Set<string>; brands: Set<string>; kindAttributes: Set<string> }

const CATEGORY_HINTS: Record<string, { storage?: boolean; ram?: boolean; shoeSize?: boolean }> = {
  phones: { storage: true, ram: true },
  computers: { storage: true, ram: true },
  gaming: { storage: true },
  cameras: { storage: true },
  shoes: { shoeSize: true },
  sports: { shoeSize: true },
};

async function ensureCandidateKind(tx: Tx, category: string, name: string, versionType: string | null): Promise<KindRow> {
  const slug = slugify(name);
  const existing = await txOne<KindRow>(tx, `SELECT * FROM product_kinds WHERE category = $1 AND slug = $2`, [category, slug]);
  if (existing) return existing;
  const row = await txOne<KindRow>(
    tx,
    `INSERT INTO product_kinds (category, name, slug, version_type, status, source, confidence, position)
     VALUES ($1, $2, $3, $4, 'candidate', 'seller_structured', 0, 999)
     ON CONFLICT (category, slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING *`,
    [category, titleCase(name).slice(0, 80), slug, versionType]
  );
  return row!;
}

async function ensureCandidateAttribute(tx: Tx, label: string, sampleValue: string): Promise<AttributeRow> {
  const key = slugify(label);
  const existing = await txOne<AttributeRow>(tx, `SELECT * FROM product_attributes WHERE key = $1`, [key]);
  if (existing) return existing;
  const inferred = inferAttributeType(label, sampleValue);
  const row = await txOne<AttributeRow>(
    tx,
    `INSERT INTO product_attributes (key, name, type, unit, status, source, confidence) VALUES ($1, $2, $3, $4, 'candidate', 'seller_structured', 0)
     ON CONFLICT (key) DO UPDATE SET key = EXCLUDED.key RETURNING *`,
    [key, titleCase(label).slice(0, 60), inferred.type, inferred.unit]
  );
  return row!;
}

async function ensureKindAttribute(tx: Tx, kindId: string, attributeId: string, role: 'variant' | 'optional'): Promise<string> {
  const row = await txOne<{ id: string }>(
    tx,
    `INSERT INTO product_kind_attributes (kind_id, attribute_id, role, position, status, source, confidence)
     VALUES ($1, $2, $3, 500, 'candidate', 'seller_structured', 0)
     ON CONFLICT (kind_id, attribute_id) DO UPDATE SET kind_id = EXCLUDED.kind_id RETURNING id`,
    [kindId, attributeId, role]
  );
  return row!.id;
}

async function ensureOption(tx: Tx, attributeId: string, scope: { kindId?: string | null; brandSlug?: string | null }, value: string, hex: string | null): Promise<string> {
  const row = await txOne<{ id: string }>(
    tx,
    `INSERT INTO product_attribute_options (attribute_id, kind_id, category, brand_slug, value, value_norm, display_hex, position, status, source, confidence)
     VALUES ($1, $2, NULL, $3, $4, $5, $6, 500, 'candidate', 'seller_structured', 0)
     ON CONFLICT (attribute_id, COALESCE(kind_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(category, ''), COALESCE(brand_slug, ''), value_norm)
     DO UPDATE SET display_hex = COALESCE(product_attribute_options.display_hex, EXCLUDED.display_hex) RETURNING id`,
    [attributeId, scope.kindId ?? null, scope.brandSlug ?? null, cleanValue(value, 80), normalizeValue(value).slice(0, 80), hex]
  );
  return row!.id;
}

async function ensureBrand(tx: Tx, name: string): Promise<{ id: string; slug: string; name: string }> {
  const slug = slugify(name);
  const row = await txOne<{ id: string; slug: string; name: string }>(
    tx,
    `INSERT INTO product_brands (name, slug, status, source, confidence) VALUES ($1, $2, 'candidate', 'seller_structured', 0)
     ON CONFLICT (slug) DO UPDATE SET slug = EXCLUDED.slug RETURNING id, slug, name`,
    [titleCase(name).slice(0, 80), slug]
  );
  return row!;
}

function inferFromText(product: ProductRow, structuredKeys: Set<string>, hasColours: boolean, knownColours: { value: string; value_norm: string; hex: string | null }[]): Observation[] {
  const out: Observation[] = [];
  const hints = CATEGORY_HINTS[product.category] ?? {};
  const text = `${product.name} ${product.description ?? ''}`;
  const nameNorm = ` ${normalizeValue(product.name)} `;
  if (hints.ram && !structuredKeys.has('ram')) {
    const ram = text.match(/\b(\d{1,2})\s?GB\s?RAM\b/i);
    if (ram) out.push({ entity: 'option', attributeKey: 'ram', value: `${ram[1]}GB`, source: 'seller_description', confidence: 0.8 });
  }
  if (hints.storage && !structuredKeys.has('storage')) {
    const matches = [...text.matchAll(/\b(\d{2,4})\s?(GB|TB)\b(?!\s?RAM)/gi)];
    for (const m of matches.slice(0, 2)) {
      const value = `${m[1]}${m[2].toUpperCase()}`;
      if (!out.some((o) => o.attributeKey === 'storage' && o.value === value)) out.push({ entity: 'option', attributeKey: 'storage', value, source: 'seller_description', confidence: 0.8 });
    }
  }
  if (hints.shoeSize && !structuredKeys.has('size')) {
    const size = text.match(/\bsize\s?(\d{2})\b/i);
    if (size) out.push({ entity: 'option', attributeKey: 'size', value: size[1], source: 'seller_description', confidence: 0.8 });
  }
  if (!hasColours) {
    for (const colour of knownColours) {
      if (colour.value_norm.length >= 3 && nameNorm.includes(` ${colour.value_norm} `)) {
        out.push({ entity: 'option', attributeKey: 'colour', value: colour.value, hex: colour.hex, source: 'system_inference', confidence: 0.7 });
        if (out.filter((o) => o.attributeKey === 'colour').length >= 2) break;
      }
    }
  }
  return out;
}

export async function observeProduct(productId: string): Promise<{ observations: number; kind: string | null } | null> {
  const product = await queryOne<ProductRow>(`SELECT id, owner_id, name, description, category, subcategory, brand, model, status, specifications FROM seller_products WHERE id = $1`, [productId]);
  if (!product) return null;
  const variations = await query<VariationRow>(`SELECT name, value, color_name, color_hex FROM seller_product_variations WHERE product_id = $1 ORDER BY position`, [productId]);
  const knownColours = await query<{ value: string; value_norm: string; hex: string | null }>(
    `SELECT DISTINCT ON (o.value_norm) o.value, o.value_norm, o.display_hex AS hex FROM product_attribute_options o JOIN product_attributes a ON a.id = o.attribute_id
      WHERE a.key = 'colour' AND o.status = 'active' ORDER BY o.value_norm, o.observation_count DESC`
  );
  const touched: Touched = { kinds: new Set(), attributes: new Set(), options: new Set(), brands: new Set(), kindAttributes: new Set() };
  let kindLabel: string | null = null;
  let count = 0;

  await withTransaction(async (tx) => {
    await txQuery(tx, `DELETE FROM product_observations WHERE product_id = $1`, [productId]);
    await txQuery(tx, `DELETE FROM seller_product_attributes WHERE product_id = $1`, [productId]);

    const observations: Observation[] = [];
    const productAttrs: ProductAttr[] = [];
    const structuredKeys = new Set<string>();

    const kindName = (product.subcategory ?? '').trim();
    let kind: KindRow | null = null;
    if (kindName) {
      kind = await findKind(product.category, kindName, { includeCandidates: true });
      if (!kind) kind = await ensureCandidateKind(tx, product.category, kindName, variations.find((v) => v.value)?.name ?? null);
      touched.kinds.add(kind.id);
      kindLabel = kind.name;
      observations.push({ entity: 'kind', value: kind.name, source: 'seller_structured', confidence: 1 });
    } else {
      kind = await defaultKind(product.category);
    }
    const kindId = kind?.id ?? null;

    let brandSlug: string | null = null;
    const brandAttr = await findAttribute('Brand', { includeCandidates: true });
    if (product.brand && product.brand.trim()) {
      const known = await findBrand(product.brand, { includeCandidates: true });
      const brand = known ?? await ensureBrand(tx, product.brand);
      brandSlug = brand.slug;
      touched.brands.add(brand.id);
      observations.push({ entity: 'brand', value: brand.name, valueNorm: brand.slug, source: 'seller_structured', confidence: 1 });
      productAttrs.push({ attributeId: brandAttr?.id ?? null, key: 'brand', label: 'Brand', value: brand.name, unit: null, numeric: null, source: 'seller_structured', confidence: 1 });
      structuredKeys.add('brand');
    } else {
      const guess = await brandFromText(product.name);
      if (guess) {
        brandSlug = guess.slug;
        touched.brands.add(guess.id);
        observations.push({ entity: 'brand', value: guess.name, valueNorm: guess.slug, source: 'system_inference', confidence: 0.75 });
        productAttrs.push({ attributeId: brandAttr?.id ?? null, key: 'brand', label: 'Brand', value: guess.name, unit: null, numeric: null, source: 'system_inference', confidence: 0.75 });
      }
    }

    if (product.model && product.model.trim()) {
      const modelAttr = await findAttribute('Model', { includeCandidates: true });
      productAttrs.push({ attributeId: modelAttr?.id ?? null, key: 'model', label: 'Model', value: cleanValue(product.model, 200), unit: null, numeric: null, source: 'seller_structured', confidence: 1 });
      structuredKeys.add('model');
      if (modelAttr && brandSlug) {
        const optionId = await ensureOption(tx, modelAttr.id, { brandSlug }, product.model, null);
        touched.options.add(optionId);
        observations.push({ entity: 'option', attributeKey: 'model', value: product.model, source: 'seller_structured', confidence: 1 });
      }
    }

    const versionValues = new Map<string, string>();
    let versionLabel: string | null = null;
    for (const v of variations) {
      if (v.value && v.value.trim()) { versionValues.set(normalizeValue(v.value), v.value.trim()); versionLabel = versionLabel ?? v.name; }
    }
    if (versionLabel && versionValues.size > 0) {
      let attr = await findAttribute(versionLabel, { includeCandidates: true });
      if (!attr) attr = await ensureCandidateAttribute(tx, versionLabel, [...versionValues.values()][0]);
      touched.attributes.add(attr.id);
      if (kindId) { touched.kindAttributes.add(`${kindId}|${attr.id}`); await ensureKindAttribute(tx, kindId, attr.id, 'variant'); }
      observations.push({ entity: 'attribute', attributeKey: attr.key, value: attr.name, source: 'seller_structured', confidence: 1 });
      structuredKeys.add(attr.key);
      for (const value of versionValues.values()) {
        const optionId = await ensureOption(tx, attr.id, { kindId }, value, null);
        touched.options.add(optionId);
        observations.push({ entity: 'option', attributeKey: attr.key, value, source: 'seller_structured', confidence: 1 });
        const measure = parseMeasure(value);
        productAttrs.push({ attributeId: attr.id, key: attr.key, label: attr.name, value, unit: measure?.unit ?? null, numeric: measure?.numeric ?? null, source: 'seller_structured', confidence: 1 });
      }
    }

    const colourAttr = await findAttribute('Colour', { includeCandidates: true });
    const colourValues = new Map<string, { name: string; hex: string | null }>();
    for (const v of variations) {
      if (v.color_name && v.color_name.trim()) colourValues.set(normalizeValue(v.color_name), { name: v.color_name.trim(), hex: isHex(v.color_hex) ? v.color_hex : null });
    }
    if (colourAttr && colourValues.size > 0) {
      structuredKeys.add('colour');
      if (kindId) { touched.kindAttributes.add(`${kindId}|${colourAttr.id}`); await ensureKindAttribute(tx, kindId, colourAttr.id, 'variant'); }
      for (const colour of colourValues.values()) {
        const scope = brandSlug && CATEGORY_HINTS[product.category]?.storage ? { brandSlug } : { kindId };
        const optionId = await ensureOption(tx, colourAttr.id, scope, colour.name, colour.hex);
        touched.options.add(optionId);
        observations.push({ entity: 'option', attributeKey: 'colour', value: colour.name, hex: colour.hex, source: 'seller_structured', confidence: 1 });
        productAttrs.push({ attributeId: colourAttr.id, key: 'colour', label: 'Colour', value: colour.name, unit: null, numeric: null, source: 'seller_structured', confidence: 1 });
      }
    }

    const specs = Array.isArray(product.specifications) ? product.specifications : [];
    const seenSpec = new Set<string>();
    for (const spec of specs) {
      const label = (spec?.label ?? '').trim();
      const value = (spec?.value ?? '').trim();
      if (!label || !value) continue;
      const dedupe = `${slugify(label)}|${normalizeValue(value)}`;
      if (seenSpec.has(dedupe)) continue;
      seenSpec.add(dedupe);
      let attr = await findAttribute(label, { includeCandidates: true });
      if (!attr) attr = await ensureCandidateAttribute(tx, label, value);
      touched.attributes.add(attr.id);
      if (kindId) { touched.kindAttributes.add(`${kindId}|${attr.id}`); await ensureKindAttribute(tx, kindId, attr.id, 'optional'); }
      observations.push({ entity: 'attribute', attributeKey: attr.key, value: attr.name, source: 'seller_structured', confidence: 1 });
      structuredKeys.add(attr.key);
      const measure = parseMeasure(value);
      if (['select', 'multi_select', 'colour', 'year'].includes(attr.type) && value.length <= 80) {
        const parts = attr.type === 'multi_select' ? value.split(/\s*[,/]\s*/) : [value];
        for (const part of parts.filter(Boolean).slice(0, 6)) {
          const hex = attr.type === 'colour' ? knownColours.find((c) => c.value_norm === normalizeValue(part))?.hex ?? null : null;
          const optionId = await ensureOption(tx, attr.id, { kindId }, part, hex);
          touched.options.add(optionId);
          observations.push({ entity: 'option', attributeKey: attr.key, value: part, hex, source: 'seller_structured', confidence: 1 });
        }
      }
      productAttrs.push({ attributeId: attr.id, key: attr.key, label: attr.name, value: cleanValue(value, 200), unit: measure?.unit ?? attr.unit, numeric: measure?.numeric ?? null, source: 'seller_structured', confidence: 1 });
    }

    for (const inferred of inferFromText(product, structuredKeys, colourValues.size > 0, knownColours)) {
      const attr = inferred.attributeKey ? await findAttribute(inferred.attributeKey, { includeCandidates: true }) : null;
      if (!attr) continue;
      const optionId = await ensureOption(tx, attr.id, { kindId }, inferred.value, inferred.hex ?? null);
      touched.options.add(optionId);
      observations.push(inferred);
      productAttrs.push({ attributeId: attr.id, key: attr.key, label: attr.name, value: inferred.value, unit: parseMeasure(inferred.value)?.unit ?? null, numeric: parseMeasure(inferred.value)?.numeric ?? null, source: inferred.source, confidence: inferred.confidence });
    }

    for (const o of observations) {
      await txQuery(
        tx,
        `INSERT INTO product_observations (product_id, seller_id, category, kind_id, kind_name, brand_slug, entity_type, attribute_key, value, value_norm, display_hex, source, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
        [productId, product.owner_id, product.category, kindId, kindLabel, brandSlug, o.entity, o.attributeKey ?? null, cleanValue(o.value, 120), (o.valueNorm ?? normalizeValue(o.value)).slice(0, 120), o.hex ?? null, o.source, o.confidence]
      );
      count++;
    }
    for (const a of productAttrs) {
      await txQuery(
        tx,
        `INSERT INTO seller_product_attributes (product_id, attribute_id, attribute_key, label, value, value_norm, unit, numeric_value, source, confidence)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) ON CONFLICT (product_id, attribute_key, value_norm) DO NOTHING`,
        [productId, a.attributeId, a.key, a.label.slice(0, 60), a.value.slice(0, 200), normalizeValue(a.value).slice(0, 200), a.unit, a.numeric, a.source, a.confidence]
      );
    }
  });

  for (const id of touched.kinds) await refreshKind(id);
  for (const id of touched.attributes) await refreshAttribute(id);
  await refreshOptions([...touched.options]);
  for (const id of touched.brands) await refreshBrand(id);
  for (const pair of touched.kindAttributes) { const [kindId, attributeId] = pair.split('|'); await refreshKindAttribute(kindId, attributeId); }
  return { observations: count, kind: kindLabel };
}

export async function forgetProduct(productId: string) {
  await query(`DELETE FROM product_observations WHERE product_id = $1`, [productId]);
}
