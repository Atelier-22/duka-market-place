import { CATEGORY_ENTRIES } from './categories';
export interface PublicStoreSummary {
  id: string;
  name: string;
  slug: string;
  logoUrl: string | null;
  city: string;
  ratingAvg: number;
  ratingCount: number;
  isVerified: boolean;
  fulfilment?: 'delivery' | 'pickup' | 'shopper';
  location?: string | null;
  deliveryFeeUgx?: number;
  followerCount?: number;
  contactPhone?: string | null;
  whatsapp?: string | null;
  contactEmail?: string | null;
}

export interface PublicProduct {
  id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  condition: 'new' | 'used' | 'refurbished';
  currency: string;
  priceUgx: number;
  listPriceUgx: number;
  discountPercent: number;
  promotionName: string | null;
  available: number;
  inStock: boolean;
  lowStock: boolean;
  specifications: { label: string; value: string }[];
  deliveryInfo: string | null;
  isFeatured: boolean;
  ratingAvg: number;
  ratingCount: number;
  salesCount: number;
  publishedAt: string | null;
  imageUrl: string | null;
  images?: string[];
  store?: PublicStoreSummary;
}

export interface PublicVariation {
  id: string;
  name: string;
  value: string;
  colorName: string | null;
  colorHex: string | null;
  label: string;
  priceUgx: number;
  available: number;
}

export interface ProductAttribute { key: string; name: string; value: string; unit: string | null; type: string }

export interface PublicProductDetail extends PublicProduct {
  attributes: ProductAttribute[];
  images: string[];
  variations: PublicVariation[];
  reviews: { id: string; stars: number; comment: string | null; created_at: string; author_name: string; author_avatar: string | null }[];
  storeDetail: PublicStoreSummary;
}

export interface PublicStore {
  id: string;
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
  status: string;
  rating_avg: number | string;
  rating_count: number;
  follower_count: number;
  product_count: number;
  sales_count: number;
  created_at: string;
  is_verified: boolean;
  verified_at?: string | null;
  followed_at?: string;
}

export type SellerOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'refunded';

export interface SellerOrder {
  id: string;
  order_number: number;
  store_id: string;
  seller_id: string;
  customer_id: string;
  status: SellerOrderStatus;
  subtotal_ugx: number;
  delivery_fee_ugx: number;
  total_ugx: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  delivery_line1: string | null;
  delivery_city: string | null;
  delivery_notes: string | null;
  customer_name: string;
  customer_phone: string;
  cancel_reason: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
  store_name?: string;
  store_slug?: string;
  store_logo?: string | null;
  item_count?: number;
  summary?: string;
  image_url?: string | null;
  reviewed?: number;
}

export interface SellerOrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  variation_id: string | null;
  product_name: string;
  variation_label: string | null;
  image_url: string | null;
  unit_price_ugx: number;
  quantity: number;
  line_total_ugx: number;
}

export interface SellerOrderEvent {
  id: string;
  status: string;
  actor_role: string | null;
  note: string | null;
  created_at: string;
}

export interface SellerProduct {
  id: string;
  store_id: string;
  name: string;
  description: string | null;
  category: string;
  subcategory: string | null;
  brand: string | null;
  model: string | null;
  condition: 'new' | 'used' | 'refurbished';
  price_ugx: number;
  sale_price_ugx: number | null;
  sku: string | null;
  stock_quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  specifications: { label: string; value: string }[];
  delivery_info: string | null;
  status: 'draft' | 'published' | 'archived';
  is_featured: boolean;
  published_at: string | null;
  rating_avg: number | string;
  rating_count: number;
  sales_count: number;
  view_count: number;
  flagged_at: string | null;
  flagged_reason: string | null;
  created_at: string;
  updated_at: string;
  images?: { id: string; url: string; position: number }[];
  available?: number;
}

export interface SellerStore {
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
  status: 'active' | 'hidden' | 'suspended';
  rating_avg: number | string;
  rating_count: number;
  follower_count: number;
  product_count: number;
  sales_count: number;
  created_at: string;
}

export interface SellerProfile {
  user_id: string;
  verification_status: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_suspended: boolean;
  suspended_reason: string | null;
}

export const STORE_CATEGORIES = CATEGORY_ENTRIES.map((c) => c.key);

export type StoreCategory = string;
