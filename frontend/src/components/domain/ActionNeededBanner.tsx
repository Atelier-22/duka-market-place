import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, CircleAlert, Clock, Star } from 'lucide-react';
import { OrderPerspective, OrderStatus } from '../../types';
import { revealPanel } from './OrderTimeline';

/**
 * The one strip that tells the person looking at an order what is going on
 * and whether it is their move. Every status has an entry for both sides so
 * nobody is ever left with a bare timeline.
 *
 *  act   → yellow, "Your turn", tap to jump to the action card
 *  wait  → neutral, says who you are waiting on and roughly how long
 *  done  → green, the order is finished (rate the other side)
 *  alert → red, cancelled / disputed
 */
export type ActionTone = 'act' | 'wait' | 'done' | 'alert';

export interface ActionCopy {
  tone: ActionTone;
  title: string;
  cta?: string;
}

const ACTION: Partial<Record<OrderStatus, Record<OrderPerspective, ActionCopy | null>>> = {
  requested: {
    customer: { tone: 'wait', title: 'Waiting for your shopper to accept. This usually takes a few minutes.' },
    shopper: { tone: 'act', title: 'This job is waiting for your answer', cta: 'Accept or decline' },
  },
  shopper_assigned: {
    customer: { tone: 'wait', title: 'Your shopper accepted and is heading out to buy your item.' },
    shopper: { tone: 'act', title: 'Let the customer know you are on your way', cta: 'Start shopping' },
  },
  shopping: {
    customer: { tone: 'wait', title: 'Your shopper is at the shop looking for your item.' },
    shopper: { tone: 'act', title: 'Found it? Send the photo and the real price', cta: 'Send for approval' },
  },
  item_found: {
    customer: { tone: 'wait', title: 'Your shopper found something and is sending you the details.' },
    shopper: null,
  },
  awaiting_customer_approval: {
    customer: { tone: 'act', title: 'Your shopper found it. Approve the price so they can buy it', cta: 'Review and approve' },
    shopper: { tone: 'wait', title: 'Waiting for the customer to approve the price. This page updates on its own.' },
  },
  purchased: {
    customer: { tone: 'wait', title: 'Your shopper is paying the shop and uploading the receipt.' },
    shopper: { tone: 'act', title: 'Upload your receipt to start the delivery', cta: 'Upload receipt' },
  },
  out_for_delivery: {
    customer: { tone: 'act', title: 'Your item is on its way. Confirm once it arrives', cta: 'Confirm delivery' },
    shopper: { tone: 'wait', title: 'Deliver it and the customer confirms. Your earnings release right after.' },
  },
  delivered: {
    customer: { tone: 'act', title: 'Mark this order complete to release your shopper’s earnings', cta: 'Mark complete' },
    shopper: { tone: 'act', title: 'Handed over. Mark the job complete', cta: 'Mark complete' },
  },
  completed: {
    customer: { tone: 'done', title: 'Order complete. Rate your shopper', cta: 'Rate now' },
    shopper: { tone: 'done', title: 'Job complete. Rate this customer', cta: 'Rate now' },
  },
  disputed: {
    customer: { tone: 'alert', title: 'Duka is reviewing this order and will contact you.' },
    shopper: { tone: 'alert', title: 'Duka is reviewing this order and will contact you.' },
  },
  cancelled: {
    customer: { tone: 'alert', title: 'This order was cancelled.' },
    shopper: { tone: 'alert', title: 'This order was cancelled.' },
  },
  refunded: {
    customer: { tone: 'alert', title: 'This order was refunded.' },
    shopper: { tone: 'alert', title: 'This order was refunded.' },
  },
};

/** Copy for a status from one side's point of view; used by list pages too. */
export function actionFor(status: OrderStatus, perspective: OrderPerspective): ActionCopy | null {
  return ACTION[status]?.[perspective] ?? null;
}

/** True when the person looking must do something to move the order on. */
export function isYourTurn(status: OrderStatus, perspective: OrderPerspective): boolean {
  return actionFor(status, perspective)?.tone === 'act';
}

const TONE = {
  act: {
    border: 'border-l-brand-yellow',
    hover: 'hover:bg-brand-yellow-soft/30',
    iconBg: 'bg-brand-yellow-soft text-yellow-800',
    label: 'Your turn',
    labelColor: 'text-yellow-800',
    Icon: ArrowDown,
  },
  wait: {
    border: 'border-l-brand-green-fresh',
    hover: 'hover:bg-brand-green-mist/40',
    iconBg: 'bg-brand-green-mist text-brand-green',
    label: 'Nothing to do yet',
    labelColor: 'text-brand-green',
    Icon: Clock,
  },
  done: {
    border: 'border-l-brand-green',
    hover: 'hover:bg-brand-green-mist/40',
    iconBg: 'bg-brand-green text-white',
    label: 'Done',
    labelColor: 'text-brand-green-deep',
    Icon: Star,
  },
  alert: {
    border: 'border-l-brand-red',
    hover: '',
    iconBg: 'bg-brand-red/10 text-brand-red',
    label: 'Needs attention',
    labelColor: 'text-brand-red',
    Icon: CircleAlert,
  },
} as const;

interface ActionNeededBannerProps {
  status: OrderStatus;
  perspective: OrderPerspective;
  /** Panel to scroll to when tapped (on the order page). */
  targetId?: string;
  /** Navigate here instead of scrolling (on list pages / dashboards). */
  to?: string;
  /** Shopper's estimate from their offer, in minutes; shown while waiting. */
  estimateMinutes?: number | null;
  /** Hide the "rate" prompt once the rating is in. */
  rated?: boolean;
  className?: string;
}

export function ActionNeededBanner({
  status, perspective, targetId, to, estimateMinutes, rated = false, className = '',
}: ActionNeededBannerProps) {
  const action = actionFor(status, perspective);
  if (!action) return null;
  if (status === 'completed' && rated) return null;

  const tone = TONE[action.tone];
  const Icon = tone.Icon;
  const waitingEarly = action.tone === 'wait' && ['requested', 'shopper_assigned', 'shopping', 'item_found'].includes(status);
  const estimate = waitingEarly && estimateMinutes ? `Your shopper estimated about ${estimateMinutes} min in total.` : null;

  const body = (
    <>
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tone.iconBg}`}>
        <Icon size={17} strokeWidth={2.25} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-xs font-semibold uppercase tracking-wide ${tone.labelColor}`}>{tone.label}</span>
        <span className="block text-sm font-medium text-brand-ink">{action.title}</span>
        {estimate && <span className="mt-0.5 block text-xs text-brand-ink/50">{estimate}</span>}
      </span>
      {action.cta && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white">
          {action.cta}
          {to && <ArrowRight size={13} strokeWidth={2.5} />}
        </span>
      )}
    </>
  );

  const classes = `glass mt-4 flex w-full items-center gap-3 rounded-xl2 border-l-4 ${tone.border} px-4 py-3 text-left transition-[background-color,transform] active:scale-[0.99] ${tone.hover} ${className}`;

  if (to) {
    return <Link to={to} className={classes}>{body}</Link>;
  }
  if (action.cta && targetId) {
    return (
      <button type="button" onClick={() => revealPanel(targetId)} className={classes}>
        {body}
      </button>
    );
  }
  return <div className={classes}>{body}</div>;
}
