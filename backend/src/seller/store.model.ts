import { query, queryOne } from '../db/pool';
import { STORE_CATEGORIES } from './categories';

export type SellerVerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';
export type StoreStatus = 'active' | 'hidden' | 'suspended';

export interface SellerProfileRow {
  user_id: string;
  verification_status: SellerVerificationStatus;
  is_suspended: boolean;
  suspended_reason: string | null;
  suspended_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StoreRow {
  id: string;
  owner_id: string;
  name: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  category: string;
  city: string;
  location: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  whatsapp: string | null;
  logo_url: string | null;
  cover_url: string | null;
  policies: string | null;
  delivery_fee_ugx: number;
  fulfilment: 'delivery' | 'pickup' | 'shopper';
  status: StoreStatus;
  rating_avg: string | number;
  rating_count: number;
  follower_count: number;
  product_count: number;
  sales_count: number;
  created_at: string;
  updated_at: string;
}

export interface SellerSettingsRow {
  user_id: string;
  notify_orders: boolean;
  notify_reviews: boolean;
  notify_followers: boolean;
  notify_low_stock: boolean;
  notify_product_changes: boolean;
  auto_confirm_orders: boolean;
  processing_days: number;
  payout_method: 'mobile_money' | 'bank';
  payout_name: string | null;
  payout_phone: string | null;
  payout_bank: string | null;
  payout_account: string | null;
  updated_at: string;
}

export { STORE_CATEGORIES } from './categories';
export type { StoreCategory } from './categories';

export const PUBLIC_STORE_COLUMNS = `
  s.id, s.name, s.slug, s.tagline, s.description, s.category, s.city, s.location,
  s.contact_phone, s.contact_email, s.whatsapp, s.logo_url, s.cover_url, s.policies,
  s.delivery_fee_ugx, s.fulfilment, s.status, s.rating_avg, s.rating_count, s.follower_count,
  s.product_count, s.sales_count, s.created_at,
  (sp.verification_status = 'verified') AS is_verified, sp.verified_at, sp.verified_by`;

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'store';
}

