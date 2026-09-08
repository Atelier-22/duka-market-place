import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';
import { query, queryOne } from '../db/pool';
import { EntityType, PROMOTION_RULES, audit } from './promote';
import { invalidateLexicon } from './interpret';
import { isHex, normalizeValue, slugify } from './normalize';

const TABLE: Record<EntityType, string> = {
  kind: 'product_kinds',
  attribute: 'product_attributes',
  option: 'product_attribute_options',
  brand: 'product_brands',
  kind_attribute: 'product_kind_attributes',
};

const entitySchema = z.enum(['kind', 'attribute', 'option', 'brand', 'kind_attribute']);
const statusSchema = z.enum(['active', 'candidate', 'rejected', 'deprecated', 'all']).optional().default('all');
const pageSchema = z.object({ limit: z.coerce.number().int().min(1).max(200).optional().default(50), offset: z.coerce.number().int().min(0).optional().default(0) });

function actor(req: Request) { return { type: 'admin' as const, id: req.user?.id ?? null }; }

export async function overview(_req: Request, res: Response) {
  const [kinds, attributes, options, brands, links, obs, recent, sellers] = await Promise.all([
    query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM product_kinds WHERE NOT is_default GROUP BY status`),
    query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM product_attributes GROUP BY status`),
    query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM product_attribute_options GROUP BY status`),
    query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM product_brands GROUP BY status`),
    query<{ status: string; n: number }>(`SELECT status, count(*)::int AS n FROM product_kind_attributes GROUP BY status`),
    queryOne<{ total: number; week: number; products: number }>(`SELECT count(*)::int AS total, count(*) FILTER (WHERE created_at > now() - interval '7 days')::int AS week, count(DISTINCT product_id)::int AS products FROM product_observations`),
    query<{ action: string; n: number }>(`SELECT action, count(*)::int AS n FROM product_knowledge_audit WHERE created_at > now() - interval '30 days' GROUP BY action`),
    queryOne<{ n: number }>(`SELECT count(DISTINCT seller_id)::int AS n FROM product_observations`),
  ]);
  const byStatus = (rows: { status: string; n: number }[]) => Object.fromEntries(rows.map((r) => [r.status, r.n]));
  res.json({
    kinds: byStatus(kinds), attributes: byStatus(attributes), options: byStatus(options), brands: byStatus(brands), kindAttributes: byStatus(links),
    observations: obs ?? { total: 0, week: 0, products: 0 },
    sellersObserved: sellers?.n ?? 0,
    auditLast30Days: Object.fromEntries(recent.map((r) => [r.action, r.n])),
    rules: PROMOTION_RULES,
  });
}

export async function kinds(req: Request, res: Response) {
  const { status } = z.object({ status: statusSchema }).parse(req.query);
  const { limit, offset } = pageSchema.parse(req.query);
  const { category, q } = z.object({ category: z.string().max(40).optional(), q: z.string().max(80).optional() }).parse(req.query);
  const params: unknown[] = [];
  const cond = ['NOT k.is_default'];
  if (status !== 'all') { params.push(status); cond.push(`k.status = $${params.length}`); }
  if (category) { params.push(category); cond.push(`k.category = $${params.length}`); }
  if (q) { params.push(`%${q.toLowerCase()}%`); cond.push(`lower(k.name) LIKE $${params.length}`); }
  const where = cond.join(' AND ');
  const rows = await query(
    `SELECT k.*, (SELECT count(*)::int FROM product_kind_attributes ka WHERE ka.kind_id = k.id AND ka.status = 'active') AS attribute_count,
            (SELECT count(*)::int FROM product_attribute_options o WHERE o.kind_id = k.id AND o.status = 'active') AS option_count,
            (SELECT string_agg(name, ' · ') FROM (SELECT p.name FROM product_observations ob JOIN seller_products p ON p.id = ob.product_id WHERE ob.kind_id = k.id AND ob.entity_type = 'kind' ORDER BY ob.created_at DESC LIMIT 3) x) AS examples
       FROM product_kinds k WHERE ${where} ORDER BY (k.status = 'candidate') DESC, k.seller_count DESC, k.observation_count DESC, k.category, k.position, k.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_kinds k WHERE ${where}`, params);
  res.json({ kinds: rows, total: total?.n ?? 0 });
}

