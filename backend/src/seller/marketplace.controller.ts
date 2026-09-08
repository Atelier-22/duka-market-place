import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';
import { query, queryOne } from '../db/pool';
import { findUserById } from '../models/user.model';
import { verifyAccessToken } from '../utils/auth';
import { findPublicStoreBySlug, follow, isFollowing, listFollowing, unfollow } from './store.model';
import { STORE_CATEGORIES, matchCategories } from './categories';
import { Interpretation, interpretQuery } from '../knowledge/interpret';
import { PublicProductFilters, compareProducts, getPublicProduct, listPublicProducts, listPublicStores, publicCategories, recordProductView } from './product.model';
import { listCustomerOrders, orderWithDetails, placeOrders, publicStoreReviews, reviewOrder, transitionOrder } from './order.model';
import { notifySellerFollower } from './notify';

function optionalUser(req: Request): { id: string; role: string } | null {
  if (req.user) return { id: req.user.id, role: req.user.role };
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return null;
  try {
    const payload = verifyAccessToken(header.slice(7));
    return { id: payload.sub, role: payload.role };
  } catch {
    return null;
  }
}

export async function home(_req: Request, res: Response) {
  const [featured, newest, stores, categories] = await Promise.all([
    listPublicProducts({ featured: true, inStockOnly: true, limit: 8, sort: 'popular' }),
    listPublicProducts({ inStockOnly: true, limit: 12, sort: 'newest' }),
    listPublicStores({ sort: 'popular', limit: 8 }),
    publicCategories(),
  ]);
  const popular = featured.products.length >= 4 ? featured.products : (await listPublicProducts({ inStockOnly: true, limit: 8, sort: 'popular' })).products;
  res.json({ featured: popular, newest: newest.products, stores, categories });
}

const listSchema = z.object({
  q: z.string().trim().max(80).optional(),
  category: z.enum(STORE_CATEGORIES).optional(),
  store: z.string().uuid().optional(),
  city: z.string().trim().max(80).optional(),
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  inStock: z.enum(['1', 'true']).optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'rating']).optional(),
  limit: z.coerce.number().int().min(1).max(60).optional(),
  offset: z.coerce.number().int().min(0).max(5000).optional(),
});

export async function products(req: Request, res: Response) {
  const q = listSchema.parse(req.query);
  const extra = z.object({ kind: z.string().trim().max(80).optional(), brand: z.string().trim().max(80).optional() }).parse(req.query);
  const base: PublicProductFilters = { ...q, storeId: q.store, inStockOnly: !!q.inStock, attributes: attributeFilters(req.query as Record<string, unknown>), kind: extra.kind || undefined, brand: extra.brand || undefined };
  if (q.q) {
    const interpretation = await interpretQuery(q.q);
    const result = await searchWithKnowledge(q.q, interpretation, base);
    res.json({ ...result, interpretation });
    return;
  }
  res.json(await listPublicProducts(base));
}

export async function product(req: Request, res: Response) {
  const detail = await getPublicProduct(req.params.id);
  if (!detail) throw new ApiError(404, 'Product not found');
  const viewer = optionalUser(req);
  if (!viewer || viewer.id !== (await queryOne<{ owner_id: string }>('SELECT owner_id FROM seller_products WHERE id = $1', [detail.id]))?.owner_id) {
    recordProductView(detail.id).catch(() => undefined);
  }
  const following = viewer ? await isFollowing(viewer.id, detail.storeDetail.id) : false;
  const related = await listPublicProducts({ category: detail.category, inStockOnly: true, limit: 8, sort: 'popular' });
  res.json({ product: detail, following, related: related.products.filter((p) => p.id !== detail.id).slice(0, 6) });
}

export async function stores(req: Request, res: Response) {
  const q = z.object({
    q: z.string().trim().max(80).optional(),
    category: z.enum(STORE_CATEGORIES).optional(),
    city: z.string().trim().max(80).optional(),
    sort: z.enum(['popular', 'newest', 'rating']).optional(),
    limit: z.coerce.number().int().min(1).max(60).optional(),
  }).parse(req.query);
  res.json({ stores: await listPublicStores(q) });
}

