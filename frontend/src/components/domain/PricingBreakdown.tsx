type Amount = number | string | null | undefined;

interface PricingBreakdownProps {
  itemPriceUgx: Amount;
  shoppingFeeUgx: Amount;
  deliveryFeeUgx: Amount;
  platformFeeUgx?: Amount;
  totalUgx?: Amount;
}

function amount(value: Amount): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUgx(n: Amount) {
  return new Intl.NumberFormat('en-UG').format(amount(n)) + ' UGX';
}

export function PricingBreakdown({
  itemPriceUgx, shoppingFeeUgx, deliveryFeeUgx, platformFeeUgx = 0, totalUgx,
}: PricingBreakdownProps) {
  const item = amount(itemPriceUgx);
  const shopping = amount(shoppingFeeUgx);
  const delivery = amount(deliveryFeeUgx);
  const platform = amount(platformFeeUgx);
  const lineSum = item + shopping + delivery + platform;

  const stored = amount(totalUgx);
  const total = stored > 0 && stored === lineSum ? stored : lineSum;

  const rows = [
    { label: 'Item price', value: item, hint: 'What the shopper paid at the shop' },
    { label: 'Shopping fee', value: shopping, hint: "The shopper's time & effort" },
    { label: 'Delivery fee', value: delivery, hint: 'Getting it to your door' },
    { label: 'Platform fee', value: platform, hint: 'Keeps Duka running safely' },
  ];

  return (
    <div className="surface-2 rounded-xl p-4">
      <p className="text-label font-semibold uppercase text-ink-3">Price breakdown</p>
      <dl className="mt-3 flex flex-col gap-2.5">
        {rows.map((row) => (
          <div key={row.label} className="flex items-baseline justify-between gap-3 text-small">
            <dt className="min-w-0 text-ink-2">
              {row.label} <span className="text-ink-3">· {row.hint}</span>
            </dt>
            <dd className="shrink-0 font-medium tabular-nums text-ink">{formatUgx(row.value)}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 flex items-baseline justify-between gap-3 border-t border-line pt-3">
        <span className="text-body font-medium text-ink">Total</span>
        <span className="font-display text-h3 font-semibold tabular-nums text-brand-green-deep">{formatUgx(total)}</span>
      </div>
    </div>
  );
}
