import { Link } from 'react-router-dom';
import { ArrowDown, ArrowRight, CircleAlert, Clock, Star } from 'lucide-react';
import { OrderPerspective, OrderStatus } from '../../types';
import { revealPanel } from './OrderTimeline';

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

export function actionFor(status: OrderStatus, perspective: OrderPerspective): ActionCopy | null {
  return ACTION[status]?.[perspective] ?? null;
}

export function isYourTurn(status: OrderStatus, perspective: OrderPerspective): boolean {
  return actionFor(status, perspective)?.tone === 'act';
}

const TONE = {
  act: {
    box: 'border-brand-yellow/60 bg-warning-soft/40',
    iconBg: 'bg-brand-yellow text-brand-ink',
    label: 'Your turn',
    labelColor: 'text-warning',
    Icon: ArrowDown,
  },
  wait: {
    box: 'border-line bg-surface',
    iconBg: 'bg-brand-green-mist text-brand-green',
    label: 'Nothing to do yet',
    labelColor: 'text-brand-green',
    Icon: Clock,
  },
  done: {
    box: 'border-brand-green-fresh/40 bg-brand-green-mist/50',
    iconBg: 'bg-brand-green text-white',
    label: 'Done',
    labelColor: 'text-brand-green-deep',
    Icon: Star,
  },
  alert: {
    box: 'border-brand-red/30 bg-danger-soft/30',
    iconBg: 'bg-brand-red text-white',
    label: 'Needs attention',
    labelColor: 'text-brand-red',
    Icon: CircleAlert,
  },
} as const;

interface ActionNeededBannerProps {
  status: OrderStatus;
  perspective: OrderPerspective;
  targetId?: string;
  to?: string;
  estimateMinutes?: number | null;
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
        <span className={`block text-label font-semibold uppercase ${tone.labelColor}`}>{tone.label}</span>
        <span className="block text-sm font-medium text-ink">{action.title}</span>
        {estimate && <span className="mt-0.5 block text-caption text-ink-3">{estimate}</span>}
      </span>
      {action.cta && (
        <span className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-green px-3 py-2 text-caption font-semibold text-white">
          {action.cta}
          {to && <ArrowRight size={13} strokeWidth={2.5} />}
        </span>
      )}
    </>
  );

  const interactive = !!to || !!(action.cta && targetId);
  const classes = [
    'mt-4 flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-card',
    'transition-[border-color,transform,box-shadow] duration-150',
    tone.box,
    interactive ? 'hover:border-line-strong hover:shadow-raised active:scale-[0.99]' : '',
    className,
  ].join(' ');

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
