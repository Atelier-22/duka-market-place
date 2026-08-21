import { useNavigate } from 'react-router-dom';
import {
  ArrowRight, Camera, CheckCircle2, CreditCard, FileText, Handshake, Hourglass,
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

export interface TimelineAction {
  /** Element on this page to scroll to and flash. */
  targetId?: string;
  /** Somewhere else entirely — the chat, the order, a receipt. */
  to?: string;
  /** What tapping it does. Shown under the step and used as the tooltip. */
  hint: string;
}

interface OrderTimelineProps {
  status: OrderStatus;
  /**
   * Whose screen this is. The shopper sees the same stages described as their
   * own actions rather than as things a shopper did to them.
   */
  perspective?: OrderPerspective;
  /**
   * Where each stage lives on this page. Steps with an entry become buttons;
   * the rest stay as plain markers. Supplied by the page rather than hard-coded
   * here, because the same timeline is rendered for both sides of an order and
   * "approve the purchase" is a different card on each.
   */
  actions?: Partial<Record<OrderStatus, TimelineAction>>;
}

/**
 * Move the page to a panel and make it obvious which one just arrived.
 *
 * Scrolling alone is not enough on a long order page — you land somewhere and
 * still have to work out which card you were sent to, which is the original
 * complaint about not being able to find the approve button.
 */
export function revealPanel(targetId: string) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash-target');
  // Reading offsetWidth forces the class removal to take effect before it is
  // added again; without it the animation does not restart on a second tap.
  void el.offsetWidth;
  el.classList.add('flash-target');
  window.setTimeout(() => el.classList.remove('flash-target'), 2000);
}

/**
 * The real-time-style order tracker from the product brief. Renders every
 * stage of REQUESTED → ... → DELIVERED and highlights where the order
 * currently sits. A cancelled/disputed/refunded order still shows the trail
 * it walked before branching off.
 *
 * Every stage that has somewhere to go is a button. People were reading the
 * timeline as a picture and then hunting the page for the thing it was
 * describing — so the picture is now the way there.
 */
export function OrderTimeline({ status, perspective = 'customer', actions = {} }: OrderTimelineProps) {
  const navigate = useNavigate();
  const labels = orderStepLabels(perspective);
  const currentIndex = ORDER_STEPS.indexOf(status);
  const isBranched = currentIndex === -1; // cancelled / disputed / refunded

  function go(action: TimelineAction) {
    if (action.to) navigate(action.to);
    else if (action.targetId) revealPanel(action.targetId);
  }

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
          const action = actions[step];
          const clickable = !!action;

          const marker = (
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
          );

          const text = (
            <div className="min-w-0 pt-1.5 text-left">
              <p className={`font-medium ${active ? 'text-brand-green-deep' : done ? 'text-brand-ink/70' : 'text-brand-ink/35'}`}>
                {labels[step]}
              </p>
              {active && <p className="mt-0.5 text-xs text-brand-green-fresh">In progress</p>}
              {/* The hint is what makes the step legible as a destination
                  rather than a label that happens to respond to taps. */}
              {clickable && (
                <p className={`mt-0.5 flex items-center gap-1 text-xs font-medium ${
                  active ? 'text-brand-green-deep' : 'text-brand-ink/45'
                }`}>
                  {action.hint}
                  <ArrowRight size={11} strokeWidth={2.5} className="shrink-0" />
                </p>
              )}
            </div>
          );

          return (
            <li key={step} className="relative flex pb-8 last:pb-0">
              {!isLast && (
                <span
                  className={`absolute left-[19px] top-10 h-full w-0.5 ${
                    done ? 'bg-brand-green-fresh' : 'bg-brand-green/15'
                  }`}
                />
              )}

              {clickable ? (
                <button
                  type="button"
                  onClick={() => go(action)}
                  title={action.hint}
                  className={[
                    '-mx-2 -my-1 flex w-full items-start gap-4 rounded-xl px-2 py-1 text-left transition-colors',
                    'hover:bg-brand-green-mist/60 focus-visible:bg-brand-green-mist/60',
                  ].join(' ')}
                >
                  {marker}
                  {text}
                </button>
              ) : (
                <div className="flex w-full items-start gap-4">
                  {marker}
                  {text}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
