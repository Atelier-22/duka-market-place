import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Check, MapPin, Phone, Truck, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { SellerOrder, SellerOrderEvent, SellerOrderItem, SellerOrderStatus } from '../../market/types';
import { ORDER_STATUS_LABEL, formatUgx, timeAgo } from '../../market/format';

interface Detail {
  order: SellerOrder;
  items: SellerOrderItem[];
  events: SellerOrderEvent[];
  customer: { id: string; full_name: string; avatar_url: string | null; created_at: string; ordersWithStore: number; spentWithStoreUgx: number };
}

const NEXT: Partial<Record<SellerOrderStatus, { status: SellerOrderStatus; label: string }[]>> = {
  pending: [{ status: 'confirmed', label: 'Confirm order' }],
  confirmed: [{ status: 'preparing', label: 'Start preparing' }, { status: 'ready', label: 'Ready for delivery' }, { status: 'completed', label: 'Mark delivered' }],
  preparing: [{ status: 'ready', label: 'Ready for delivery' }, { status: 'completed', label: 'Mark delivered' }],
  ready: [{ status: 'completed', label: 'Mark delivered' }],
};

export function SellerOrderDetailPage() {
  const { id = '' } = useParams();
  const { push } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  usePageMeta({ title: data ? `Order #${data.order.order_number}` : 'Order', noindex: true });

  const load = useCallback(() => { api.get(`/seller/orders/${id}`).then((r) => setData(r.data)).catch(() => setMissing(true)); }, [id]);
  useEffect(load, [load]);

  async function move(status: SellerOrderStatus, note?: string) {
    setBusy(true);
    try {
      await api.post(`/seller/orders/${id}/status`, { status, note });
      push(status === 'cancelled' ? 'Order cancelled and stock released' : `Marked ${ORDER_STATUS_LABEL[status].toLowerCase()}`, 'success');
      setCancelOpen(false);
      load();
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  if (missing) return <EmptyState title="Order not found" action={<Link to="/seller/orders"><Button size="sm">Back to orders</Button></Link>} />;
  if (!data) return <SkeletonRegion label="Loading order" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={3} /></div></SkeletonRegion>;

  const { order, items, events, customer } = data;
  const actions = NEXT[order.status] ?? [];
  const canCancel = ['pending', 'confirmed', 'preparing', 'ready'].includes(order.status);

  return (
    <div className="mx-auto max-w-4xl with-action-bar">
      <PageHeader back="/seller/orders" backLabel="Orders" title={`Order #${order.order_number}`} subtitle={`${ORDER_STATUS_LABEL[order.status]} · placed ${timeAgo(order.created_at)}`} actions={<StatusBadge status={order.status} />} />

      {order.status === 'pending' && (
        <Card tone="warning" padding="md" className="mb-4"><p className="text-sm font-medium text-brand-green-deep">Confirm to let {order.customer_name.split(' ')[0]} know it is coming. Stock is already reserved for them.</p></Card>
      )}
      {order.status === 'cancelled' && order.cancel_reason && (
        <Card padding="md" className="mb-4"><p className="text-sm text-ink-2"><span className="font-medium text-ink">Cancelled:</span> {order.cancel_reason}</p></Card>
      )}

      <div className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <Card padding="none">
            <ul className="divide-y divide-line">
              {items.map((i) => (
                <li key={i.id} className="flex gap-3 p-4">
                  <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-ink">{i.product_name}</span>
                    {i.variation_label && <span className="block text-caption text-ink-3">{i.variation_label}</span>}
                    <span className="block text-caption text-ink-3">{i.quantity} × {formatUgx(i.unit_price_ugx)}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-ink">{formatUgx(i.line_total_ugx)}</span>
                </li>
              ))}
            </ul>
            <dl className="flex flex-col gap-1.5 border-t border-line p-4 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Items</dt><dd>{formatUgx(order.subtotal_ugx)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">Delivery</dt><dd>{formatUgx(order.delivery_fee_ugx)}</dd></div>
              <div className="flex justify-between font-semibold text-brand-green-deep"><dt>Collect on delivery</dt><dd>{formatUgx(order.total_ugx)}</dd></div>
              <div className="flex justify-between text-caption text-ink-3"><dt>Payment</dt><dd>{order.payment_method.replace(/_/g, ' ')} · {order.payment_status}</dd></div>
            </dl>
          </Card>

          <Card padding="lg">
            <h2 className="text-sm font-semibold text-ink">Timeline</h2>
            <ol className="mt-3 flex flex-col gap-3">
              {events.map((e) => (
                <li key={e.id} className="flex gap-3 text-sm">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                  <span><span className="block text-ink">{ORDER_STATUS_LABEL[e.status] ?? e.status}{e.actor_role ? <span className="text-ink-3"> · {e.actor_role}</span> : null}</span>{e.note && <span className="block text-caption text-ink-3">{e.note}</span>}<span className="block text-caption text-ink-3">{new Date(e.created_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></span>
                </li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="flex flex-col gap-4 md:sticky md:top-20 md:self-start">
          <Card padding="lg">
            <h2 className="text-sm font-semibold text-ink">Customer</h2>
            <div className="mt-3 flex items-center gap-3">
              <Avatar name={customer.full_name} src={customer.avatar_url} size={40} />
              <div className="min-w-0"><p className="truncate text-sm font-medium text-ink">{order.customer_name}</p><p className="text-caption text-ink-3">{customer.ordersWithStore} order{customer.ordersWithStore === 1 ? '' : 's'} · {formatUgx(customer.spentWithStoreUgx)} with you</p></div>
            </div>
            <a href={`tel:${order.customer_phone}`} className="mt-3 flex min-h-[44px] items-center gap-2 rounded-xl bg-surface-2 px-3 text-sm font-medium text-brand-green"><Phone size={16} /> {order.customer_phone}</a>
          </Card>
          <Card padding="lg">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPin size={16} className="text-brand-green" /> Deliver to</h2>
            <p className="mt-2 text-sm text-ink-2">{order.delivery_line1}{order.delivery_city ? `, ${order.delivery_city}` : ''}</p>
            {order.delivery_notes && <p className="mt-1 rounded-xl bg-surface-2 p-2 text-caption text-ink-2">“{order.delivery_notes}”</p>}
          </Card>
          <div className="hidden flex-col gap-2 md:flex">
            {actions.map((a, i) => (
              <Button key={a.status} fullWidth variant={i === 0 ? 'primary' : 'secondary'} onClick={() => move(a.status)} disabled={busy}>{a.status === 'completed' ? <Truck size={16} /> : <Check size={16} />} {a.label}</Button>
            ))}
            {canCancel && <Button fullWidth variant="tertiary" className="text-brand-red" onClick={() => setCancelOpen(true)} disabled={busy}><X size={16} /> Cancel order</Button>}
          </div>
        </div>
      </div>

      {(actions.length > 0 || canCancel) && (
        <div className="fixed inset-x-0 bottom-[calc(var(--duka-nav-height,0px))] z-30 flex gap-2 border-t border-line bg-surface p-3 md:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          {canCancel && <Button variant="tertiary" className="text-brand-red" onClick={() => setCancelOpen(true)} disabled={busy} aria-label="Cancel order"><X size={18} /></Button>}
          {(actions.length > 2 ? [actions[actions.length - 1], actions[0]] : [...actions].reverse()).map((a, i) => (
            <Button key={a.status} className="flex-1" variant={i === 0 ? 'primary' : 'secondary'} onClick={() => move(a.status)} disabled={busy}>{a.label}</Button>
          ))}
        </div>
      )}

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?">
        <p className="text-sm text-ink-2">The customer is told why, and the reserved stock goes back on sale.</p>
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Out of stock, cannot deliver to that area…" rows={3} maxLength={300} />
        <div className="mt-4 flex justify-end gap-2"><Button variant="tertiary" onClick={() => setCancelOpen(false)}>Keep it</Button><Button className="!bg-brand-red" onClick={() => move('cancelled', reason.trim())} disabled={busy || reason.trim().length < 3}>Cancel order</Button></div>
      </Modal>
    </div>
  );
}
