type Amount = number | string | null | undefined;

interface PricingBreakdownProps {
  itemPriceUgx: Amount;
  shoppingFeeUgx: Amount;
  deliveryFeeUgx: Amount;
  platformFeeUgx?: Amount;
  totalUgx?: Amount;
}

/**
 * Money arrives over JSON and a BIGINT can serialise as a string, in which case
 * `a + b` concatenates rather than adds and the customer is quoted a total in
 * the quadrillions. Never add these values raw.
 */
function amount(value: Amount): number {
  if (value === null || value === undefined || value === '') return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatUgx(n: Amount) {
  return new Intl.NumberFormat('en-UG').format(amount(n)) + ' UGX';
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
  const item = amount(itemPriceUgx);
  const shopping = amount(shoppingFeeUgx);
  const delivery = amount(deliveryFeeUgx);
  const platform = amount(platformFeeUgx);
  const lineSum = item + shopping + delivery + platform;

  // Prefer the total the server recorded, but only when it agrees with the
  // lines above it. A stored total that contradicts its own breakdown is a bug,
  // and showing it would be asking someone to pay a number we cannot justify.
  const stored = amount(totalUgx);
  const total = stored > 0 && stored === lineSum ? stored : lineSum;

  const rows = [
    { label: 'Item price', value: item, hint: 'What the shopper paid at the shop' },
    { label: 'Shopping fee', value: shopping, hint: "The shopper's time & effort" },
    { label: 'Delivery fee', value: delivery, hint: 'Getting it to your door' },
    { label: 'Platform fee', value: platform, hint: 'Keeps Duka running safely' },
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
