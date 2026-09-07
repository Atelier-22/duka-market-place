import { query, queryOne } from '../db/pool';
import { Tx, txOne, txQuery, withTransaction } from './db';
import { PUBLIC_STORE_COLUMNS, refreshStoreCounters } from './store.model';
import { effectivePrice, PromotionLike } from './pricing';

export type ProductStatus = 'draft' | 'published' | 'archived';
export type ProductCondition = 'new' | 'used' | 'refurbished';

export interface ProductRow {
  id: string;
  store_id: string;
  owner_id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  condition: ProductCondition;
  price_ugx: number;
  sale_price_ugx: number | null;
  currency: string;
  sku: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  specifications: { label: string; value: string }[];
  delivery_info: string | null;
  status: ProductStatus;
  is_featured: boolean;
  published_at: string | null;
  rating_avg: string | number;
  rating_count: number;
  sales_count: number;
  view_count: number;
  flagged_at: string | null;
  flagged_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface ImageRow { id: string; product_id: string; url: string; position: number }
export interface VariationRow {
  id: string; product_id: string; name: string; value: string; price_delta_ugx: number;
  stock_quantity: number; reserved_quantity: number; sku: string | null; position: number;
}
export interface PromotionRow extends PromotionLike {
  id: string; store_id: string; name: string; created_at: string;
}

export interface ProductInput {
  name: string;
  description?: string | null;
  category: string;
  subcategory?: string | null;
  brand?: string | null;
  model?: string | null;
  condition?: ProductCondition;
  priceUgx: number;
  salePriceUgx?: number | null;
  sku?: string | null;
  stockQuantity?: number;
  lowStockThreshold?: number;
  specifications?: { label: string; value: string }[];
  deliveryInfo?: string | null;
  isFeatured?: boolean;
  images?: string[];
  variations?: { name: string; value: string; priceDeltaUgx?: number; stockQuantity?: number; sku?: string | null }[];
}

export function availableQuantity(p: { stock_quantity: number; reserved_quantity: number }): number {
  return Math.max(0, Number(p.stock_quantity) - Number(p.reserved_quantity));
}

export async function findProduct(id: string): Promise<ProductRow | null> {
  return queryOne<ProductRow>('SELECT * FROM seller_products WHERE id = $1', [id]);
}

export async function findOwnedProduct(id: string, ownerId: string): Promise<ProductRow | null> {
  return queryOne<ProductRow>('SELECT * FROM seller_products WHERE id = $1 AND owner_id = $2', [id, ownerId]);
}

export async function listImages(productIds: string[]): Promise<Record<string, ImageRow[]>> {
  if (productIds.length === 0) return {};
  const rows = await query<ImageRow>(
    'SELECT * FROM seller_product_images WHERE product_id = ANY($1) ORDER BY position, created_at',
    [productIds]
  );
  const out: Record<string, ImageRow[]> = {};
  for (const r of rows) (out[r.product_id] ??= []).push(r);
  return out;
}

export async function listVariations(productIds: string[]): Promise<Record<string, VariationRow[]>> {
  if (productIds.length === 0) return {};
  const rows = await query<VariationRow>(
    'SELECT * FROM seller_product_variations WHERE product_id = ANY($1) ORDER BY position, created_at',
    [productIds]
  );
  const out: Record<string, VariationRow[]> = {};
  for (const r of rows) (out[r.product_id] ??= []).push(r);
  return out;
}

export async function livePromotionsFor(productIds: string[]): Promise<Record<string, PromotionRow[]>> {
  if (productIds.length === 0) return {};
  const rows = await query<PromotionRow & { product_id: string }>(
    `SELECT pr.*, pp.product_id
       FROM seller_promotion_products pp
       JOIN seller_promotions pr ON pr.id = pp.promotion_id
      WHERE pp.product_id = ANY($1)
        AND pr.is_active
        AND pr.starts_at <= now()
        AND (pr.ends_at IS NULL OR pr.ends_at >= now())`,
    [productIds]
  );
  const out: Record<string, PromotionRow[]> = {};
  for (const r of rows) (out[r.product_id] ??= []).push(r);
  return out;
}

async function syncVariations(tx: Tx, productId: string, variations: NonNullable<ProductInput['variations']>) {
  await txQuery(tx, 'DELETE FROM seller_product_variations WHERE product_id = $1', [productId]);
  let position = 0;
  for (const v of variations) {
    await txQuery(
      tx,
      `INSERT INTO seller_product_variations (product_id, name, value, price_delta_ugx, stock_quantity, sku, position)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [productId, v.name.trim(), v.value.trim(), v.priceDeltaUgx ?? 0, v.stockQuantity ?? 0, v.sku?.trim() || null, position++]
    );
  }
  if (variations.length > 0) {
    await txQuery(
      tx,
      `UPDATE seller_products SET
         stock_quantity = (SELECT COALESCE(SUM(stock_quantity), 0) FROM seller_product_variations WHERE product_id = $1),
         reserved_quantity = (SELECT COALESCE(SUM(reserved_quantity), 0) FROM seller_product_variations WHERE product_id = $1)
       WHERE id = $1`,
      [productId]
    );
  }
}

async function syncImages(tx: Tx, productId: string, images: string[]) {
  await txQuery(tx, 'DELETE FROM seller_product_images WHERE product_id = $1', [productId]);
  let position = 0;
  for (const url of images.slice(0, 8)) {
    await txQuery(tx, 'INSERT INTO seller_product_images (product_id, url, position) VALUES ($1,$2,$3)', [productId, url, position++]);
  }
}

export async function createProduct(storeId: string, ownerId: string, input: ProductInput): Promise<ProductRow> {
  return withTransaction(async (tx) => {
    const row = await txOne<ProductRow>(
      tx,
      `INSERT INTO seller_products
         (store_id, owner_id, name, description, category, subcategory, brand, model, condition,
          price_ugx, sale_price_ugx, sku, stock_quantity, low_stock_threshold, specifications, delivery_info, is_featured)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
       RETURNING *`,
      [
        storeId, ownerId, input.name.trim(), input.description ?? null, input.category, input.subcategory ?? null,
        input.brand ?? null, input.model ?? null, input.condition ?? 'new', input.priceUgx, input.salePriceUgx ?? null,
        input.sku?.trim() || null, input.stockQuantity ?? 0, input.lowStockThreshold ?? 5,
        JSON.stringify(input.specifications ?? []), input.deliveryInfo ?? null, input.isFeatured ?? false,
      ]
    );
    if (!row) throw new Error('Failed to create product');
    if (input.images) await syncImages(tx, row.id, input.images);
    if (input.variations) await syncVariations(tx, row.id, input.variations);
    if ((input.stockQuantity ?? 0) > 0 && !(input.variations && input.variations.length)) {
      await txQuery(
        tx,
        `INSERT INTO seller_inventory_events (product_id, delta, quantity_after, reason, note, actor_id)
         VALUES ($1,$2,$2,'restock','Opening stock',$3)`,
        [row.id, input.stockQuantity, ownerId]
      );
    }
    const fresh = await txOne<ProductRow>(tx, 'SELECT * FROM seller_products WHERE id = $1', [row.id]);
    return fresh ?? row;
  });
}

export async function updateProduct(productId: string, ownerId: string, input: Partial<ProductInput>): Promise<ProductRow> {
  return withTransaction(async (tx) => {
    const columns: Record<string, unknown> = {
      name: input.name?.trim(),
      description: input.description,
      category: input.category,
      subcategory: input.subcategory,
      brand: input.brand,
      model: input.model,
      condition: input.condition,
      price_ugx: input.priceUgx,
      sale_price_ugx: input.salePriceUgx,
      sku: input.sku === undefined ? undefined : (input.sku?.trim() || null),
      low_stock_threshold: input.lowStockThreshold,
      specifications: input.specifications === undefined ? undefined : JSON.stringify(input.specifications),
      delivery_info: input.deliveryInfo,
      is_featured: input.isFeatured,
    };
    const sets: string[] = [];
    const params: unknown[] = [productId, ownerId];
    for (const [column, value] of Object.entries(columns)) {
      if (value === undefined) continue;
      params.push(value);
      sets.push(`${column} = $${params.length}`);
    }
    if (input.stockQuantity !== undefined && !(input.variations && input.variations.length)) {
      const current = await txOne<ProductRow>(tx, 'SELECT * FROM seller_products WHERE id = $1 AND owner_id = $2 FOR UPDATE', [productId, ownerId]);
      if (!current) throw new Error('Product not found');
      const delta = input.stockQuantity - Number(current.stock_quantity);
      if (delta !== 0) {
        params.push(input.stockQuantity);
        sets.push(`stock_quantity = $${params.length}`);
        await txQuery(
          tx,
          `INSERT INTO seller_inventory_events (product_id, delta, quantity_after, reason, note, actor_id)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [productId, delta, input.stockQuantity, delta > 0 ? 'restock' : 'correction', 'Edited on the product form', ownerId]
        );
      }
    }
    sets.push('updated_at = now()');
    const row = await txOne<ProductRow>(
      tx,
      `UPDATE seller_products SET ${sets.join(', ')} WHERE id = $1 AND owner_id = $2 RETURNING *`,
      params
    );
    if (!row) throw new Error('Product not found');
    if (input.images) await syncImages(tx, productId, input.images);
    if (input.variations) await syncVariations(tx, productId, input.variations);
    const fresh = await txOne<ProductRow>(tx, 'SELECT * FROM seller_products WHERE id = $1', [productId]);
    return fresh ?? row;
  });
}