export async function attributes(req: Request, res: Response) {
  const { status } = z.object({ status: statusSchema }).parse(req.query);
  const { limit, offset } = pageSchema.parse(req.query);
  const { q } = z.object({ q: z.string().max(80).optional() }).parse(req.query);
  const params: unknown[] = [];
  const cond = ['TRUE'];
  if (status !== 'all') { params.push(status); cond.push(`a.status = $${params.length}`); }
  if (q) { params.push(`%${q.toLowerCase()}%`); cond.push(`(lower(a.name) LIKE $${params.length} OR a.key LIKE $${params.length})`); }
  const where = cond.join(' AND ');
  const rows = await query(
    `SELECT a.*, (SELECT count(*)::int FROM product_kind_attributes ka WHERE ka.attribute_id = a.id AND ka.status = 'active') AS kind_count,
            (SELECT count(*)::int FROM product_attribute_options o WHERE o.attribute_id = a.id AND o.status = 'active') AS option_count,
            (SELECT count(*)::int FROM seller_product_attributes spa WHERE spa.attribute_id = a.id) AS product_count
       FROM product_attributes a WHERE ${where} ORDER BY (a.status = 'candidate') DESC, a.seller_count DESC, a.observation_count DESC, a.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_attributes a WHERE ${where}`, params);
  res.json({ attributes: rows, total: total?.n ?? 0 });
}

export async function options(req: Request, res: Response) {
  const { status } = z.object({ status: statusSchema }).parse(req.query);
  const { limit, offset } = pageSchema.parse(req.query);
  const { attribute, kind, q, colours } = z.object({ attribute: z.string().max(60).optional(), kind: z.string().max(80).optional(), q: z.string().max(80).optional(), colours: z.string().optional() }).parse(req.query);
  const params: unknown[] = [];
  const cond = ['TRUE'];
  if (status !== 'all') { params.push(status); cond.push(`o.status = $${params.length}`); }
  if (attribute) { params.push(attribute); cond.push(`a.key = $${params.length}`); }
  if (colours) cond.push(`a.key = 'colour'`);
  if (kind) { params.push(`%${kind.toLowerCase()}%`); cond.push(`lower(k.name) LIKE $${params.length}`); }
  if (q) { params.push(`%${q.toLowerCase()}%`); cond.push(`o.value_norm LIKE $${params.length}`); }
  const where = cond.join(' AND ');
  const base = `FROM product_attribute_options o JOIN product_attributes a ON a.id = o.attribute_id LEFT JOIN product_kinds k ON k.id = o.kind_id WHERE ${where}`;
  const rows = await query(
    `SELECT o.*, a.key AS attribute_key, a.name AS attribute_name, a.type AS attribute_type, k.name AS kind_name, k.category AS kind_category
       ${base} ORDER BY (o.status = 'candidate') DESC, o.seller_count DESC, o.observation_count DESC, a.key, o.position, o.value LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n ${base}`, params);
  res.json({ options: rows, total: total?.n ?? 0 });
}

export async function brands(req: Request, res: Response) {
  const { status } = z.object({ status: statusSchema }).parse(req.query);
  const { limit, offset } = pageSchema.parse(req.query);
  const { q } = z.object({ q: z.string().max(80).optional() }).parse(req.query);
  const params: unknown[] = [];
  const cond = ['TRUE'];
  if (status !== 'all') { params.push(status); cond.push(`b.status = $${params.length}`); }
  if (q) { params.push(`%${q.toLowerCase()}%`); cond.push(`lower(b.name) LIKE $${params.length}`); }
  const where = cond.join(' AND ');
  const rows = await query(
    `SELECT b.*, (SELECT json_agg(json_build_object('category', bc.category, 'observations', bc.observation_count, 'sellers', bc.seller_count) ORDER BY bc.observation_count DESC) FROM product_brand_categories bc WHERE bc.brand_id = b.id) AS categories,
            (SELECT count(*)::int FROM product_attribute_options o WHERE o.brand_slug = b.slug AND o.status = 'active') AS colour_count
       FROM product_brands b WHERE ${where} ORDER BY (b.status = 'candidate') DESC, b.seller_count DESC, b.observation_count DESC, b.name LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_brands b WHERE ${where}`, params);
  res.json({ brands: rows, total: total?.n ?? 0 });
}