export async function uniqueSlug(base: string, excludeStoreId?: string): Promise<string> {
  const root = slugify(base);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const clash = await queryOne<{ id: string }>(
      'SELECT id FROM seller_stores WHERE slug = $1 AND ($2::uuid IS NULL OR id <> $2)',
      [candidate, excludeStoreId ?? null]
    );
    if (!clash) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

export async function getProfile(userId: string): Promise<SellerProfileRow | null> {
  return queryOne<SellerProfileRow>('SELECT * FROM seller_profiles WHERE user_id = $1', [userId]);
}

export async function ensureProfile(userId: string): Promise<SellerProfileRow> {
  const row = await queryOne<SellerProfileRow>(
    `INSERT INTO seller_profiles (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = now()
     RETURNING *`,
    [userId]
  );
  if (!row) throw new Error('Failed to create seller profile');
  return row;
}

export async function findStoreByOwner(ownerId: string): Promise<StoreRow | null> {
  return queryOne<StoreRow>('SELECT * FROM seller_stores WHERE owner_id = $1', [ownerId]);
}

export async function findStoreById(id: string): Promise<StoreRow | null> {
  return queryOne<StoreRow>('SELECT * FROM seller_stores WHERE id = $1', [id]);
}

export async function findPublicStoreBySlug(slug: string) {
  return queryOne(
    `SELECT ${PUBLIC_STORE_COLUMNS}
       FROM seller_stores s
       JOIN seller_profiles sp ON sp.user_id = s.owner_id
       JOIN users u ON u.id = s.owner_id AND u.is_active
      WHERE s.slug = $1 AND s.status = 'active' AND NOT sp.is_suspended`,
    [slug]
  );
}

export interface StoreInput {
  name: string;
  tagline?: string | null;
  description?: string | null;
  category: string;
  city: string;
  location?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  whatsapp?: string | null;
  logoUrl?: string | null;
  coverUrl?: string | null;
  policies?: string | null;
  deliveryFeeUgx?: number;
  fulfilment?: 'delivery' | 'pickup' | 'shopper';
}

export async function createStore(ownerId: string, input: StoreInput): Promise<StoreRow> {
  const slug = await uniqueSlug(input.name);
  const row = await queryOne<StoreRow>(
    `INSERT INTO seller_stores
       (owner_id, name, slug, tagline, description, category, city, location,
        contact_phone, contact_email, whatsapp, logo_url, cover_url, policies, delivery_fee_ugx, fulfilment)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING *`,
    [
      ownerId, input.name.trim(), slug, input.tagline ?? null, input.description ?? null,
      input.category, input.city, input.location ?? null, input.contactPhone ?? null,
      input.contactEmail ?? null, input.whatsapp ?? null, input.logoUrl ?? null,
      input.coverUrl ?? null, input.policies ?? null, input.deliveryFeeUgx ?? 5000, input.fulfilment ?? 'delivery',
    ]
  );
  if (!row) throw new Error('Failed to create store');
  await query('INSERT INTO seller_settings (user_id) VALUES ($1) ON CONFLICT (user_id) DO NOTHING', [ownerId]);
  return row;
}

export async function updateStore(storeId: string, patch: Partial<StoreInput> & { status?: 'active' | 'hidden'; slug?: string }): Promise<StoreRow> {
  const columns: Record<string, unknown> = {
    name: patch.name?.trim(),
    slug: patch.slug,
    tagline: patch.tagline,
    description: patch.description,
    category: patch.category,
    city: patch.city,
    location: patch.location,
    contact_phone: patch.contactPhone,
    contact_email: patch.contactEmail,
    whatsapp: patch.whatsapp,
    logo_url: patch.logoUrl,
    cover_url: patch.coverUrl,
    policies: patch.policies,
    delivery_fee_ugx: patch.deliveryFeeUgx,
    fulfilment: patch.fulfilment,
    status: patch.status,
  };
  const sets: string[] = [];
  const params: unknown[] = [storeId];
  for (const [column, value] of Object.entries(columns)) {
    if (value === undefined) continue;
    params.push(value);
    sets.push(`${column} = $${params.length}`);
  }
  if (sets.length === 0) {
    const current = await findStoreById(storeId);
    if (!current) throw new Error('Store not found');
    return current;
  }
  sets.push('updated_at = now()');
  const row = await queryOne<StoreRow>(
    `UPDATE seller_stores SET ${sets.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  if (!row) throw new Error('Store not found');
  return row;
}

export async function refreshStoreCounters(storeId: string): Promise<void> {
  await query(
    `UPDATE seller_stores s SET
       product_count  = (SELECT count(*) FROM seller_products p WHERE p.store_id = s.id AND p.status = 'published'),
       follower_count = (SELECT count(*) FROM seller_followers f WHERE f.store_id = s.id),
       rating_count   = (SELECT count(*) FROM seller_store_reviews r WHERE r.store_id = s.id),
       rating_avg     = COALESCE((SELECT ROUND(AVG(stars)::numeric, 2) FROM seller_store_reviews r WHERE r.store_id = s.id), 0),
       updated_at     = now()
     WHERE s.id = $1`,
    [storeId]
  );
}

export async function isFollowing(userId: string, storeId: string): Promise<boolean> {
  const row = await queryOne('SELECT 1 FROM seller_followers WHERE follower_id = $1 AND store_id = $2', [userId, storeId]);
  return !!row;
}

export async function follow(userId: string, storeId: string): Promise<boolean> {
  const row = await queryOne(
    `INSERT INTO seller_followers (follower_id, store_id) VALUES ($1, $2)
     ON CONFLICT DO NOTHING RETURNING follower_id`,
    [userId, storeId]
  );
  await refreshStoreCounters(storeId);
  return !!row;
}

export async function unfollow(userId: string, storeId: string): Promise<void> {
  await query('DELETE FROM seller_followers WHERE follower_id = $1 AND store_id = $2', [userId, storeId]);
  await refreshStoreCounters(storeId);
}

export async function listFollowers(storeId: string, limit = 100) {
  return query(
    `SELECT u.id, u.full_name, u.avatar_url, u.role::text AS role, f.created_at AS followed_at,
            (SELECT count(*)::int FROM seller_orders o WHERE o.customer_id = u.id AND o.store_id = f.store_id AND o.status = 'completed') AS orders
       FROM seller_followers f
       JOIN users u ON u.id = f.follower_id
      WHERE f.store_id = $1
      ORDER BY f.created_at DESC
      LIMIT $2`,
    [storeId, limit]
  );
}

export async function listFollowing(userId: string) {
  return query(
    `SELECT ${PUBLIC_STORE_COLUMNS}, f.created_at AS followed_at
       FROM seller_followers f
       JOIN seller_stores s ON s.id = f.store_id
       JOIN seller_profiles sp ON sp.user_id = s.owner_id
      WHERE f.follower_id = $1
      ORDER BY f.created_at DESC`,
    [userId]
  );
}

export async function getOrCreateSettings(userId: string): Promise<SellerSettingsRow> {
  const row = await queryOne<SellerSettingsRow>(
    `INSERT INTO seller_settings (user_id) VALUES ($1)
     ON CONFLICT (user_id) DO UPDATE SET updated_at = seller_settings.updated_at
     RETURNING *`,
    [userId]
  );
  if (!row) throw new Error('Failed to load seller settings');
  return row;
}

const SETTINGS_COLUMNS = [
  'notify_orders', 'notify_reviews', 'notify_followers', 'notify_low_stock', 'notify_product_changes',
  'auto_confirm_orders', 'processing_days', 'payout_method', 'payout_name', 'payout_phone',
  'payout_bank', 'payout_account',
] as const;

export type SellerSettingsPatch = Partial<Record<(typeof SETTINGS_COLUMNS)[number], unknown>>;

export async function updateSettings(userId: string, patch: SellerSettingsPatch): Promise<SellerSettingsRow> {
  await getOrCreateSettings(userId);
  const sets: string[] = [];
  const params: unknown[] = [userId];
  for (const key of SETTINGS_COLUMNS) {
    if (patch[key] === undefined) continue;
    params.push(patch[key]);
    sets.push(`${key} = $${params.length}`);
  }
  if (sets.length === 0) return getOrCreateSettings(userId);
  sets.push('updated_at = now()');
  const row = await queryOne<SellerSettingsRow>(
    `UPDATE seller_settings SET ${sets.join(', ')} WHERE user_id = $1 RETURNING *`,
    params
  );
  if (!row) throw new Error('Failed to update seller settings');
  return row;
}

export async function setVerificationStatus(userId: string, status: SellerVerificationStatus, by: 'auto' | 'admin' | null = null): Promise<void> {
  await query(
    `UPDATE seller_profiles SET
       verification_status = $2,
       verified_at = CASE WHEN $2 = 'verified' THEN now() ELSE NULL END,
       verified_by = CASE WHEN $2 = 'verified' THEN $3 ELSE NULL END,
       updated_at = now()
     WHERE user_id = $1`,
    [userId, status, by]
  );
}

export async function setSuspended(userId: string, suspended: boolean, reason: string | null): Promise<void> {
  await query(
    `UPDATE seller_profiles SET
       is_suspended = $2,
       suspended_reason = CASE WHEN $2 THEN $3 ELSE NULL END,
       suspended_at = CASE WHEN $2 THEN now() ELSE NULL END,
       updated_at = now()
     WHERE user_id = $1`,
    [userId, suspended, reason]
  );
  await query(
    `UPDATE seller_stores SET status = CASE WHEN $2 THEN 'suspended' ELSE 'active' END, updated_at = now()
      WHERE owner_id = $1 AND status IN ('active', 'suspended')`,
    [userId, suspended]
  );
}