export async function setProductStatus(productId: string, status: ProductStatus): Promise<ProductRow | null> {
  const row = await queryOne<ProductRow>(
    `UPDATE seller_products SET
       status = $2,
       published_at = CASE WHEN $2 = 'published' THEN COALESCE(published_at, now()) ELSE published_at END,
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [productId, status]
  );
  if (row) await refreshStoreCounters(row.store_id);
  return row;
}

export async function deleteProduct(productId: string, ownerId: string): Promise<boolean> {
  const row = await queryOne<{ store_id: string }>(
    'DELETE FROM seller_products WHERE id = $1 AND owner_id = $2 RETURNING store_id',
    [productId, ownerId]
  );
  if (row) await refreshStoreCounters(row.store_id);
  return !!row;
}

export async function duplicateProduct(productId: string, ownerId: string): Promise<ProductRow> {
  const source = await findOwnedProduct(productId, ownerId);
  if (!source) throw new Error('Product not found');
  const images = (await listImages([productId]))[productId] ?? [];
  const variations = (await listVariations([productId]))[productId] ?? [];
  return createProduct(source.store_id, ownerId, {
    name: `${source.name} (copy)`,
    description: source.description,
    category: source.category,
    subcategory: source.subcategory,
    brand: source.brand,
    model: source.model,
    condition: source.condition,
    priceUgx: Number(source.price_ugx),
    salePriceUgx: source.sale_price_ugx ? Number(source.sale_price_ugx) : null,
    sku: null,
    stockQuantity: 0,
    lowStockThreshold: source.low_stock_threshold,
    specifications: source.specifications,
    deliveryInfo: source.delivery_info,
    images: images.map((i) => i.url),
    variations: variations.map((v) => ({ name: v.name, value: v.value, priceDeltaUgx: Number(v.price_delta_ugx), stockQuantity: 0, sku: null })),
  });
}

export async function adjustStock(input: {
  productId: string; ownerId: string; variationId?: string | null; delta: number;
  reason: 'manual' | 'restock' | 'correction'; note?: string | null;
}): Promise<ProductRow> {
  return withTransaction(async (tx) => {
    const product = await txOne<ProductRow>(tx, 'SELECT * FROM seller_products WHERE id = $1 AND owner_id = $2 FOR UPDATE', [input.productId, input.ownerId]);
    if (!product) throw new Error('Product not found');

    let after: number;
    if (input.variationId) {
      const variation = await txOne<VariationRow>(
        tx,
        `UPDATE seller_product_variations SET stock_quantity = stock_quantity + $3
          WHERE id = $1 AND product_id = $2 AND stock_quantity + $3 >= 0 RETURNING *`,
        [input.variationId, input.productId, input.delta]
      );
      if (!variation) throw new Error('That change would take the variation below zero');
      after = Number(variation.stock_quantity);
      await txQuery(
        tx,
        `UPDATE seller_products SET
           stock_quantity = (SELECT COALESCE(SUM(stock_quantity), 0) FROM seller_product_variations WHERE product_id = $1),
           updated_at = now()
         WHERE id = $1`,
        [input.productId]
      );
    } else {
      const updated = await txOne<ProductRow>(
        tx,
        `UPDATE seller_products SET stock_quantity = stock_quantity + $2, updated_at = now()
          WHERE id = $1 AND stock_quantity + $2 >= 0 RETURNING *`,
        [input.productId, input.delta]
      );
      if (!updated) throw new Error('That change would take stock below zero');
      after = Number(updated.stock_quantity);
    }

    await txQuery(
      tx,
      `INSERT INTO seller_inventory_events (product_id, variation_id, delta, quantity_after, reason, note, actor_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [input.productId, input.variationId ?? null, input.delta, after, input.reason, input.note ?? null, input.ownerId]
    );
    const fresh = await txOne<ProductRow>(tx, 'SELECT * FROM seller_products WHERE id = $1', [input.productId]);
    return fresh!;
  });
}

