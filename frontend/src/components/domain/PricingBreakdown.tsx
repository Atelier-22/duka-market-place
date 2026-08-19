interface PricingBreakdownProps {
  itemPriceUgx: number;
  shoppingFeeUgx: number;
  deliveryFeeUgx: number;
  platformFeeUgx?: number;
  totalUgx?: number;
}

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

/**
 * The transparent pricing card required by the product brief: item price,
 * shopping fee, delivery fee and platform fee are always shown as separate
 * line items — never collapsed into a single number the customer has to
 * trust blindly.
 */
export function PricingBreakdown({
  itemPriceUgx, shoppingFeeUgx, deliveryFeeUgx, platformFeeUgx = 0, totalUgx,
}: PricingBreakdownProps) {
  const total = totalUgx ?? itemPriceUgx + shoppingFeeUgx + deliveryFeeUgx + platformFeeUgx;
  const rows = [
    { label: 'Item price', value: itemPriceUgx, hint: 'What the shopper paid at the shop' },
    { label: 'Shopping fee', value: shoppingFeeUgx, hint: "The shopper's time & effort" },
    { label: 'Delivery fee', value: deliveryFeeUgx, hint: 'Getting it to your door' },
    { label: 'Platform fee', value: platformFeeUgx, hint: 'Keeps Duka running safely' },
  ];

  return (
    <div className="rounded-xl2 bg-brand-green-mist/60 p-5">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-green-deep/60">
        Price breakdown
      </p>
      <dl className="flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between text-sm">
            <dt className="text-brand-ink/70">
              {row.label} <span className="text-brand-ink/40">· {row.hint}</span>
            </dt>
            <dd className="font-medium text-brand-ink">{formatUgx(row.value)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-center justify-between border-t border-brand-green/15 pt-3">
        <span className="font-display text-base font-medium text-brand-green-deep">Total</span>
        <span className="font-display text-lg font-semibold text-brand-green-deep">{formatUgx(total)}</span>
      </div>
    </div>
  );
}
