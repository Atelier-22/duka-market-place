import { query, queryOne } from '../db/pool';
import { LOW_RISK_ATTRIBUTES } from './bootstrap';

export const PROMOTION_RULES = {
  option: { lowRisk: { sellers: 2, observations: 3 }, other: { sellers: 4, observations: 6 }, minConfidence: 0.8 },
  kind: { sellers: 3, observations: 5, minConfidence: 0.85 },
  attribute: { sellers: 5, observations: 10, minConfidence: 0.9 },
  kindAttribute: { sellers: 3, observations: 5, minConfidence: 0.85 },
  brand: { sellers: 2, observations: 3, minConfidence: 0.8 },
  saturationSellers: 1.2,
};

export function confidenceFrom(avgSourceConfidence: number, sellerCount: number): number {
  const saturation = 1 - Math.exp(-sellerCount / PROMOTION_RULES.saturationSellers);
  return Math.round(Math.min(0.99, avgSourceConfidence * saturation) * 1000) / 1000;
}

export type EntityType = 'kind' | 'attribute' | 'option' | 'brand' | 'kind_attribute';

const TABLE: Record<EntityType, string> = {
  kind: 'product_kinds',
  attribute: 'product_attributes',
  option: 'product_attribute_options',
  brand: 'product_brands',
  kind_attribute: 'product_kind_attributes',
};