export async function store(req: Request, res: Response) {
  const row = await findPublicStoreBySlug(req.params.slug);
  if (!row) throw new ApiError(404, 'Store not found');
  const q = z.object({
    q: z.string().trim().max(80).optional(),
    category: z.string().trim().max(40).optional(),
    sort: z.enum(['newest', 'price_asc', 'price_desc', 'popular', 'rating']).optional(),
    limit: z.coerce.number().int().min(1).max(60).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }).parse(req.query);
  const viewer = optionalUser(req);
  const [items, reviews, following, categories] = await Promise.all([
    listPublicProducts({ ...q, storeId: row.id }),
    publicStoreReviews(row.id),
    viewer ? isFollowing(viewer.id, row.id) : Promise.resolve(false),
    query<{ category: string; n: number }>(
      `SELECT category, count(*)::int AS n FROM seller_products WHERE store_id = $1 AND status = 'published' AND flagged_at IS NULL GROUP BY category ORDER BY n DESC`,
      [row.id]
    ),
  ]);
  const featured = items.products.filter((p) => p.isFeatured).slice(0, 4);
  res.json({ store: row, products: items.products, total: items.total, featured, reviews, following, categories });
}

export async function search(req: Request, res: Response) {
  const { q, limit } = z.object({ q: z.string().trim().min(1).max(80), limit: z.coerce.number().int().min(1).max(30).optional() }).parse(req.query);
  const interpretation = await interpretQuery(q);
  const [items, shops] = await Promise.all([
    searchWithKnowledge(q, interpretation, { limit: limit ?? 12, sort: 'popular' }),
    listPublicStores({ q, limit: 6 }),
  ]);
  const categories = matchCategories(q);
  res.json({ products: items.products, totalProducts: items.total, stores: shops, categories, interpretation, usedKnowledge: items.usedKnowledge });
}

function attributeFilters(queryParams: Record<string, unknown>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [key, raw] of Object.entries(queryParams)) {
    if (!key.startsWith('attr_')) continue;
    const attr = key.slice(5).toLowerCase().replace(/[^a-z0-9-]/g, '');
    const values = (Array.isArray(raw) ? raw : [raw]).flatMap((v) => String(v).split('|')).map((v) => v.trim()).filter(Boolean).slice(0, 10);
    if (attr && values.length) out[attr] = values;
  }
  return out;
}

async function searchWithKnowledge(q: string, interpretation: Interpretation, base: Partial<PublicProductFilters>) {
  const structured: Partial<PublicProductFilters> = {};
  if (interpretation.kind) structured.kind = interpretation.kindTerms.length ? interpretation.kindTerms : interpretation.kind;
  if (interpretation.brand) structured.brand = interpretation.brand;
  if (Object.keys(interpretation.attributes).length) structured.attributes = { ...(base.attributes ?? {}), ...interpretation.attributes };
  const hasStructure = Object.keys(structured).length > 0;
  if (hasStructure) {
    const smart = await listPublicProducts({ ...base, ...structured, q: interpretation.text || undefined });
    if (smart.total > 0) return { ...smart, usedKnowledge: true };
    if (interpretation.text) {
      const loose = await listPublicProducts({ ...base, ...structured, q: undefined });
      if (loose.total > 0) return { ...loose, usedKnowledge: true };
    }
  }
  const plain = await listPublicProducts({ ...base, q });
  return { ...plain, usedKnowledge: false };
}

export async function compare(req: Request, res: Response) {
  const { ids } = z.object({ ids: z.string().min(1).max(400) }).parse(req.query);
  const list = [...new Set(ids.split(',').map((s) => s.trim()).filter((s) => /^[0-9a-f-]{36}$/i.test(s)))].slice(0, 4);
  if (list.length < 1) throw new ApiError(400, 'Choose products to compare');
  res.json(await compareProducts(list));
}

export async function categories(_req: Request, res: Response) {
  res.json({ categories: await publicCategories(), all: STORE_CATEGORIES });
}

export async function followStore(req: Request, res: Response) {
  const row = await findPublicStoreBySlug(req.params.slug);
  if (!row) throw new ApiError(404, 'Store not found');
  const me = await findUserById(req.user!.id);
  if (!me) throw new ApiError(404, 'User not found');
  const owner = await queryOne<{ owner_id: string }>('SELECT owner_id FROM seller_stores WHERE id = $1', [row.id]);
  if (owner?.owner_id === me.id) throw new ApiError(400, 'You cannot follow your own store');
  const added = await follow(me.id, row.id);
  if (added && owner) await notifySellerFollower({ sellerId: owner.owner_id, followerName: me.full_name });
  const fresh = await queryOne<{ follower_count: number }>('SELECT follower_count FROM seller_stores WHERE id = $1', [row.id]);
  res.json({ following: true, followerCount: fresh?.follower_count ?? 0 });
}

export async function unfollowStore(req: Request, res: Response) {
  const row = await findPublicStoreBySlug(req.params.slug);
  if (!row) throw new ApiError(404, 'Store not found');
  await unfollow(req.user!.id, row.id);
  const fresh = await queryOne<{ follower_count: number }>('SELECT follower_count FROM seller_stores WHERE id = $1', [row.id]);
  res.json({ following: false, followerCount: fresh?.follower_count ?? 0 });
}

