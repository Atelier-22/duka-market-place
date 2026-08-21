import { ArrowDown } from 'lucide-react';
import { OrderPerspective, OrderStatus } from '../../types';
import { revealPanel } from './OrderTimeline';

/**
 * What each side has to do at each stage, in the imperative. A null means the
 * order is waiting on the other person and there is nothing to chase.
 */
const ACTION: Partial<Record<OrderStatus, Record<OrderPerspective, { title: string; cta: string } | null>>> = {
  requested: {
    customer: null,
    shopper: { title: 'This job is waiting for your answer', cta: 'Accept or decline' },
  },
  shopper_assigned: {
    customer: null,
    shopper: { title: 'Let the customer know you are on your way', cta: 'Start shopping' },
  },
  shopping: {
    customer: null,
    shopper: { title: 'Found it? Send the photo and the real price', cta: 'Send for approval' },
  },
  item_found: { customer: null, shopper: null },
  awaiting_customer_approval: {
    customer: { title: 'Your shopper is waiting for you to approve the purchase', cta: 'Review and approve' },
    shopper: null,
  },
  purchased: {
    customer: null,
    shopper: { title: 'Upload your receipt to start the delivery', cta: 'Upload receipt' },
  },
  out_for_delivery: {
    customer: { title: 'Confirm once your item arrives', cta: 'Confirm delivery' },
    shopper: null,
  },
  delivered: {
    customer: { title: 'Mark this order complete to release your shopper’s earnings', cta: 'Mark complete' },
    shopper: { title: 'Handed over — mark the job complete', cta: 'Mark complete' },
  },
};

interface ActionNeededBannerProps {
  status: OrderStatus;
  perspective: OrderPerspective;
  /** The panel that actually does the thing. */
  targetId: string;
}

/**
 * Says what you have to do, at the top, before anything else on the page.
 *
 * The timeline shows a stage called "Awaiting your approval" and people read it
 * as a status rather than an instruction — then went looking for the approve
 * button among a map, a price breakdown and a list of options. This states the
 * job in the imperative and takes you straight to it.
 *
 * Renders nothing at all when the order is waiting on the other person, so it
 * never becomes furniture people learn to ignore.
 */
export function ActionNeededBanner({ status, perspective, targetId }: ActionNeededBannerProps) {
  const action = ACTION[status]?.[perspective];
  if (!action) return null;

  return (
    <button
      type="button"
      onClick={() => revealPanel(targetId)}
      className="glass mt-4 flex w-full items-center gap-3 rounded-xl2 border-l-4 border-l-brand-yellow px-4 py-3 text-left transition-colors hover:bg-brand-yellow-soft/30"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow-soft text-yellow-800">
        <ArrowDown size={17} strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-xs font-semibold uppercase tracking-wide text-yellow-800">
          Your turn
        </span>
        <span className="block text-sm font-medium text-brand-ink">{action.title}</span>
      </span>
      <span className="shrink-0 rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white">
        {action.cta}
      </span>
    </button>
  );
}
