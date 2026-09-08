import { Request, Response } from 'express';
import { z } from 'zod';
import { ApiError } from '../middleware/errorHandler';
import { mediaUrl } from '../utils/validators';
import { query, queryOne } from '../db/pool';
import { findUserById, findUserByPhoneAndRole, ensureSellerProfile, UserRow, toPublicUser } from '../models/user.model';
import { signAccessToken, signRefreshToken } from '../utils/auth';
import { storageService } from '../services/storage.service';
import { contentMatchesDeclaredType } from '../utils/fileSignature';
import {
  STORE_CATEGORIES, StoreRow, createStore, ensureProfile, findStoreByOwner, getOrCreateSettings, getProfile,
  listFollowers, refreshStoreCounters, setVerificationStatus, uniqueSlug, updateSettings, updateStore,
} from './store.model';
import {
  ProductInput, adjustStock, availableQuantity, createProduct, createPromotion, deletePromotion, deleteProduct,
  duplicateProduct, findOwnedProduct, listImages, listInventoryEvents, listPromotions, listStoreProducts,
  listVariations, setProductStatus, setPromotionActive, updateProduct,
} from './product.model';
import {
  SellerOrderStatus, listStoreCustomers, listStoreOrders, listStoreProductReviews, listStoreReviews,
  orderWithDetails, replyToReview, transitionOrder,
} from './order.model';
import { RangeKey, sellerDashboard, storeAnalytics, storeForecast } from './analytics';
import { notifyFollowersOfNewProduct, notifySellerVerification } from './notify';

interface SellerContext {
  user: UserRow;
  profile: NonNullable<Awaited<ReturnType<typeof getProfile>>>;
  store: StoreRow | null;
}

async function context(req: Request, options: { requireStore?: boolean; write?: boolean } = {}): Promise<SellerContext> {
  const user = await findUserById(req.user!.id);
  if (!user || user.role !== 'seller') throw new ApiError(403, 'This area is for seller accounts');
  const profile = await ensureProfile(user.id);
  if (options.write && profile.is_suspended) {
    throw new ApiError(403, profile.suspended_reason ? `Your store is suspended: ${profile.suspended_reason}` : 'Your store is suspended. Contact Duka support.');
  }
  const store = await findStoreByOwner(user.id);
  if (options.requireStore && !store) throw new ApiError(409, 'Create your store first');
  return { user, profile, store };
}

