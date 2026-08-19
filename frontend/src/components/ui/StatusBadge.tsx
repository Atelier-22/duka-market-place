import { OrderStatus } from '../../types';

const STATUS_STYLES: Record<string, { bg: string; text: string; dot: string }> = {
  requested: { bg: 'bg-brand-yellow/15', text: 'text-yellow-800', dot: 'bg-brand-yellow' },
  shopper_assigned: { bg: 'bg-brand-green-mist', text: 'text-brand-green-deep', dot: 'bg-brand-green' },
  shopping: { bg: 'bg-brand-green-mist', text: 'text-brand-green-deep', dot: 'bg-brand-green-fresh' },
  item_found: { bg: 'bg-brand-green-mist', text: 'text-brand-green-deep', dot: 'bg-brand-green-fresh' },
  awaiting_customer_approval: { bg: 'bg-brand-yellow/15', text: 'text-yellow-800', dot: 'bg-brand-yellow' },
  purchased: { bg: 'bg-brand-green-mist', text: 'text-brand-green-deep', dot: 'bg-brand-green' },
  out_for_delivery: { bg: 'bg-brand-green-mist', text: 'text-brand-green-deep', dot: 'bg-brand-green' },
  delivered: { bg: 'bg-brand-green/15', text: 'text-brand-green-deep', dot: 'bg-brand-green' },
  completed: { bg: 'bg-brand-green/15', text: 'text-brand-green-deep', dot: 'bg-brand-green' },
  cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', dot: 'bg-gray-400' },
  disputed: { bg: 'bg-brand-red/10', text: 'text-brand-red', dot: 'bg-brand-red' },
  refunded: { bg: 'bg-brand-red/10', text: 'text-brand-red', dot: 'bg-brand-red' },
  open: { bg: 'bg-brand-yellow/15', text: 'text-yellow-800', dot: 'bg-brand-yellow' },
  offer_received: { bg: 'bg-brand-yellow/15', text: 'text-yellow-800', dot: 'bg-brand-yellow' },
  assigned: { bg: 'bg-brand-green-mist', text: 'text-brand-green-deep', dot: 'bg-brand-green' },
  pending: { bg: 'bg-brand-yellow/15', text: 'text-yellow-800', dot: 'bg-brand-yellow' },
  approved: { bg: 'bg-brand-green/15', text: 'text-brand-green-deep', dot: 'bg-brand-green' },
  rejected: { bg: 'bg-brand-red/10', text: 'text-brand-red', dot: 'bg-brand-red' },
};

const LABELS: Record<string, string> = {
  requested: 'Requested', shopper_assigned: 'Shopper accepted', shopping: 'Shopping',
  item_found: 'Item found', awaiting_customer_approval: 'Awaiting approval', purchased: 'Purchased',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', completed: 'Completed',
  cancelled: 'Cancelled', disputed: 'Disputed', refunded: 'Refunded', open: 'Open',
  offer_received: 'Offers received', assigned: 'Assigned', pending: 'Pending',
  approved: 'Approved', rejected: 'Rejected',
};

export function StatusBadge({ status }: { status: OrderStatus | string }) {
  const style = STATUS_STYLES[status] ?? { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${style.bg} ${style.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
      {LABELS[status] ?? status}
    </span>
  );
}
