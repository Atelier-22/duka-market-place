import { env } from '../config/env';
import { PricingBreakdown } from '../types';

/**
 * Every UGX figure the customer or shopper ever sees is computed here, from
 * the same inputs, in one place. This is what makes the "transparent
 * pricing" requirement in the product brief structurally true rather than a
 * promise: there is no second code path that could compute a different
 * total for the same order.
 */
/**
 * Coerce a money figure to a number.
 *
 * Amounts reach this function from three places — a parsed request body, a
 * database row, and hard-coded config — and only the first is guaranteed to be
 * a number already. Adding a string here does not throw, it concatenates, and
 * the result is a plausible-looking total that is wrong by ten orders of
 * magnitude. So every input is coerced at the boundary and a non-numeric one
 * is rejected loudly rather than turning into NaN further down.
 */
function money(value: number | string | null | undefined, label: string): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} is not a valid amount: ${String(value)}`);
  return Math.round(parsed);
}

export function computePricing(input: {
  itemPriceUgx: number | string;
  shoppingFeeUgx: number | string;
  deliveryFeeUgx?: number | string | null;
  platformFeePercentage?: number | string | null;
}): PricingBreakdown {
  const itemPriceUgx = money(input.itemPriceUgx, 'Item price');
  const shoppingFeeUgx = money(input.shoppingFeeUgx, 'Shopping fee');
  const deliveryFeeUgx = input.deliveryFeeUgx === null || input.deliveryFeeUgx === undefined
    ? env.defaultDeliveryFeeUgx
    : money(input.deliveryFeeUgx, 'Delivery fee');
  const platformFeePercentage = input.platformFeePercentage === null || input.platformFeePercentage === undefined
    ? env.platformFeePercentage
    : Number(input.platformFeePercentage);

  const platformFeeUgx = Math.round((shoppingFeeUgx * platformFeePercentage) / 100);
  const totalAmountUgx = itemPriceUgx + shoppingFeeUgx + deliveryFeeUgx + platformFeeUgx;

  // The shopper earns their shopping fee + delivery fee. The platform's cut
  // comes out of the shopping fee, never out of the item price itself — the
  // shopper never has an incentive to inflate the item price.
  const shopperPayoutUgx = shoppingFeeUgx + deliveryFeeUgx - platformFeeUgx;

  return {
    itemPriceUgx,
    shoppingFeeUgx,
    deliveryFeeUgx,
    platformFeeUgx,
    totalAmountUgx,
    shopperPayoutUgx,
  };
}

export function formatUgx(amount: number): string {
  return new Intl.NumberFormat('en-UG', { maximumFractionDigits: 0 }).format(amount) + ' UGX';
}