export async function me(req: Request, res: Response) {
  const { user, profile, store } = await context(req);
  const settings = await getOrCreateSettings(user.id);
  const pendingVerification = await queryOne(
    `SELECT id, status, business_name, created_at, review_note FROM seller_verifications WHERE seller_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [user.id]
  );
  res.json({ user: toPublicUser(user), profile, store, settings, verification: pendingVerification });
}

export async function enroll(req: Request, res: Response) {
  const current = await findUserById(req.user!.id);
  if (!current) throw new ApiError(404, 'User not found');
  if (current.role === 'seller') throw new ApiError(409, 'You already are a seller');
  if (req.user!.kind === 'staff') throw new ApiError(403, 'Staff accounts cannot sell');

  let seller = await findUserByPhoneAndRole(current.phone, 'seller');
  if (!seller) {
    seller = await queryOne<UserRow>(
      `INSERT INTO users (role, full_name, email, phone, password_hash)
       VALUES ('seller', $1, $2, $3, $4) RETURNING *`,
      [current.full_name, current.email, current.phone, current.password_hash]
    );
    if (!seller) throw new Error('Failed to create seller account');
    await ensureSellerProfile(seller.id);
  }

  const linked = [...new Set([...req.user!.linked, current.id])].filter((id) => id !== seller!.id);
  res.status(201).json({
    user: toPublicUser(seller),
    linkedAccounts: (await Promise.all(linked.map(findUserById)))
      .filter((r): r is UserRow => r !== null)
      .map((r) => ({ id: r.id, role: r.role, fullName: r.full_name })),
    accessToken: signAccessToken(seller.id, seller.role, linked),
    refreshToken: signRefreshToken(seller.id, seller.role, linked),
  });
}

const storeSchema = z.object({
  name: z.string().trim().min(2).max(120),
  tagline: z.string().trim().max(160).nullable().optional(),
  description: z.string().trim().max(3000).nullable().optional(),
  category: z.enum(STORE_CATEGORIES),
  city: z.string().trim().min(2).max(80),
  location: z.string().trim().max(200).nullable().optional(),
  contactPhone: z.string().trim().max(30).nullable().optional(),
  contactEmail: z.string().trim().email().max(255).nullable().optional().or(z.literal('').transform(() => null)),
  whatsapp: z.string().trim().max(30).nullable().optional(),
  logoUrl: mediaUrl.nullable().optional(),
  coverUrl: mediaUrl.nullable().optional(),
  policies: z.string().trim().max(3000).nullable().optional(),
  deliveryFeeUgx: z.number().int().min(0).max(5_000_000).optional(),
  fulfilment: z.enum(['delivery', 'pickup', 'shopper']).optional(),
});

export async function createMyStore(req: Request, res: Response) {
  const input = storeSchema.parse(req.body);
  const { user, store } = await context(req, { write: true });
  if (store) throw new ApiError(409, 'You already have a store');
  const created = await createStore(user.id, input);
  res.status(201).json({ store: created });
}

export async function updateMyStore(req: Request, res: Response) {
  const input = storeSchema.partial().extend({
    status: z.enum(['active', 'hidden']).optional(),
    slug: z.string().trim().min(3).max(60).regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and dashes').optional(),
  }).parse(req.body);
  const { store } = await context(req, { requireStore: true, write: true });
  const slug = input.slug ? await uniqueSlug(input.slug, store!.id) : undefined;
  if (input.slug && slug !== input.slug) throw new ApiError(409, 'That store address is taken');
  const updated = await updateStore(store!.id, { ...input, slug });
  res.json({ store: updated });
}

export async function dashboard(req: Request, res: Response) {
  const { store, profile } = await context(req);
  if (!store) return res.json({ store: null, profile });
  const data = await sellerDashboard(store.id);
  res.json({ store, profile, ...data });
}

const specificationSchema = z.object({ label: z.string().trim().min(1).max(60), value: z.string().trim().min(1).max(200) });
const variationSchema = z.object({
  name: z.string().trim().min(1).max(60),
  value: z.string().trim().min(1).max(80),
  priceDeltaUgx: z.number().int().min(-50_000_000).max(50_000_000).optional(),
  stockQuantity: z.number().int().min(0).max(1_000_000).optional(),
  sku: z.string().trim().max(64).nullable().optional(),
});
const productBase = z.object({
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().max(5000).nullable().optional(),
  category: z.enum(STORE_CATEGORIES),
  subcategory: z.string().trim().max(80).nullable().optional(),
  brand: z.string().trim().max(80).nullable().optional(),
  model: z.string().trim().max(80).nullable().optional(),
  condition: z.enum(['new', 'used', 'refurbished']).optional(),
  priceUgx: z.number().int().min(100).max(1_000_000_000),
  salePriceUgx: z.number().int().min(100).max(1_000_000_000).nullable().optional(),
  sku: z.string().trim().max(64).nullable().optional(),
  stockQuantity: z.number().int().min(0).max(1_000_000).optional(),
  lowStockThreshold: z.number().int().min(0).max(10_000).optional(),
  specifications: z.array(specificationSchema).max(30).optional(),
  deliveryInfo: z.string().trim().max(500).nullable().optional(),
  isFeatured: z.boolean().optional(),
  images: z.array(mediaUrl).max(8).optional(),
  variations: z.array(variationSchema).max(40).optional(),
});
const productSchema = productBase.refine((p) => p.salePriceUgx == null || p.salePriceUgx < p.priceUgx, {
  message: 'Sale price must be lower than the regular price', path: ['salePriceUgx'],
});

export async function listProducts(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json({ total: 0, products: [] });
  const q = z.object({
    status: z.enum(['all', 'draft', 'published', 'archived']).optional(),
    q: z.string().max(80).optional(),
    category: z.string().max(40).optional(),
    lowStock: z.enum(['1', 'true']).optional(),
    sort: z.enum(['newest', 'oldest', 'price_asc', 'price_desc', 'stock', 'sales']).optional(),
    limit: z.coerce.number().int().min(1).max(200).optional(),
    offset: z.coerce.number().int().min(0).optional(),
  }).parse(req.query);
  const result = await listStoreProducts(store.id, { ...q, lowStock: !!q.lowStock });
  res.json(result);
}

async function ownedProductOrThrow(req: Request) {
  const product = await findOwnedProduct(req.params.id, req.user!.id);
  if (!product) throw new ApiError(404, 'Product not found');
  return product;
}

export async function getProduct(req: Request, res: Response) {
  const product = await ownedProductOrThrow(req);
  const [images, variations, events] = await Promise.all([listImages([product.id]), listVariations([product.id]), listInventoryEvents(product.id, 20)]);
  res.json({ product: { ...product, available: availableQuantity(product) }, images: images[product.id] ?? [], variations: variations[product.id] ?? [], events });
}

export async function createNewProduct(req: Request, res: Response) {
  const input = productSchema.parse(req.body);
  const { user, store } = await context(req, { requireStore: true, write: true });
  const product = await createProduct(store!.id, user.id, input as ProductInput);
  await refreshStoreCounters(store!.id);
  res.status(201).json({ product });
}

export async function editProduct(req: Request, res: Response) {
  const input = productBase.partial().parse(req.body);
  const { user } = await context(req, { write: true });
  const existing = await ownedProductOrThrow(req);
  if (input.salePriceUgx != null && input.salePriceUgx >= (input.priceUgx ?? Number(existing.price_ugx))) {
    throw new ApiError(400, 'Sale price must be lower than the regular price');
  }
  const product = await updateProduct(existing.id, user.id, input as Partial<ProductInput>);
  res.json({ product });
}

export async function publishProduct(req: Request, res: Response) {
  const { store, profile } = await context(req, { requireStore: true, write: true });
  const product = await ownedProductOrThrow(req);
  if (product.flagged_at) throw new ApiError(409, `This product was flagged by Duka: ${product.flagged_reason ?? 'contact support'}`);
  const images = (await listImages([product.id]))[product.id] ?? [];
  if (images.length === 0) throw new ApiError(400, 'Add at least one photo before publishing');
  if (!product.description || product.description.trim().length < 20) throw new ApiError(400, 'Write a short description before publishing');
  if (store!.status !== 'active') throw new ApiError(409, 'Your store is hidden. Make it visible in Store settings first.');
  const wasPublished = product.status === 'published';
  const updated = await setProductStatus(product.id, 'published');
  let notified = 0;
  if (!wasPublished && !profile.is_suspended) {
    notified = await notifyFollowersOfNewProduct({ storeId: store!.id, storeName: store!.name, productId: product.id, productName: product.name, ownerId: store!.owner_id });
  }
  res.json({ product: updated, followersNotified: notified });
}

export async function unpublishProduct(req: Request, res: Response) {
  await context(req, { write: true });
  const product = await ownedProductOrThrow(req);
  res.json({ product: await setProductStatus(product.id, 'draft') });
}

export async function archiveProduct(req: Request, res: Response) {
  await context(req, { write: true });
  const product = await ownedProductOrThrow(req);
  res.json({ product: await setProductStatus(product.id, 'archived') });
}

export async function removeProduct(req: Request, res: Response) {
  const { user } = await context(req, { write: true });
  const product = await ownedProductOrThrow(req);
  const sold = await queryOne<{ n: number }>('SELECT count(*)::int AS n FROM seller_order_items WHERE product_id = $1', [product.id]);
  if ((sold?.n ?? 0) > 0) {
    await setProductStatus(product.id, 'archived');
    return res.json({ archived: true, deleted: false });
  }
  await deleteProduct(product.id, user.id);
  res.json({ archived: false, deleted: true });
}

export async function copyProduct(req: Request, res: Response) {
  const { user } = await context(req, { write: true });
  const product = await ownedProductOrThrow(req);
  res.status(201).json({ product: await duplicateProduct(product.id, user.id) });
}

export async function inventory(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json({ items: [], summary: { products: 0, lowStock: 0, outOfStock: 0, reserved: 0, valueUgx: 0 } });
  const rows = await query<any>(
    `SELECT p.id, p.name, p.sku, p.status, p.stock_quantity, p.reserved_quantity, p.low_stock_threshold,
            COALESCE(p.sale_price_ugx, p.price_ugx) AS unit_price_ugx,
            (SELECT url FROM seller_product_images i WHERE i.product_id = p.id ORDER BY position LIMIT 1) AS image_url,
            (SELECT json_agg(json_build_object('id', v.id, 'name', v.name, 'value', v.value, 'sku', v.sku,
                    'stock_quantity', v.stock_quantity, 'reserved_quantity', v.reserved_quantity) ORDER BY v.position)
               FROM seller_product_variations v WHERE v.product_id = p.id) AS variations
       FROM seller_products p
      WHERE p.store_id = $1 AND p.status <> 'archived'
      ORDER BY (p.stock_quantity - p.reserved_quantity) ASC, p.name`,
    [store.id]
  );
  const items = rows.map((r) => ({ ...r, available: availableQuantity(r), variations: r.variations ?? [] }));
  const summary = {
    products: items.length,
    lowStock: items.filter((i) => i.available > 0 && i.available <= Number(i.low_stock_threshold)).length,
    outOfStock: items.filter((i) => i.available <= 0).length,
    reserved: items.reduce((s, i) => s + Number(i.reserved_quantity), 0),
    valueUgx: items.reduce((s, i) => s + i.available * Number(i.unit_price_ugx), 0),
  };
  res.json({ items, summary });
}

const adjustSchema = z.object({
  productId: z.string().uuid(),
  variationId: z.string().uuid().nullable().optional(),
  delta: z.number().int().min(-1_000_000).max(1_000_000).refine((d) => d !== 0, 'Enter a change'),
  reason: z.enum(['manual', 'restock', 'correction']).default('manual'),
  note: z.string().trim().max(200).nullable().optional(),
});

export async function adjustInventory(req: Request, res: Response) {
  const input = adjustSchema.parse(req.body);
  const { user } = await context(req, { write: true });
  const owned = await findOwnedProduct(input.productId, user.id);
  if (!owned) throw new ApiError(404, 'Product not found');
  try {
    const product = await adjustStock({ ...input, ownerId: user.id });
    res.json({ product: { ...product, available: availableQuantity(product) } });
  } catch (err) {
    if (err instanceof Error && /below zero/.test(err.message)) throw new ApiError(409, err.message);
    throw err;
  }
}

export async function inventoryHistory(req: Request, res: Response) {
  const product = await ownedProductOrThrow(req);
  res.json({ events: await listInventoryEvents(product.id, 100) });
}

export async function orders(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json({ orders: [] });
  const status = z.enum(['all', 'open', 'pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded']).optional().parse(req.query.status);
  res.json({ orders: await listStoreOrders(store.id, status ?? 'all') });
}

export async function orderDetail(req: Request, res: Response) {
  const { store } = await context(req, { requireStore: true });
  const detail = await orderWithDetails(req.params.id);
  if (!detail || detail.order.store_id !== store!.id) throw new ApiError(404, 'Order not found');
  const customer = await queryOne('SELECT id, full_name, avatar_url, created_at FROM users WHERE id = $1', [detail.order.customer_id]);
  const history = await queryOne<{ orders: number; spent: number }>(
    `SELECT count(*)::int AS orders, COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed'), 0)::bigint AS spent
       FROM seller_orders WHERE customer_id = $1 AND store_id = $2`,
    [detail.order.customer_id, store!.id]
  );
  res.json({ ...detail, customer: { ...customer, ordersWithStore: history?.orders ?? 0, spentWithStoreUgx: Number(history?.spent ?? 0) } });
}

const transitionSchema = z.object({
  status: z.enum(['confirmed', 'preparing', 'ready', 'completed', 'cancelled']),
  note: z.string().trim().max(300).nullable().optional(),
});

export async function updateOrder(req: Request, res: Response) {
  const input = transitionSchema.parse(req.body);
  const { user, store } = await context(req, { requireStore: true, write: true });
  const existing = await queryOne<{ store_id: string }>('SELECT store_id FROM seller_orders WHERE id = $1', [req.params.id]);
  if (!existing || existing.store_id !== store!.id) throw new ApiError(404, 'Order not found');
  if (input.status === 'cancelled' && !input.note) throw new ApiError(400, 'Tell the customer why you are cancelling');
  const order = await transitionOrder({ orderId: req.params.id, to: input.status as SellerOrderStatus, actor: { id: user.id, role: 'seller' }, note: input.note });
  res.json({ order });
}

export async function customers(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json({ customers: [] });
  res.json({ customers: await listStoreCustomers(store.id) });
}

export async function reviews(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json({ storeReviews: [], productReviews: [] });
  const [storeReviews, productReviews] = await Promise.all([listStoreReviews(store.id), listStoreProductReviews(store.id)]);
  res.json({ storeReviews, productReviews });
}

export async function reply(req: Request, res: Response) {
  const input = z.object({ reply: z.string().trim().min(1).max(1000) }).parse(req.body);
  const { store } = await context(req, { requireStore: true, write: true });
  const updated = await replyToReview(store!.id, req.params.id, input.reply);
  if (!updated) throw new ApiError(404, 'Review not found');
  res.json({ review: updated });
}

export async function followers(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json({ followers: [], total: 0 });
  const rows = await listFollowers(store.id, 200);
  res.json({ followers: rows, total: store.follower_count });
}

export async function analytics(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json(null);
  const q = z.object({
    range: z.enum(['today', '7d', '30d', '90d', '12m', 'custom']).default('30d'),
    from: z.string().optional(),
    to: z.string().optional(),
  }).parse(req.query);
  res.json(await storeAnalytics(store.id, q.range as RangeKey, q.from, q.to));
}

export async function forecast(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json(null);
  res.json(await storeForecast(store.id));
}

export async function promotions(req: Request, res: Response) {
  const { store } = await context(req);
  if (!store) return res.json({ promotions: [] });
  res.json({ promotions: await listPromotions(store.id) });
}

const promotionSchema = z.object({
  name: z.string().trim().min(2).max(100),
  kind: z.enum(['percentage', 'fixed']),
  value: z.number().int().min(1).max(100_000_000),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  productIds: z.array(z.string().uuid()).min(1).max(200),
}).refine((p) => p.kind !== 'percentage' || p.value <= 90, { message: 'Percentage discounts go up to 90%', path: ['value'] });

export async function addPromotion(req: Request, res: Response) {
  const input = promotionSchema.parse(req.body);
  const { store } = await context(req, { requireStore: true, write: true });
  if (input.endsAt && input.startsAt && new Date(input.endsAt) <= new Date(input.startsAt)) throw new ApiError(400, 'The end must come after the start');
  res.status(201).json({ promotion: await createPromotion(store!.id, input) });
}

export async function togglePromotion(req: Request, res: Response) {
  const input = z.object({ active: z.boolean() }).parse(req.body);
  const { store } = await context(req, { requireStore: true, write: true });
  const promo = await setPromotionActive(store!.id, req.params.id, input.active);
  if (!promo) throw new ApiError(404, 'Promotion not found');
  res.json({ promotion: promo });
}

export async function removePromotion(req: Request, res: Response) {
  const { store } = await context(req, { requireStore: true, write: true });
  if (!(await deletePromotion(store!.id, req.params.id))) throw new ApiError(404, 'Promotion not found');
  res.json({ ok: true });
}

export async function settings(req: Request, res: Response) {
  const { user } = await context(req);
  res.json({ settings: await getOrCreateSettings(user.id) });
}

const settingsSchema = z.object({
  notifyOrders: z.boolean().optional(),
  notifyReviews: z.boolean().optional(),
  notifyFollowers: z.boolean().optional(),
  notifyLowStock: z.boolean().optional(),
  notifyProductChanges: z.boolean().optional(),
  autoConfirmOrders: z.boolean().optional(),
  processingDays: z.number().int().min(0).max(30).optional(),
  payoutMethod: z.enum(['mobile_money', 'bank']).optional(),
  payoutName: z.string().trim().max(120).nullable().optional(),
  payoutPhone: z.string().trim().max(30).nullable().optional(),
  payoutBank: z.string().trim().max(120).nullable().optional(),
  payoutAccount: z.string().trim().max(60).nullable().optional(),
});

export async function patchSettings(req: Request, res: Response) {
  const input = settingsSchema.parse(req.body);
  const { user } = await context(req);
  const updated = await updateSettings(user.id, {
    notify_orders: input.notifyOrders,
    notify_reviews: input.notifyReviews,
    notify_followers: input.notifyFollowers,
    notify_low_stock: input.notifyLowStock,
    notify_product_changes: input.notifyProductChanges,
    auto_confirm_orders: input.autoConfirmOrders,
    processing_days: input.processingDays,
    payout_method: input.payoutMethod,
    payout_name: input.payoutName,
    payout_phone: input.payoutPhone,
    payout_bank: input.payoutBank,
    payout_account: input.payoutAccount,
  });
  res.json({ settings: updated });
}

export async function payments(req: Request, res: Response) {
  const { user, store } = await context(req);
  const settings = await getOrCreateSettings(user.id);
  if (!store) return res.json({ settings, summary: null, recent: [] });
  const summary = await queryOne<any>(
    `SELECT COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed'), 0)::bigint AS collected_ugx,
            COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed' AND completed_at > now() - interval '30 days'), 0)::bigint AS collected_30d_ugx,
            COALESCE(SUM(total_ugx) FILTER (WHERE status IN ('confirmed','preparing','ready')), 0)::bigint AS expected_ugx,
            count(*) FILTER (WHERE status = 'completed')::int AS paid_orders,
            COALESCE(SUM(total_ugx) FILTER (WHERE status = 'refunded'), 0)::bigint AS refunded_ugx
       FROM seller_orders WHERE store_id = $1`,
    [store.id]
  );
  const recent = await query(
    `SELECT id, order_number, status, payment_status, payment_method, total_ugx, customer_name, completed_at, created_at
       FROM seller_orders WHERE store_id = $1 AND status IN ('completed','refunded') ORDER BY COALESCE(completed_at, updated_at) DESC LIMIT 30`,
    [store.id]
  );
  res.json({ settings, summary, recent });
}

const ACCEPTED_DOCS = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

export async function submitVerification(req: Request, res: Response) {
  const { user, store } = await context(req, { requireStore: true, write: true });
  const body = z.object({
    businessName: z.string().trim().min(2).max(150),
    registrationNumber: z.string().trim().max(60).nullable().optional(),
    note: z.string().trim().max(500).nullable().optional(),
  }).parse(req.body);

  const open = await queryOne('SELECT id FROM seller_verifications WHERE seller_id = $1 AND status = $2', [user.id, 'pending']);
  if (open) throw new ApiError(409, 'Your last submission is still being reviewed');

  const file = (req as any).file as Express.Multer.File | undefined;
  let key: string | null = null;
  if (file) {
    const declared = (file.mimetype ?? '').split(';')[0].trim().toLowerCase();
    if (!ACCEPTED_DOCS.includes(declared)) throw new ApiError(400, 'Attach a photo or PDF of your business document');
    const mime = contentMatchesDeclaredType(file.buffer, declared);
    if (!mime) throw new ApiError(400, 'That file does not look like a document');
    key = await storageService.save(file.buffer, file.originalname ?? 'document', 'seller-verification', { mimeType: mime, uploadedBy: user.id });
  }

  const checks = automaticChecks(store!, body, !!key);
  const autoVerified = checks.every((c) => c.passed);

  const record = await queryOne(
    `INSERT INTO seller_verifications (seller_id, business_name, registration_number, document_key, note, status, review_note, reviewed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, CASE WHEN $6 = 'verified' THEN now() ELSE NULL END)
     RETURNING id, status, business_name, created_at`,
    [user.id, body.businessName, body.registrationNumber ?? null, autoVerified ? null : key, body.note ?? null,
     autoVerified ? 'verified' : 'pending', autoVerified ? 'Verified automatically by Duka' : null]
  );
  if (autoVerified) {
    if (key) await storageService.delete(key).catch(() => undefined);
    await setVerificationStatus(user.id, 'verified', 'auto');
    await notifySellerVerification({ sellerId: user.id, verified: true });
  } else {
    await setVerificationStatus(user.id, 'pending');
  }
  await refreshStoreCounters(store!.id);
  res.status(201).json({ verification: record, autoVerified, checks });
}

function automaticChecks(store: StoreRow, body: { businessName: string; registrationNumber?: string | null }, hasDocument: boolean) {
  const words = (s: string | null | undefined) => (s ?? '').trim().split(/\s+/).filter(Boolean).length;
  return [
    { id: 'business_name', label: 'A real business name', passed: body.businessName.trim().length >= 3 && /[a-z]/i.test(body.businessName) },
    { id: 'store_identity', label: 'A store logo or a document', passed: !!store.logo_url || hasDocument },
    { id: 'store_description', label: 'A description of at least 25 words', passed: words(store.description) >= 25 || hasDocument },
    { id: 'contact', label: 'A phone, WhatsApp or email buyers can reach', passed: !!(store.contact_phone || store.whatsapp || store.contact_email) },
    { id: 'location', label: 'A location or city', passed: !!(store.location || store.city) },
  ];
}

export async function myVerifications(req: Request, res: Response) {
  const { user, profile } = await context(req);
  const records = await query(
    `SELECT id, business_name, registration_number, status, review_note, reviewed_at, created_at, (document_key IS NOT NULL) AS has_document
       FROM seller_verifications WHERE seller_id = $1 ORDER BY created_at DESC`,
    [user.id]
  );
  res.json({ status: profile.verification_status, records });
}