export async function observations(req: Request, res: Response) {
  const { limit, offset } = pageSchema.parse(req.query);
  const f = z.object({ entity: z.enum(['kind', 'attribute', 'option', 'brand']).optional(), attribute: z.string().max(60).optional(), q: z.string().max(80).optional(), product: z.string().uuid().optional(), source: z.string().max(30).optional() }).parse(req.query);
  const params: unknown[] = [];
  const cond = ['TRUE'];
  if (f.entity) { params.push(f.entity); cond.push(`ob.entity_type = $${params.length}`); }
  if (f.attribute) { params.push(f.attribute); cond.push(`ob.attribute_key = $${params.length}`); }
  if (f.product) { params.push(f.product); cond.push(`ob.product_id = $${params.length}`); }
  if (f.source) { params.push(f.source); cond.push(`ob.source = $${params.length}`); }
  if (f.q) { params.push(`%${f.q.toLowerCase()}%`); cond.push(`(ob.value_norm LIKE $${params.length} OR lower(p.name) LIKE $${params.length})`); }
  const where = cond.join(' AND ');
  const rows = await query(
    `SELECT ob.*, p.name AS product_name, p.status AS product_status, s.name AS store_name
       FROM product_observations ob JOIN seller_products p ON p.id = ob.product_id LEFT JOIN seller_stores s ON s.id = p.store_id
      WHERE ${where} ORDER BY ob.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_observations ob JOIN seller_products p ON p.id = ob.product_id WHERE ${where}`, params);
  res.json({ observations: rows, total: total?.n ?? 0 });
}

export async function suggestions(_req: Request, res: Response) {
  const [kinds, attributes, options, brands, links] = await Promise.all([
    query(`SELECT k.id, 'kind' AS entity, k.name, k.category, k.status, k.source, k.confidence, k.observation_count, k.seller_count, k.last_observed_at,
                  (SELECT string_agg(name, ' · ') FROM (SELECT p.name FROM product_observations ob JOIN seller_products p ON p.id = ob.product_id WHERE ob.kind_id = k.id AND ob.entity_type = 'kind' ORDER BY ob.created_at DESC LIMIT 3) x) AS examples,
                  (SELECT string_agg(DISTINCT ob.attribute_key, ', ') FROM product_observations ob WHERE ob.kind_id = k.id AND ob.entity_type = 'attribute') AS candidate_attributes
             FROM product_kinds k WHERE k.status = 'candidate' ORDER BY k.seller_count DESC, k.observation_count DESC LIMIT 50`),
    query(`SELECT a.id, 'attribute' AS entity, a.name, a.key, a.type, a.status, a.source, a.confidence, a.observation_count, a.seller_count, a.last_observed_at,
                  (SELECT string_agg(value, ' · ') FROM (SELECT ob.value, count(*) AS n FROM product_observations ob WHERE ob.attribute_key = a.key AND ob.entity_type = 'option' GROUP BY ob.value ORDER BY n DESC LIMIT 5) x) AS examples
             FROM product_attributes a WHERE a.status = 'candidate' ORDER BY a.seller_count DESC, a.observation_count DESC LIMIT 50`),
    query(`SELECT o.id, 'option' AS entity, o.value AS name, a.key AS attribute_key, a.name AS attribute_name, k.name AS kind_name, k.category, o.brand_slug, o.display_hex, o.status, o.source, o.confidence, o.observation_count, o.seller_count, o.last_observed_at
             FROM product_attribute_options o JOIN product_attributes a ON a.id = o.attribute_id LEFT JOIN product_kinds k ON k.id = o.kind_id
            WHERE o.status = 'candidate' ORDER BY o.seller_count DESC, o.observation_count DESC LIMIT 100`),
    query(`SELECT b.id, 'brand' AS entity, b.name, b.status, b.source, b.confidence, b.observation_count, b.seller_count, b.last_observed_at,
                  (SELECT string_agg(bc.category, ', ') FROM product_brand_categories bc WHERE bc.brand_id = b.id) AS categories
             FROM product_brands b WHERE b.status = 'candidate' ORDER BY b.seller_count DESC, b.observation_count DESC LIMIT 50`),
    query(`SELECT ka.id, 'kind_attribute' AS entity, a.name AS name, a.key AS attribute_key, k.name AS kind_name, k.category, ka.role, ka.status, ka.source, ka.confidence, ka.observation_count, ka.seller_count, ka.last_observed_at,
                  (SELECT string_agg(value, ' · ') FROM (SELECT ob.value, count(*) AS n FROM product_observations ob WHERE ob.kind_id = k.id AND ob.attribute_key = a.key AND ob.entity_type = 'option' GROUP BY ob.value ORDER BY n DESC LIMIT 5) x) AS examples
             FROM product_kind_attributes ka JOIN product_kinds k ON k.id = ka.kind_id JOIN product_attributes a ON a.id = ka.attribute_id
            WHERE ka.status = 'candidate' AND k.status = 'active' ORDER BY ka.seller_count DESC, ka.observation_count DESC LIMIT 100`),
  ]);
  res.json({ kinds, attributes, options, brands, kindAttributes: links });
}