export async function listInventoryEvents(productId: string, limit = 50) {
  return query(
    `SELECT e.*, v.name AS variation_name, v.value AS variation_value
       FROM seller_inventory_events e
       LEFT JOIN seller_product_variations v ON v.id = e.variation_id
      WHERE e.product_id = $1
      ORDER BY e.created_at DESC
      LIMIT $2`,
    [productId, limit]
  );
}

export interface StoreProductFilters {
  status?: ProductStatus | 'all';
  q?: string;
  category?: string;
  lowStock?: boolean;
  sort?: 'newest' | 'oldest' | 'price_asc' | 'price_desc' | 'stock' | 'sales';
  limit?: number;
  offset?: number;
}

export async function listStoreProducts(storeId: string, f: StoreProductFilters = {}) {
  const conditions = ['store_id = $1'];
  const params: unknown[] = [storeId];
  if (f.status && f.status !== 'all') { params.push(f.status); conditions.push(`status = $${params.length}`); }
  if (f.category) { params.push(f.category); conditions.push(`category = $${params.length}`); }
  if (f.q) { params.push(`%${f.q.toLowerCase()}%`); conditions.push(`(LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(sku,'')) LIKE $${params.length} OR LOWER(COALESCE(brand,'')) LIKE $${params.length})`); }
  if (f.lowStock) conditions.push('(stock_quantity - reserved_quantity) <= low_stock_threshold');
  const order = {
    newest: 'created_at DESC',
    oldest: 'created_at ASC',
    price_asc: 'price_ugx ASC',
    price_desc: 'price_ugx DESC',
    stock: '(stock_quantity - reserved_quantity) ASC',
    sales: 'sales_count DESC',
  }[f.sort ?? 'newest'];
  const limit = Math.min(200, f.limit ?? 100);
  const offset = f.offset ?? 0;
  params.push(limit, offset);
  const rows = await query<ProductRow>(
    `SELECT * FROM seller_products WHERE ${conditions.join(' AND ')} ORDER BY ${order} LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );
  const total = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seller_products WHERE ${conditions.join(' AND ')}`,
    params.slice(0, params.length - 2)
  );
  const ids = rows.map((r) => r.id);
  const images = await listImages(ids);
  return {
    total: total?.n ?? rows.length,
    products: rows.map((p) => ({ ...p, images: images[p.id] ?? [], available: availableQuantity(p) })),
  };
}

