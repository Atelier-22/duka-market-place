import {
  Camera, CheckCircle2, ClipboardCheck, CreditCard, FileText, Handshake, Hourglass,
  LucideIcon, Package, ShoppingBag, Truck,
} from 'lucide-react';
import {
  OrderPerspective, OrderStatus, ORDER_STEPS, orderStepLabels,
} from '../../types';

const STEP_ICONS: Record<string, LucideIcon> = {
  requested: FileText,
  shopper_assigned: Handshake,
  shopping: ShoppingBag,
  item_found: Camera,
  awaiting_customer_approval: Hourglass,
  purchased: CreditCard,
  out_for_delivery: Truck,
  delivered: Package,
  completed: CheckCircle2,
};

interface OrderTimelineProps {
  status: OrderStatus;
  /**
   * Whose screen this is. The shopper sees the same stages described as their
   * own actions rather than as things a shopper did to them.
   */
  perspective?: OrderPerspective;
}

/**
 * The real-time-style order tracker from the product brief. Renders every
 * stage of REQUESTED → ... → DELIVERED and highlights where the order
 * currently sits. A cancelled/disputed/refunded order still shows the trail
 * it walked before branching off.
 */
export function OrderTimeline({ status, perspective = 'customer' }: OrderTimelineProps) {
  const labels = orderStepLabels(perspective);
  const currentIndex = ORDER_STEPS.indexOf(status);
  const isBranched = currentIndex === -1; // cancelled / disputed / refunded

  return (
    <div className="relative">
      {isBranched && (
        <div className="mb-4 rounded-xl bg-brand-red/10 px-4 py-3 text-sm font-medium text-brand-red">
          This order is {labels[status].toLowerCase()}.
        </div>
      )}
      <ol className="relative flex flex-col gap-0">
        {ORDER_STEPS.map((step, i) => {
          const done = !isBranched && i < currentIndex;
          const active = !isBranched && i === currentIndex;
          const isLast = i === ORDER_STEPS.length - 1;
          const Icon = STEP_ICONS[step];
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
                  'relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all',
                  active
                    ? 'bg-gradient-to-br from-brand-green to-brand-green-fresh text-white shadow-glow animate-float'
                    : done
                    ? 'bg-brand-green-fresh/90 text-white'
                    : 'bg-white text-brand-ink/30 border border-brand-green/15',
                ].join(' ')}
              >
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <div className="pt-1.5">
                <p className={`font-medium ${active ? 'text-brand-green-deep' : done ? 'text-brand-ink/70' : 'text-brand-ink/35'}`}>
                  {labels[step]}
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
