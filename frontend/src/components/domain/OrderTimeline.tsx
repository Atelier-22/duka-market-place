import { OrderStatus, ORDER_STEPS, ORDER_STEP_LABELS } from '../../types';

const STEP_ICONS: Record<string, string> = {
  requested: '📝', shopper_assigned: '🤝', shopping: '🛍️', item_found: '📸',
  awaiting_customer_approval: '⏳', purchased: '💳', out_for_delivery: '🚴',
  delivered: '📦', completed: '✅',
};

/**
 * The beautiful real-time-style order tracker from the product brief.
 * Renders every stage of REQUESTED → ... → DELIVERED and highlights where
 * the order currently sits. A cancelled/disputed/refunded order still shows
 * the trail it walked before branching off.
 */
export function OrderTimeline({ status }: { status: OrderStatus }) {
  const currentIndex = ORDER_STEPS.indexOf(status);
  const isBranched = currentIndex === -1; // cancelled / disputed / refunded

  return (
    <div className="relative">
      {isBranched && (
        <div className="mb-4 rounded-xl bg-brand-red/10 px-4 py-3 text-sm font-medium text-brand-red">
          This order is {ORDER_STEP_LABELS[status].toLowerCase()}.
        </div>
      )}
      <ol className="relative flex flex-col gap-0">
        {ORDER_STEPS.map((step, i) => {
          const done = !isBranched && i < currentIndex;
          const active = !isBranched && i === currentIndex;
          const isLast = i === ORDER_STEPS.length - 1;
          return (
            <li key={step} className="relative flex gap-4 pb-8 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[19px] top-10 h-full w-0.5 ${
                    done ? 'bg-brand-green-fresh' : 'bg-brand-green/15'
                  }`}
                />
              )}
              <span
                className={[
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg transition-all',
                  active
                    ? 'bg-gradient-to-br from-brand-green to-brand-green-fresh text-white shadow-glow animate-float'
                    : done
                    ? 'bg-brand-green-fresh/90 text-white'
                    : 'bg-white text-brand-ink/30 border border-brand-green/15',
                ].join(' ')}
              >
                {STEP_ICONS[step]}
              </span>
              <div className="pt-1.5">
                <p className={`font-medium ${active ? 'text-brand-green-deep' : done ? 'text-brand-ink/70' : 'text-brand-ink/35'}`}>
                  {ORDER_STEP_LABELS[step]}
                </p>
                {active && <p className="mt-0.5 text-xs text-brand-green-fresh">In progress</p>}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