export interface PublicProductFilters {
  q?: string;
  category?: string;
  storeId?: string;
  city?: string;
  minPrice?: number;
  maxPrice?: number;
  condition?: ProductCondition;
  featured?: boolean;
  inStockOnly?: boolean;
  sort?: 'newest' | 'price_asc' | 'price_desc' | 'popular' | 'rating';
  limit?: number;
  offset?: number;
}

const PUBLIC_PRODUCT_BASE = `
  SELECT p.*, s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo, s.city AS store_city,
         s.rating_avg AS store_rating, s.rating_count AS store_rating_count,
         (sp.verification_status = 'verified') AS store_verified,
         (SELECT url FROM seller_product_images i WHERE i.product_id = p.id ORDER BY position, created_at LIMIT 1) AS image_url
    FROM seller_products p
    JOIN seller_stores s ON s.id = p.store_id
    JOIN seller_profiles sp ON sp.user_id = s.owner_id
    JOIN users u ON u.id = s.owner_id AND u.is_active
   WHERE p.status = 'published' AND s.status = 'active' AND NOT sp.is_suspended AND p.flagged_at IS NULL`;

export async function listPublicProducts(f: PublicProductFilters = {}) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (f.q) {
    params.push(f.q.trim().split(/\s+/).filter(Boolean).map((w) => w.replace(/[^\w]/g, '') + ':*').join(' & '));
    params.push(`%${f.q.toLowerCase()}%`);
    conditions.push(`(p.search_text @@ to_tsquery('simple', $${params.length - 1}) OR LOWER(p.name) LIKE $${params.length} OR LOWER(s.name) LIKE $${params.length})`);
  }
  if (f.category) { params.push(f.category); conditions.push(`p.category = $${params.length}`); }
  if (f.storeId) { params.push(f.storeId); conditions.push(`p.store_id = $${params.length}`); }
  if (f.city) { params.push(f.city); conditions.push(`s.city = $${params.length}`); }
  if (f.minPrice !== undefined) { params.push(f.minPrice); conditions.push(`COALESCE(p.sale_price_ugx, p.price_ugx) >= $${params.length}`); }
  if (f.maxPrice !== undefined) { params.push(f.maxPrice); conditions.push(`COALESCE(p.sale_price_ugx, p.price_ugx) <= $${params.length}`); }
  if (f.condition) { params.push(f.condition); conditions.push(`p.condition = $${params.length}`); }
  if (f.featured) conditions.push('p.is_featured');
  if (f.inStockOnly) conditions.push('(p.stock_quantity - p.reserved_quantity) > 0');
  const where = conditions.length ? ' AND ' + conditions.join(' AND ') : '';
  const order = {
    newest: 'p.published_at DESC NULLS LAST, p.created_at DESC',
    price_asc: 'COALESCE(p.sale_price_ugx, p.price_ugx) ASC',
    price_desc: 'COALESCE(p.sale_price_ugx, p.price_ugx) DESC',
    popular: 'p.sales_count DESC, p.view_count DESC, p.published_at DESC',
    rating: 'p.rating_avg DESC, p.rating_count DESC, p.published_at DESC',
  }[f.sort ?? 'newest'];
  const limit = Math.min(60, f.limit ?? 24);
  const offset = f.offset ?? 0;
  const rows = await query<any>(`${PUBLIC_PRODUCT_BASE}${where} ORDER BY ${order} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limit, offset]);
  const total = await queryOne<{ n: number }>(
    `SELECT count(*)::int AS n FROM seller_products p JOIN seller_stores s ON s.id = p.store_id JOIN seller_profiles sp ON sp.user_id = s.owner_id JOIN users u ON u.id = s.owner_id AND u.is_active
      WHERE p.status = 'published' AND s.status = 'active' AND NOT sp.is_suspended AND p.flagged_at IS NULL${where}`,
    params
  );
  const promos = await livePromotionsFor(rows.map((r) => r.id));
  return { total: total?.n ?? rows.length, products: rows.map((p) => toPublicProduct(p, promos[p.id] ?? [])) };
}

export function toPublicProduct(p: any, promotions: PromotionLike[] = []) {
  const pricing = effectivePrice(p, promotions);
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    subcategory: p.subcategory,
    brand: p.brand,
    model: p.model,
    condition: p.condition,
    currency: p.currency,
    priceUgx: pricing.price,
    listPriceUgx: pricing.listPrice,
    discountPercent: pricing.discountPercent,
    promotionName: pricing.promotionName,
    available: availableQuantity(p),
    inStock: availableQuantity(p) > 0,
    lowStock: availableQuantity(p) > 0 && availableQuantity(p) <= Number(p.low_stock_threshold),
    specifications: p.specifications ?? [],
    deliveryInfo: p.delivery_info,
    isFeatured: p.is_featured,
    ratingAvg: Number(p.rating_avg ?? 0),
    ratingCount: Number(p.rating_count ?? 0),
    salesCount: Number(p.sales_count ?? 0),
    publishedAt: p.published_at,
    imageUrl: p.image_url ?? null,
    store: p.store_name
      ? {
          id: p.store_id,
          name: p.store_name,
          slug: p.store_slug,
          logoUrl: p.store_logo,
          city: p.store_city,
          ratingAvg: Number(p.store_rating ?? 0),
          ratingCount: Number(p.store_rating_count ?? 0),
          isVerified: !!p.store_verified,
        }
      : undefined,
  };
}

export async function getPublicProduct(id: string) {
  const row = await queryOne<any>(`${PUBLIC_PRODUCT_BASE} AND p.id = $1`, [id]);
  if (!row) return null;
  const [images, variations, promos, reviews] = await Promise.all([
    listImages([id]),
    listVariations([id]),
    livePromotionsFor([id]),
    query(
      `SELECT r.id, r.stars, r.comment, r.created_at, u.full_name AS author_name, u.avatar_url AS author_avatar
         FROM seller_product_reviews r JOIN users u ON u.id = r.author_id
        WHERE r.product_id = $1 ORDER BY r.created_at DESC LIMIT 20`,
      [id]
    ),
  ]);
  const product = toPublicProduct(row, promos[id] ?? []);
  const pricing = product.priceUgx;
  return {
    ...product,
    images: (images[id] ?? []).map((i) => i.url),
    variations: (variations[id] ?? []).map((v) => ({
      id: v.id,
      name: v.name,
      value: v.value,
      priceUgx: Math.max(1, pricing + Number(v.price_delta_ugx)),
      available: availableQuantity(v),
    })),
    reviews,
    storeDetail: {
      id: row.store_id,
      name: row.store_name,
      slug: row.store_slug,
      logoUrl: row.store_logo,
      city: row.store_city,
      ratingAvg: Number(row.store_rating ?? 0),
      ratingCount: Number(row.store_rating_count ?? 0),
      isVerified: !!row.store_verified,
    },
  };
}

export async function recordProductView(productId: string): Promise<void> {
  await query(
    `INSERT INTO seller_product_views (product_id, day, views) VALUES ($1, CURRENT_DATE, 1)
     ON CONFLICT (product_id, day) DO UPDATE SET views = seller_product_views.views + 1`,
    [productId]
  );
  await query('UPDATE seller_products SET view_count = view_count + 1 WHERE id = $1', [productId]);
}

export async function listPublicStores(f: { q?: string; category?: string; city?: string; sort?: 'popular' | 'newest' | 'rating'; limit?: number } = {}) {
  const conditions: string[] = [];
  const params: unknown[] = [];
  if (f.q) { params.push(`%${f.q.toLowerCase()}%`); conditions.push(`(LOWER(s.name) LIKE $${params.length} OR LOWER(COALESCE(s.tagline,'')) LIKE $${params.length} OR LOWER(COALESCE(s.description,'')) LIKE $${params.length})`); }
  if (f.category) { params.push(f.category); conditions.push(`s.category = $${params.length}`); }
  if (f.city) { params.push(f.city); conditions.push(`s.city = $${params.length}`); }
  const where = conditions.length ? ' AND ' + conditions.join(' AND ') : '';
  const order = {
    popular: 's.follower_count DESC, s.sales_count DESC, s.product_count DESC, s.created_at DESC',
    newest: 's.created_at DESC',
    rating: 's.rating_avg DESC, s.rating_count DESC, s.follower_count DESC',
  }[f.sort ?? 'popular'];
  params.push(Math.min(60, f.limit ?? 24));
  return query(
    `SELECT ${PUBLIC_STORE_COLUMNS}
       FROM seller_stores s
       JOIN seller_profiles sp ON sp.user_id = s.owner_id
       JOIN users u ON u.id = s.owner_id AND u.is_active
      WHERE s.status = 'active' AND NOT sp.is_suspended AND s.product_count > 0${where}
      ORDER BY ${order}
      LIMIT $${params.length}`,
    params
  );
}

export async function publicCategories() {
  return query<{ category: string; products: number; stores: number }>(
    `SELECT p.category, count(*)::int AS products, count(DISTINCT p.store_id)::int AS stores
       FROM seller_products p
       JOIN seller_stores s ON s.id = p.store_id AND s.status = 'active'
       JOIN seller_profiles sp ON sp.user_id = s.owner_id AND NOT sp.is_suspended
      WHERE p.status = 'published' AND p.flagged_at IS NULL
      GROUP BY p.category
      ORDER BY products DESC, p.category`
  );
}

export async function listPromotions(storeId: string) {
  const promos = await query<PromotionRow & { product_ids: string[] }>(
    `SELECT pr.*, COALESCE(array_agg(pp.product_id) FILTER (WHERE pp.product_id IS NOT NULL), '{}') AS product_ids
       FROM seller_promotions pr
       LEFT JOIN seller_promotion_products pp ON pp.promotion_id = pr.id
      WHERE pr.store_id = $1
      GROUP BY pr.id
      ORDER BY pr.created_at DESC`,
    [storeId]
  );
  return promos;
}

export async function createPromotion(storeId: string, input: { name: string; kind: 'percentage' | 'fixed'; value: number; startsAt?: string | null; endsAt?: string | null; productIds: string[] }) {
  return withTransaction(async (tx) => {
    const promo = await txOne<PromotionRow>(
      tx,
      `INSERT INTO seller_promotions (store_id, name, kind, value, starts_at, ends_at)
       VALUES ($1,$2,$3,$4,COALESCE($5::timestamptz, now()),$6) RETURNING *`,
      [storeId, input.name.trim(), input.kind, input.value, input.startsAt ?? null, input.endsAt ?? null]
    );
    if (!promo) throw new Error('Failed to create promotion');
    const owned = await txQuery<{ id: string }>(tx, 'SELECT id FROM seller_products WHERE store_id = $1 AND id = ANY($2)', [storeId, input.productIds]);
    for (const p of owned) {
      await txQuery(tx, 'INSERT INTO seller_promotion_products (promotion_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [promo.id, p.id]);
    }
    return { ...promo, product_ids: owned.map((p) => p.id) };
  });
}

export async function setPromotionActive(storeId: string, promotionId: string, active: boolean) {
  return queryOne<PromotionRow>(
    'UPDATE seller_promotions SET is_active = $3 WHERE id = $1 AND store_id = $2 RETURNING *',
    [promotionId, storeId, active]
  );
}

export async function deletePromotion(storeId: string, promotionId: string): Promise<boolean> {
  const row = await queryOne('DELETE FROM seller_promotions WHERE id = $1 AND store_id = $2 RETURNING id', [promotionId, storeId]);
  return !!row;
}

export async function refreshProductRating(productId: string): Promise<void> {
  await query(
    `UPDATE seller_products p SET
       rating_count = (SELECT count(*) FROM seller_product_reviews r WHERE r.product_id = p.id),
       rating_avg = COALESCE((SELECT ROUND(AVG(stars)::numeric, 2) FROM seller_product_reviews r WHERE r.product_id = p.id), 0)
     WHERE p.id = $1`,
    [productId]
  );
}