export async function auditLog(req: Request, res: Response) {
  const { limit, offset } = pageSchema.parse(req.query);
  const rows = await query(
    `SELECT au.*, st.full_name AS actor_name FROM product_knowledge_audit au LEFT JOIN staff st ON st.id = au.actor_id ORDER BY au.created_at DESC LIMIT $1 OFFSET $2`,
    [limit, offset]
  ).catch(() => query(`SELECT au.*, NULL AS actor_name FROM product_knowledge_audit au ORDER BY au.created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]));
  const total = await queryOne<{ n: number }>(`SELECT count(*)::int AS n FROM product_knowledge_audit`);
  res.json({ audit: rows, total: total?.n ?? 0 });
}

export async function explain(req: Request, res: Response) {
  const { entity, id } = z.object({ entity: entitySchema, id: z.string().uuid() }).parse(req.query);
  const row = await queryOne<any>(`SELECT * FROM ${TABLE[entity]} WHERE id = $1`, [id]);
  if (!row) throw new ApiError(404, 'Not found');
  let filter = '';
  const params: unknown[] = [];
  if (entity === 'kind') { params.push(id); filter = `ob.kind_id = $1`; }
  if (entity === 'attribute') { params.push(row.key); filter = `ob.attribute_key = $1`; }
  if (entity === 'brand') { params.push(row.slug); filter = `ob.entity_type = 'brand' AND ob.value_norm = $1`; }
  if (entity === 'option') {
    const attr = await queryOne<{ key: string }>(`SELECT key FROM product_attributes WHERE id = $1`, [row.attribute_id]);
    params.push(attr?.key ?? '', row.value_norm);
    filter = `ob.entity_type = 'option' AND ob.attribute_key = $1 AND ob.value_norm = $2`;
    if (row.kind_id) { params.push(row.kind_id); filter += ` AND ob.kind_id = $3`; }
  }
  if (entity === 'kind_attribute') {
    const attr = await queryOne<{ key: string }>(`SELECT key FROM product_attributes WHERE id = $1`, [row.attribute_id]);
    params.push(row.kind_id, attr?.key ?? '');
    filter = `ob.kind_id = $1 AND ob.attribute_key = $2`;
  }
  const [summary, sources, values, products] = await Promise.all([
    queryOne<any>(`SELECT count(*)::int AS observations, count(DISTINCT ob.seller_id)::int AS sellers, count(DISTINCT ob.product_id)::int AS products, coalesce(avg(ob.confidence), 0)::float AS avg_confidence, max(ob.created_at) AS last_observed_at, min(ob.created_at) AS first_observed_at FROM product_observations ob WHERE ${filter}`, params),
    query<any>(`SELECT ob.source, count(*)::int AS n FROM product_observations ob WHERE ${filter} GROUP BY ob.source ORDER BY n DESC`, params),
    query<any>(`SELECT ob.value, count(*)::int AS n FROM product_observations ob WHERE ${filter} AND ob.entity_type = 'option' GROUP BY ob.value ORDER BY n DESC LIMIT 12`, params),
    query<any>(`SELECT DISTINCT ON (p.id) p.id, p.name, p.status, s.name AS store_name, ob.created_at FROM product_observations ob JOIN seller_products p ON p.id = ob.product_id LEFT JOIN seller_stores s ON s.id = p.store_id WHERE ${filter} ORDER BY p.id, ob.created_at DESC LIMIT 8`, params),
  ]);
  const history = await query(`SELECT * FROM product_knowledge_audit WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC LIMIT 20`, [entity, id]);
  res.json({ entity, row, summary, sources, values, products, history });
}

const actionSchema = z.object({
  reason: z.string().trim().max(300).optional(),
  name: z.string().trim().min(1).max(80).optional(),
  targetId: z.string().uuid().optional(),
  type: z.enum(['text', 'number', 'currency', 'boolean', 'select', 'multi_select', 'measurement', 'colour', 'date', 'year', 'range']).optional(),
  unit: z.string().trim().max(20).nullable().optional(),
  hex: z.string().trim().max(9).nullable().optional(),
  role: z.enum(['variant', 'required', 'optional']).optional(),
  versionType: z.string().trim().max(60).nullable().optional(),
});

export async function act(req: Request, res: Response) {
  const { entity, id, action } = z.object({ entity: entitySchema, id: z.string().uuid(), action: z.enum(['approve', 'reject', 'deprecate', 'rename', 'merge', 'edit', 'reactivate']) }).parse(req.params);
  const body = actionSchema.parse(req.body ?? {});
  const table = TABLE[entity];
  const before = await queryOne<any>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  if (!before) throw new ApiError(404, 'Not found');
  const who = actor(req);

  if (action === 'approve' || action === 'reactivate') {
    await query(`UPDATE ${table} SET status = 'active', source = CASE WHEN source = 'bootstrap' THEN source ELSE 'admin' END, confidence = 1, updated_at = now() WHERE id = $1`, [id]);
  } else if (action === 'reject' || action === 'deprecate') {
    await query(`UPDATE ${table} SET status = $2, updated_at = now() WHERE id = $1`, [id, action === 'reject' ? 'rejected' : 'deprecated']);
  } else if (action === 'rename') {
    if (!body.name) throw new ApiError(400, 'Give the new name');
    if (entity === 'option') await query(`UPDATE ${table} SET value = $2, value_norm = $3, updated_at = now() WHERE id = $1`, [id, body.name, normalizeValue(body.name).slice(0, 80)]);
    else if (entity === 'kind') await query(`UPDATE ${table} SET name = $2, slug = $3, updated_at = now() WHERE id = $1`, [id, body.name, slugify(body.name)]);
    else if (entity === 'brand') await query(`UPDATE ${table} SET name = $2, slug = $3, updated_at = now() WHERE id = $1`, [id, body.name, slugify(body.name)]);
    else if (entity === 'attribute') await query(`UPDATE ${table} SET name = $2, updated_at = now() WHERE id = $1`, [id, body.name]);
    else throw new ApiError(400, 'That entry cannot be renamed');
    if (entity === 'option' || entity === 'kind' || entity === 'brand') {
      const old = entity === 'option' ? before.value : before.name;
      const synonymType = entity === 'option' ? 'option' : entity;
      await query(`INSERT INTO product_synonyms (term, term_norm, entity_type, entity_id, source) VALUES ($1, $2, $3, $4, 'admin') ON CONFLICT DO NOTHING`, [old, normalizeValue(old), synonymType, id]);
    }
  } else if (action === 'merge') {
    if (!body.targetId || body.targetId === id) throw new ApiError(400, 'Choose what to merge into');
    const target = await queryOne<any>(`SELECT * FROM ${table} WHERE id = $1`, [body.targetId]);
    if (!target) throw new ApiError(404, 'Merge target not found');
    if (entity === 'kind_attribute') throw new ApiError(400, 'Kind rules cannot be merged');
    await query(`UPDATE ${table} SET merged_into = $2, status = 'deprecated', updated_at = now() WHERE id = $1`, [id, body.targetId]);
    const term = entity === 'option' ? before.value : before.name;
    const synonymType = entity === 'option' ? 'option' : entity;
    await query(`INSERT INTO product_synonyms (term, term_norm, entity_type, entity_id, source) VALUES ($1, $2, $3, $4, 'admin') ON CONFLICT DO NOTHING`, [term, normalizeValue(term), synonymType, body.targetId]);
    if (entity === 'kind') {
      await query(`UPDATE product_observations SET kind_id = $2 WHERE kind_id = $1`, [id, body.targetId]);
      await query(`INSERT INTO product_kind_attributes (kind_id, attribute_id, role, position, status, source, confidence) SELECT $2, attribute_id, role, position, status, source, confidence FROM product_kind_attributes WHERE kind_id = $1 ON CONFLICT DO NOTHING`, [id, body.targetId]);
      await query(`INSERT INTO product_attribute_options (attribute_id, kind_id, category, brand_slug, value, value_norm, display_hex, position, status, source, confidence) SELECT attribute_id, $2, category, brand_slug, value, value_norm, display_hex, position, status, source, confidence FROM product_attribute_options WHERE kind_id = $1 ON CONFLICT DO NOTHING`, [id, body.targetId]);
    }
    if (entity === 'attribute') {
      await query(`UPDATE product_observations SET attribute_key = $2 WHERE attribute_key = $1`, [before.key, target.key]);
      await query(`UPDATE seller_product_attributes SET attribute_id = $2, attribute_key = $3, label = $4 WHERE attribute_id = $1`, [id, body.targetId, target.key, target.name]);
      await query(`INSERT INTO product_kind_attributes (kind_id, attribute_id, role, position, status, source, confidence) SELECT kind_id, $2, role, position, status, source, confidence FROM product_kind_attributes WHERE attribute_id = $1 ON CONFLICT DO NOTHING`, [id, body.targetId]);
    }
    if (entity === 'option') {
      await query(`UPDATE product_observations ob SET value = $3, value_norm = $4 FROM product_attributes a WHERE a.id = $5 AND ob.entity_type = 'option' AND ob.attribute_key = a.key AND ob.value_norm = $1 AND ($2::uuid IS NULL OR ob.kind_id = $2)`, [before.value_norm, before.kind_id, target.value, target.value_norm, before.attribute_id]);
      await query(`UPDATE seller_product_attributes SET value = $3, value_norm = $4 WHERE attribute_id = $1 AND value_norm = $2`, [before.attribute_id, before.value_norm, target.value, target.value_norm]).catch(() => undefined);
    }
    if (entity === 'brand') {
      await query(`UPDATE product_observations SET value = $3, value_norm = $4, brand_slug = $4 WHERE entity_type = 'brand' AND value_norm = $1 OR brand_slug = $2`, [before.slug, before.slug, target.name, target.slug]);
      await query(`UPDATE product_attribute_options SET brand_slug = $2 WHERE brand_slug = $1`, [before.slug, target.slug]).catch(() => undefined);
    }
  } else if (action === 'edit') {
    if (entity === 'attribute') await query(`UPDATE product_attributes SET type = COALESCE($2, type), unit = CASE WHEN $3::boolean THEN $4 ELSE unit END, name = COALESCE($5, name), updated_at = now() WHERE id = $1`, [id, body.type ?? null, body.unit !== undefined, body.unit ?? null, body.name ?? null]);
    else if (entity === 'option') {
      if (body.hex !== undefined && body.hex !== null && !isHex(body.hex)) throw new ApiError(400, 'Colour must be a hex value like #1F4FD8');
      await query(`UPDATE product_attribute_options SET display_hex = CASE WHEN $2::boolean THEN $3 ELSE display_hex END, value = COALESCE($4, value), value_norm = COALESCE($5, value_norm), updated_at = now() WHERE id = $1`, [id, body.hex !== undefined, body.hex ?? null, body.name ?? null, body.name ? normalizeValue(body.name).slice(0, 80) : null]);
    } else if (entity === 'kind_attribute') await query(`UPDATE product_kind_attributes SET role = COALESCE($2, role), updated_at = now() WHERE id = $1`, [id, body.role ?? null]);
    else if (entity === 'kind') await query(`UPDATE product_kinds SET version_type = CASE WHEN $2::boolean THEN $3 ELSE version_type END, name = COALESCE($4, name), updated_at = now() WHERE id = $1`, [id, body.versionType !== undefined, body.versionType ?? null, body.name ?? null]);
    else if (entity === 'brand') await query(`UPDATE product_brands SET name = COALESCE($2, name), updated_at = now() WHERE id = $1`, [id, body.name ?? null]);
  }

  const after = await queryOne<any>(`SELECT * FROM ${table} WHERE id = $1`, [id]);
  await audit(entity, id, action, who, before, after, body.reason);
  invalidateLexicon();
  res.json({ ok: true, row: after });
}
