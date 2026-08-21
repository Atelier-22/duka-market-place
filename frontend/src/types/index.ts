export type UserRole = 'customer' | 'shopper' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  phone: string;
  avatarUrl: string | null;
}

/**
 * A separate account under another role that this session proved ownership of
 * at login — the same email/phone, opened by the same password.
 */
export interface LinkedAccount {
  id: string;
  role: UserRole;
  fullName: string;
}

export type SourcingType = 'specific_market' | 'specific_shop' | 'social_seller' | 'shopper_choice';

export type RequestStatus = 'draft' | 'open' | 'offer_received' | 'assigned' | 'cancelled' | 'expired';

export type OrderStatus =
  | 'requested' | 'shopper_assigned' | 'shopping' | 'item_found'
  | 'awaiting_customer_approval' | 'purchased' | 'out_for_delivery'
  | 'delivered' | 'completed' | 'cancelled' | 'disputed' | 'refunded';

export interface ShoppingRequest {
  id: string;
  customer_id: string;
  title: string;
  description: string | null;
  sourcing_type: SourcingType;
  location_id: string | null;
  social_seller_url: string | null;
  budget_min_ugx: number | null;
  budget_max_ugx: number;
  delivery_address_id: string;
  status: RequestStatus;
  notes_for_shopper: string | null;
  created_at: string;
}

export interface ShopperOffer {
  id: string;
  request_id: string;
  shopper_id: string;
  shopper_name?: string;
  rating_avg?: number;
  rating_count?: number;
  completed_jobs?: number;
  estimated_item_price_ugx: number | null;
  shopping_fee_ugx: number;
  delivery_fee_ugx: number;
  estimated_minutes: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

export interface Order {
  id: string;
  request_id: string;
  customer_id: string;
  shopper_id: string;
  status: OrderStatus;
  item_price_ugx: number | null;
  shopping_fee_ugx: number;
  delivery_fee_ugx: number;
  platform_fee_ugx: number;
  total_amount_ugx: number | null;
  delivery_address_id: string;
  created_at: string;
}

export interface Location {
  id: string;
  name: string;
  type: string;
  city: string;
  lat: number | null;
  lng: number | null;
  description: string | null;
}

export interface Address {
  id: string;
  label: string;
  line1: string;
  landmark: string | null;
  city: string;
  is_default: boolean;
}

export const ORDER_STEPS: OrderStatus[] = [
  'requested', 'shopper_assigned', 'shopping', 'item_found',
  'awaiting_customer_approval', 'purchased', 'out_for_delivery', 'delivered', 'completed',
];

export const ORDER_STEP_LABELS: Record<OrderStatus, string> = {
  requested: 'Requested',
  shopper_assigned: 'Shopper accepted',
  shopping: 'Shopping',
  item_found: 'Item found',
  awaiting_customer_approval: 'Awaiting your approval',
  purchased: 'Purchased',
  out_for_delivery: 'Out for delivery',
  delivered: 'Delivered',
  completed: 'Completed',
  cancelled: 'Cancelled',
  disputed: 'Disputed',
  refunded: 'Refunded',
};
