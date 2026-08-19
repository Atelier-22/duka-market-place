import { env } from '../config/env';
import { PricingBreakdown } from '../types';

/**
 * Every UGX figure the customer or shopper ever sees is computed here, from
 * the same inputs, in one place. This is what makes the "transparent
 * pricing" requirement in the product brief structurally true rather than a
 * promise: there is no second code path that could compute a different
 * total for the same order.
 */
export function computePricing(input: {
  itemPriceUgx: number;
  shoppingFeeUgx: number;
  deliveryFeeUgx?: number;
  platformFeePercentage?: number;
}): PricingBreakdown {
  const deliveryFeeUgx = input.deliveryFeeUgx ?? env.defaultDeliveryFeeUgx;
  const platformFeePercentage = input.platformFeePercentage ?? env.platformFeePercentage;

  const platformFeeUgx = Math.round((input.shoppingFeeUgx * platformFeePercentage) / 100);
  const totalAmountUgx = input.itemPriceUgx + input.shoppingFeeUgx + deliveryFeeUgx + platformFeeUgx;

  // The shopper earns their shopping fee + delivery fee. The platform's cut
  // comes out of the shopping fee, never out of the item price itself — the
  // shopper never has an incentive to inflate the item price.
  const shopperPayoutUgx = input.shoppingFeeUgx + deliveryFeeUgx - platformFeeUgx;

  return {
    itemPriceUgx: input.itemPriceUgx,
    shoppingFeeUgx: input.shoppingFeeUgx,
    deliveryFeeUgx,
    platformFeeUgx,
    totalAmountUgx,
    shopperPayoutUgx,
  };
}

export function formatUgx(amount: number): string {
  return new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(amount) + ' UGX';
}
