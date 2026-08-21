export type UserRole = 'customer' | 'shopper' | 'admin';

export type VerificationStatus = 'unverified' | 'pending' | 'approved' | 'rejected';

export type SourcingType = 'specific_market' | 'specific_shop' | 'social_seller' | 'shopper_choice';

export type RequestStatus = 'draft' | 'open' | 'offer_received' | 'assigned' | 'cancelled' | 'expired';

export type OrderStatus =
  | 'requested'
  | 'shopper_assigned'
  | 'shopping'
  | 'item_found'
  | 'awaiting_customer_approval'
  | 'purchased'
  | 'out_for_delivery'
  | 'delivered'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'refunded';

export type OfferStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export type PaymentMethod = 'cash_on_delivery' | 'mobile_money' | 'card' | 'manual';

export type PaymentStatus = 'pending' | 'authorized' | 'paid' | 'failed' | 'refunded' | 'partially_refunded';

export interface AuthUser {
  id: string;
  role: UserRole;
  fullName: string;
  email: string | null;
  phone: string;
}

export interface JwtPayload {
  sub: string;
  role: UserRole;
  /**
   * Ids of the other accounts this person proved ownership of at login, by the
   * submitted password also verifying against them. Carried in the signed token
   * so /auth/switch-account can hand out tokens for a sibling account without
   * asking for the password again — and so a sibling that was never
   * password-proven can never be switched into.
   */
  linked?: string[];
}

export interface PricingBreakdown {
  itemPriceUgx: number;
  shoppingFeeUgx: number;
  deliveryFeeUgx: number;
  platformFeeUgx: number;
  totalAmountUgx: number;
  shopperPayoutUgx: number;
}