export async function audit(entityType: EntityType | 'synonym', entityId: string, action: string, actor: { type: 'system' | 'admin'; id?: string | null }, previous: unknown, next: unknown, reason?: string) {
  await query(
    `INSERT INTO product_knowledge_audit (entity_type, entity_id, action, actor_type, actor_id, previous, next, reason)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
    [entityType, entityId, action, actor.type, actor.id ?? null, previous == null ? null : JSON.stringify(previous), next == null ? null : JSON.stringify(next), reason ?? null]
  );
}

interface Counts { observation_count: number; seller_count: number; avg_confidence: number; last_observed_at: string | null }

async function applyCounts(entityType: EntityType, id: string, counts: Counts) {
  const confidence = confidenceFrom(Number(counts.avg_confidence ?? 0), Number(counts.seller_count ?? 0));
  const current = await queryOne<{ status: string; source: string; confidence: number }>(`SELECT status, source, confidence FROM ${TABLE[entityType]} WHERE id = $1`, [id]);
  if (!current) return;
  const keepsTrust = current.source === 'bootstrap' || current.source === 'admin';
  await query(
    `UPDATE ${TABLE[entityType]}
        SET observation_count = $2, seller_count = $3, last_observed_at = COALESCE($4, last_observed_at),
            confidence = CASE WHEN $5 THEN confidence ELSE $6 END, updated_at = now()
      WHERE id = $1`,
    [id, counts.observation_count, counts.seller_count, counts.last_observed_at, keepsTrust, confidence]
  );
  if (current.status !== 'candidate') return;
  const rule = ruleFor(entityType, entityType === 'option' ? await optionAttributeKey(id) : null);
  if (Number(counts.seller_count) >= rule.sellers && Number(counts.observation_count) >= rule.observations && confidence >= rule.minConfidence) {
    await query(`UPDATE ${TABLE[entityType]} SET status = 'active', updated_at = now() WHERE id = $1 AND status = 'candidate'`, [id]);
    await audit(entityType, id, 'promote', { type: 'system' }, { status: 'candidate', confidence: Number(current.confidence) }, { status: 'active', confidence, sellers: Number(counts.seller_count), observations: Number(counts.observation_count) },
      `Seen in ${counts.observation_count} products from ${counts.seller_count} sellers`);
  }
}

async function optionAttributeKey(optionId: string): Promise<string | null> {
  const row = await queryOne<{ key: string }>(`SELECT a.key FROM product_attribute_options o JOIN product_attributes a ON a.id = o.attribute_id WHERE o.id = $1`, [optionId]);
  return row?.key ?? null;
}

function ruleFor(entityType: EntityType, attributeKey: string | null): { sellers: number; observations: number; minConfidence: number } {
  if (entityType === 'option') {
    const tier = attributeKey && LOW_RISK_ATTRIBUTES.has(attributeKey) ? PROMOTION_RULES.option.lowRisk : PROMOTION_RULES.option.other;
    return { ...tier, minConfidence: PROMOTION_RULES.option.minConfidence };
  }
  if (entityType === 'kind_attribute') return PROMOTION_RULES.kindAttribute;
  return PROMOTION_RULES[entityType];
}

export async function refreshOptions(optionIds: string[]) {
  const ids = [...new Set(optionIds)];
  if (ids.length === 0) return;
  const rows = await query<Counts & { id: string; status: string; source: string; confidence: number; key: string }>(
    `WITH scoped AS (
       SELECT o.id, a.key AS attribute_key, o.kind_id, o.category, o.brand_slug, o.value_norm
         FROM product_attribute_options o JOIN product_attributes a ON a.id = o.attribute_id WHERE o.id = ANY($1)
     ), counts AS (
       SELECT s.id, count(ob.id)::int AS observation_count, count(DISTINCT ob.seller_id)::int AS seller_count,
              coalesce(avg(ob.confidence), 0)::float AS avg_confidence, max(ob.created_at) AS last_observed_at
         FROM scoped s
         LEFT JOIN product_observations ob ON ob.entity_type = 'option' AND ob.attribute_key = s.attribute_key AND ob.value_norm = s.value_norm
          AND ((s.kind_id IS NOT NULL AND ob.kind_id = s.kind_id)
            OR (s.kind_id IS NULL AND s.brand_slug IS NOT NULL AND ob.brand_slug = s.brand_slug)
            OR (s.kind_id IS NULL AND s.brand_slug IS NULL AND s.category IS NOT NULL AND ob.category = s.category)
            OR (s.kind_id IS NULL AND s.brand_slug IS NULL AND s.category IS NULL))
        GROUP BY s.id
     )
     SELECT c.*, o.status, o.source, o.confidence, a.key FROM counts c JOIN product_attribute_options o ON o.id = c.id JOIN product_attributes a ON a.id = o.attribute_id`,
    [ids]
  );
  if (rows.length === 0) return;
  const scored = rows.map((r) => ({ ...r, next: confidenceFrom(Number(r.avg_confidence ?? 0), Number(r.seller_count ?? 0)) }));
  await query(
    `UPDATE product_attribute_options o
        SET observation_count = u.obs, seller_count = u.sellers, last_observed_at = COALESCE(u.last, o.last_observed_at),
            confidence = CASE WHEN o.source IN ('bootstrap', 'admin') THEN o.confidence ELSE u.conf END, updated_at = now()
       FROM unnest($1::uuid[], $2::int[], $3::int[], $4::timestamptz[], $5::numeric[]) AS u(id, obs, sellers, last, conf)
      WHERE o.id = u.id`,
    [scored.map((r) => r.id), scored.map((r) => r.observation_count), scored.map((r) => r.seller_count), scored.map((r) => r.last_observed_at), scored.map((r) => r.next)]
  );
  for (const r of scored) {
    if (r.status !== 'candidate') continue;
    const rule = ruleFor('option', r.key);
    if (Number(r.seller_count) >= rule.sellers && Number(r.observation_count) >= rule.observations && r.next >= rule.minConfidence) {
      await query(`UPDATE product_attribute_options SET status = 'active', updated_at = now() WHERE id = $1 AND status = 'candidate'`, [r.id]);
      await audit('option', r.id, 'promote', { type: 'system' }, { status: 'candidate', confidence: Number(r.confidence) }, { status: 'active', confidence: r.next, sellers: Number(r.seller_count), observations: Number(r.observation_count) },
        `Seen in ${r.observation_count} products from ${r.seller_count} sellers`);
    }
  }
}

export async function refreshOption(optionId: string) {
  const option = await queryOne<{ attribute_key: string; kind_id: string | null; category: string | null; brand_slug: string | null; value_norm: string }>(
    `SELECT a.key AS attribute_key, o.kind_id, o.category, o.brand_slug, o.value_norm FROM product_attribute_options o JOIN product_attributes a ON a.id = o.attribute_id WHERE o.id = $1`,
    [optionId]
  );
  if (!option) return;
  const conditions = [`entity_type = 'option'`, `attribute_key = $1`, `value_norm = $2`];
  const params: unknown[] = [option.attribute_key, option.value_norm];
  if (option.kind_id) { params.push(option.kind_id); conditions.push(`kind_id = $${params.length}`); }
  else if (option.brand_slug) { params.push(option.brand_slug); conditions.push(`brand_slug = $${params.length}`); }
  else if (option.category) { params.push(option.category); conditions.push(`category = $${params.length}`); }
  const counts = await queryOne<Counts>(
    `SELECT count(*)::int AS observation_count, count(DISTINCT seller_id)::int AS seller_count, coalesce(avg(confidence), 0)::float AS avg_confidence, max(created_at) AS last_observed_at
       FROM product_observations WHERE ${conditions.join(' AND ')}`,
    params
  );
  if (counts) await applyCounts('option', optionId, counts);
}

export async function refreshKind(kindId: string) {
  const counts = await queryOne<Counts>(
    `SELECT count(*)::int AS observation_count, count(DISTINCT seller_id)::int AS seller_count, coalesce(avg(confidence), 0)::float AS avg_confidence, max(created_at) AS last_observed_at
       FROM product_observations WHERE entity_type = 'kind' AND kind_id = $1`,
    [kindId]
  );
  if (counts) await applyCounts('kind', kindId, counts);
}

export async function refreshAttribute(attributeId: string) {
  const attr = await queryOne<{ key: string }>(`SELECT key FROM product_attributes WHERE id = $1`, [attributeId]);
  if (!attr) return;
  const counts = await queryOne<Counts>(
    `SELECT count(*)::int AS observation_count, count(DISTINCT seller_id)::int AS seller_count, coalesce(avg(confidence), 0)::float AS avg_confidence, max(created_at) AS last_observed_at
       FROM product_observations WHERE entity_type = 'attribute' AND attribute_key = $1`,
    [attr.key]
  );
  if (counts) await applyCounts('attribute', attributeId, counts);
}

export async function refreshKindAttribute(kindId: string, attributeId: string) {
  const link = await queryOne<{ id: string; key: string }>(
    `SELECT ka.id, a.key FROM product_kind_attributes ka JOIN product_attributes a ON a.id = ka.attribute_id WHERE ka.kind_id = $1 AND ka.attribute_id = $2`,
    [kindId, attributeId]
  );
  if (!link) return;
  const counts = await queryOne<Counts>(
    `SELECT count(*)::int AS observation_count, count(DISTINCT seller_id)::int AS seller_count, coalesce(avg(confidence), 0)::float AS avg_confidence, max(created_at) AS last_observed_at
       FROM product_observations WHERE entity_type = 'attribute' AND kind_id = $1 AND attribute_key = $2`,
    [kindId, link.key]
  );
  if (counts) await applyCounts('kind_attribute', link.id, counts);
}

export async function refreshBrand(brandId: string) {
  const brand = await queryOne<{ slug: string }>(`SELECT slug FROM product_brands WHERE id = $1`, [brandId]);
  if (!brand) return;
  const counts = await queryOne<Counts>(
    `SELECT count(*)::int AS observation_count, count(DISTINCT seller_id)::int AS seller_count, coalesce(avg(confidence), 0)::float AS avg_confidence, max(created_at) AS last_observed_at
       FROM product_observations WHERE entity_type = 'brand' AND value_norm = $1`,
    [brand.slug]
  );
  if (counts) await applyCounts('brand', brandId, counts);
  await query(
    `INSERT INTO product_brand_categories (brand_id, category, observation_count, seller_count, last_observed_at)
     SELECT $1, category, count(*)::int, count(DISTINCT seller_id)::int, max(created_at)
       FROM product_observations WHERE entity_type = 'brand' AND value_norm = $2 GROUP BY category
     ON CONFLICT (brand_id, category) DO UPDATE SET observation_count = EXCLUDED.observation_count, seller_count = EXCLUDED.seller_count, last_observed_at = EXCLUDED.last_observed_at`,
    [brandId, brand.slug]
  );
}
