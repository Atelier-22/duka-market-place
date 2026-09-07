import { env } from '../config/env';
import { PricingBreakdown } from '../types';

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
