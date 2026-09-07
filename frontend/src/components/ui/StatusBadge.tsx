import { OrderStatus } from '../../types';

type Tone = 'neutral' | 'progress' | 'success' | 'warning' | 'danger';

const TONE_OF: Record<string, Tone> = {
  requested: 'warning',
  shopper_assigned: 'progress',
  shopping: 'progress',
  item_found: 'progress',
  awaiting_customer_approval: 'warning',
  purchased: 'progress',
  out_for_delivery: 'progress',
  delivered: 'success',
  completed: 'success',
  cancelled: 'neutral',
  disputed: 'danger',
  refunded: 'danger',
  open: 'warning',
  offer_received: 'warning',
  assigned: 'progress',
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  paid: 'success',
  failed: 'danger',
  confirmed: 'progress',
  preparing: 'progress',
  ready: 'progress',
  draft: 'neutral',
  published: 'success',
  archived: 'neutral',
  verified: 'success',
  unverified: 'neutral',
  active: 'success',
  hidden: 'warning',
  suspended: 'danger',
};

const STYLE: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-surface-2 text-ink-2 border-line', dot: 'bg-ink-3' },
  progress: { pill: 'bg-brand-green-mist text-brand-green-deep border-brand-green/15', dot: 'bg-brand-green' },
  success: { pill: 'bg-brand-green-mist text-brand-green-deep border-brand-green-fresh/30', dot: 'bg-brand-green-fresh' },
  warning: { pill: 'bg-warning-soft/60 text-warning border-brand-yellow/40', dot: 'bg-brand-yellow' },
  danger: { pill: 'bg-danger-soft/60 text-brand-red border-brand-red/25', dot: 'bg-brand-red' },
};

const LABELS: Record<string, string> = {
  requested: 'Waiting for shopper', shopper_assigned: 'Shopper accepted', shopping: 'Shopping',
  item_found: 'Item found', awaiting_customer_approval: 'Needs your approval', purchased: 'Purchased',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', completed: 'Completed',
  cancelled: 'Cancelled', disputed: 'Disputed', refunded: 'Refunded', open: 'Open',
  offer_received: 'Offers received', assigned: 'Assigned', pending: 'Pending',
  approved: 'Approved', rejected: 'Rejected', paid: 'Paid', failed: 'Failed',
  confirmed: 'Confirmed', preparing: 'Preparing', ready: 'Ready', draft: 'Draft', published: 'Published',
  archived: 'Archived', verified: 'Verified', unverified: 'Unverified', active: 'Active', hidden: 'Hidden', suspended: 'Suspended',
};

export function StatusBadge({ status, className = '' }: { status: OrderStatus | string; className?: string }) {
  const tone = TONE_OF[status] ?? 'neutral';
  const style = STYLE[tone];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-caption font-semibold ${style.pill} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {LABELS[status] ?? status}
    </span>
  );
}
