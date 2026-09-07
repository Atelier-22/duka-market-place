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

  targetId?: string;

  to?: string;

  hint: string;
}

interface OrderTimelineProps {
  status: OrderStatus;

  perspective?: OrderPerspective;

  actions?: Partial<Record<OrderStatus, TimelineAction>>;
}

export function revealPanel(targetId: string) {
  const el = document.getElementById(targetId);
  if (!el) return;
  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  el.classList.remove('flash-target');

  void el.offsetWidth;
  el.classList.add('flash-target');
  window.setTimeout(() => el.classList.remove('flash-target'), 2000);
}

/** 32px step markers: done and active are solid brand green, upcoming sit quietly on the surface. */
const MARKER = {
  done: 'bg-brand-green text-white',
  active: 'bg-brand-green text-white shadow-focus',
  upcoming: 'surface border-line text-ink-3',
} as const;

const LABEL = {
  done: 'text-ink',
  active: 'text-brand-green-deep',
  upcoming: 'text-ink-3',
} as const;

export function OrderTimeline({ status, perspective = 'customer', actions = {} }: OrderTimelineProps) {
  const navigate = useNavigate();
  const labels = orderStepLabels(perspective);
  const currentIndex = ORDER_STEPS.indexOf(status);
  const isBranched = currentIndex === -1;

  function go(action: TimelineAction) {
    if (action.to) navigate(action.to);
    else if (action.targetId) revealPanel(action.targetId);
  }

  return (
    <div className="relative">
      {isBranched && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-brand-red/30 bg-danger-soft/50 px-4 py-3 text-small font-medium text-brand-red"
        >
          This order is {labels[status].toLowerCase()}.
        </div>
      )}
      <ol className="relative flex flex-col">
        {ORDER_STEPS.map((step, i) => {
          const done = !isBranched && i < currentIndex;
          const active = !isBranched && i === currentIndex;
          const isLast = i === ORDER_STEPS.length - 1;
          const Icon = STEP_ICONS[step];
          const action = actions[step];
          const clickable = !!action;
          const state = active ? 'active' : done ? 'done' : 'upcoming';

          const marker = (
            <span
              aria-hidden
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors duration-200 ${MARKER[state]}`}
            >
              <Icon size={15} strokeWidth={2} />
            </span>
          );

          const text = (
            <span className="min-w-0 flex-1 pt-1 text-left">
              <span className={`block text-body font-medium ${LABEL[state]}`}>
                {labels[step]}
              </span>
              {active && <span className="mt-0.5 block text-caption text-brand-green">In progress</span>}

              {clickable && (
                <span className="mt-0.5 flex items-center gap-1 text-caption font-medium text-brand-green">
                  {action.hint}
                  <ArrowRight size={12} strokeWidth={2.5} className="shrink-0" />
                </span>
              )}
            </span>
          );

          return (
            <li key={step} className="relative flex pb-6 last:pb-0">
              {!isLast && (
                <span
                  aria-hidden
                  className={`absolute left-[15px] top-8 h-full w-0.5 ${done ? 'bg-brand-green' : 'bg-line'}`}
                />
              )}

              {clickable ? (
                <button
                  type="button"
                  onClick={() => go(action)}
                  title={action.hint}
                  className={[
                    '-mx-2 -my-1 flex min-h-[44px] w-full items-start gap-3 rounded-lg px-2 py-1 text-left',
                    'transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:shadow-focus',
                  ].join(' ')}
                >
                  {marker}
                  {text}
                </button>
              ) : (
                <div className="flex w-full items-start gap-3">
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