export async function following(req: Request, res: Response) {
  res.json({ stores: await listFollowing(req.user!.id) });
}

const checkoutSchema = z.object({
  items: z.array(z.object({
    productId: z.string().uuid(),
    variationId: z.string().uuid().nullable().optional(),
    quantity: z.number().int().min(1).max(50),
  })).min(1).max(30),
  addressId: z.string().uuid().nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
});

export async function checkout(req: Request, res: Response) {
  if (req.user!.role !== 'customer' && req.user!.role !== 'shopper') {
    throw new ApiError(403, 'Switch to your customer account to buy');
  }
  const input = checkoutSchema.parse(req.body);
  const me = await findUserById(req.user!.id);
  if (!me) throw new ApiError(404, 'User not found');
  const orders = await placeOrders({
    customer: { id: me.id, fullName: me.full_name, phone: me.phone },
    lines: input.items,
    addressId: input.addressId,
    notes: input.notes,
  });
  res.status(201).json({ orders });
}

export async function myPurchases(req: Request, res: Response) {
  res.json({ orders: await listCustomerOrders(req.user!.id) });
}

export async function myPurchase(req: Request, res: Response) {
  const detail = await orderWithDetails(req.params.id);
  if (!detail || detail.order.customer_id !== req.user!.id) throw new ApiError(404, 'Order not found');
  const reviews = await query(
    'SELECT product_id, stars, comment FROM seller_product_reviews WHERE order_id = $1 AND author_id = $2',
    [detail.order.id, req.user!.id]
  );
  const storeReview = await queryOne('SELECT stars, comment FROM seller_store_reviews WHERE order_id = $1', [detail.order.id]);
  res.json({ ...detail, productReviews: reviews, storeReview });
}

export async function cancelPurchase(req: Request, res: Response) {
  const input = z.object({ reason: z.string().trim().max(300).nullable().optional() }).parse(req.body);
  const existing = await queryOne<{ customer_id: string }>('SELECT customer_id FROM seller_orders WHERE id = $1', [req.params.id]);
  if (!existing || existing.customer_id !== req.user!.id) throw new ApiError(404, 'Order not found');
  const order = await transitionOrder({ orderId: req.params.id, to: 'cancelled', actor: { id: req.user!.id, role: 'customer' }, note: input.reason ?? 'Cancelled by the customer' });
  res.json({ order });
}

const reviewSchema = z.object({
  storeStars: z.number().int().min(1).max(5),
  storeComment: z.string().trim().max(1000).nullable().optional(),
  products: z.array(z.object({
    productId: z.string().uuid(),
    stars: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).nullable().optional(),
  })).max(30).default([]),
});

export async function reviewPurchase(req: Request, res: Response) {
  const input = reviewSchema.parse(req.body);
  res.status(201).json(await reviewOrder({ orderId: req.params.id, authorId: req.user!.id, ...input }));
}

export async function sitemap(_req: Request, res: Response) {
  const [productRows, storeRows] = await Promise.all([
    query<{ id: string; updated_at: string }>(
      `SELECT p.id, p.updated_at FROM seller_products p JOIN seller_stores s ON s.id = p.store_id JOIN seller_profiles sp ON sp.user_id = s.owner_id
        WHERE p.status = 'published' AND s.status = 'active' AND NOT sp.is_suspended AND p.flagged_at IS NULL ORDER BY p.published_at DESC LIMIT 5000`
    ),
    query<{ slug: string; updated_at: string }>(
      `SELECT s.slug, s.updated_at FROM seller_stores s JOIN seller_profiles sp ON sp.user_id = s.owner_id WHERE s.status = 'active' AND NOT sp.is_suspended AND s.product_count > 0 ORDER BY s.created_at DESC LIMIT 2000`
    ),
  ]);
  const origin = 'https://www.dukashoppers.com';
  const entries = [
    `<url><loc>${origin}/marketplace</loc><changefreq>hourly</changefreq><priority>0.9</priority></url>`,
    `<url><loc>${origin}/sell</loc><changefreq>monthly</changefreq><priority>0.7</priority></url>`,
    ...storeRows.map((s) => `<url><loc>${origin}/store/${s.slug}</loc><lastmod>${new Date(s.updated_at).toISOString().slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>`),
    ...productRows.map((p) => `<url><loc>${origin}/product/${p.id}</loc><lastmod>${new Date(p.updated_at).toISOString().slice(0, 10)}</lastmod><changefreq>daily</changefreq><priority>0.6</priority></url>`),
  ];
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=1800');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>`);
}
