import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapPin, Phone, Star, Store as StoreIcon } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RatingStars } from '../../components/ui/RatingStars';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { SellerOrder, SellerOrderEvent, SellerOrderItem } from '../../market/types';
import { ORDER_STATUS_LABEL, formatUgx } from '../../market/format';

interface Detail {
  order: SellerOrder & { store_phone: string | null };
  items: SellerOrderItem[];
  events: SellerOrderEvent[];
  productReviews: { product_id: string; stars: number; comment: string | null }[];
  storeReview: { stars: number; comment: string | null } | null;
}

export function PurchaseDetailPage() {
  const { id = '' } = useParams();
  const { push } = useToast();
  const [data, setData] = useState<Detail | null>(null);
  const [missing, setMissing] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [storeStars, setStoreStars] = useState(5);
  const [storeComment, setStoreComment] = useState('');
  const [productStars, setProductStars] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);

  usePageMeta({ title: data ? `Order #${data.order.order_number}` : 'Purchase', noindex: true });

  const load = useCallback(() => {
    api.get(`/marketplace/orders/${id}`).then((r) => setData(r.data)).catch(() => setMissing(true));
  }, [id]);
  useEffect(load, [load]);

  useEffect(() => {
    if (!data) return;
    const open = ['pending', 'confirmed', 'preparing', 'ready'].includes(data.order.status);
    if (!open) return;
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [data, load]);

  if (missing) return <EmptyState title="Order not found" action={<Link to="/app/purchases"><Button size="sm">Back to purchases</Button></Link>} />;
  if (!data) return <SkeletonRegion label="Loading order" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={3} /></div></SkeletonRegion>;

  const { order, items, events } = data;
  const canCancel = order.status === 'pending';
  const canReview = order.status === 'completed' && !data.storeReview;

  async function cancel() {
    setBusy(true);
    try {
      await api.post(`/marketplace/orders/${id}/cancel`, { reason: reason.trim() || undefined });
      push('Order cancelled', 'success');
      setCancelOpen(false);
      load();
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  async function review() {
    setBusy(true);
    try {
      await api.post(`/marketplace/orders/${id}/review`, {
        storeStars,
        storeComment: storeComment.trim() || undefined,
        products: items.filter((i) => i.product_id).map((i) => ({ productId: i.product_id!, stars: productStars[i.product_id!] ?? storeStars })),
      });
      push('Thanks for the review', 'success');
      setReviewOpen(false);
      load();
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader back="/app/purchases" backLabel="Purchases" title={`Order #${order.order_number}`} subtitle={ORDER_STATUS_LABEL[order.status]} actions={<StatusBadge status={order.status} />} />

      {canReview && (
        <Card tone="success" padding="md" className="mb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-brand-green-deep"><Star size={16} /> Delivered. How was {order.store_name}?</p>
            <Button size="sm" onClick={() => setReviewOpen(true)}>Leave a review</Button>
          </div>
        </Card>
      )}

      <Card padding="none" className="mb-4">
        <Link to={`/store/${order.store_slug}`} className="flex items-center gap-3 border-b border-line p-4 hover:bg-surface-2">
          <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand-green-mist text-brand-green-deep">
            {order.store_logo ? <img src={order.store_logo} alt="" className="h-full w-full object-cover" /> : <StoreIcon size={18} />}
          </span>
          <span className="min-w-0 flex-1"><span className="block font-medium text-ink">{order.store_name}</span><span className="block text-caption text-ink-3">View store</span></span>
          {order.store_phone && <a href={`tel:${order.store_phone}`} onClick={(e) => e.stopPropagation()} className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-2 text-brand-green" aria-label="Call the store"><Phone size={16} /></a>}
        </Link>
        <ul className="divide-y divide-line">
          {items.map((i) => (
            <li key={i.id} className="flex gap-3 p-4">
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</span>
              <span className="min-w-0 flex-1">
                {i.product_id ? <Link to={`/product/${i.product_id}`} className="block text-sm font-medium text-ink hover:text-brand-green">{i.product_name}</Link> : <span className="block text-sm font-medium text-ink">{i.product_name}</span>}
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
          <div className="flex justify-between font-semibold text-brand-green-deep"><dt>Pay on delivery</dt><dd>{formatUgx(order.total_ugx)}</dd></div>
        </dl>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card padding="lg">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink"><MapPin size={16} className="text-brand-green" /> Delivering to</h2>
          <p className="mt-2 text-sm text-ink-2">{order.delivery_line1}{order.delivery_city ? `, ${order.delivery_city}` : ''}</p>
          {order.delivery_notes && <p className="mt-1 text-caption text-ink-3">Note: {order.delivery_notes}</p>}
          {canCancel && <Button variant="secondary" size="sm" className="mt-4 text-brand-red" onClick={() => setCancelOpen(true)}>Cancel order</Button>}
        </Card>
        <Card padding="lg">
          <h2 className="text-sm font-semibold text-ink">Progress</h2>
          <ol className="mt-3 flex flex-col gap-3">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-green" />
                <span><span className="block text-ink">{ORDER_STATUS_LABEL[e.status] ?? e.status}</span>{e.note && <span className="block text-caption text-ink-3">{e.note}</span>}<span className="block text-caption text-ink-3">{new Date(e.created_at).toLocaleString('en-UG', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span></span>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      {data.storeReview && (
        <Card padding="lg" className="mt-4">
          <h2 className="text-sm font-semibold text-ink">Your review</h2>
          <RatingStars value={data.storeReview.stars} />
          {data.storeReview.comment && <p className="mt-1 text-sm text-ink-2">{data.storeReview.comment}</p>}
        </Card>
      )}

      <Modal open={cancelOpen} onClose={() => setCancelOpen(false)} title="Cancel this order?">
        <p className="text-sm text-ink-2">The store has not confirmed yet, so nothing is charged. Tell them why, if you like.</p>
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Changed my mind, found it elsewhere…" rows={3} maxLength={300} />
        <div className="mt-4 flex justify-end gap-2"><Button variant="tertiary" onClick={() => setCancelOpen(false)}>Keep it</Button><Button className="!bg-brand-red" onClick={cancel} disabled={busy}>Cancel order</Button></div>
      </Modal>

      <Modal open={reviewOpen} onClose={() => setReviewOpen(false)} title={`Review ${order.store_name}`}>
        <p className="text-sm font-medium text-ink">The store</p>
        <RatingStars value={storeStars} size="md" interactive onChange={setStoreStars} />
        <Textarea className="mt-3" value={storeComment} onChange={(e) => setStoreComment(e.target.value)} placeholder="How was the service and delivery?" rows={3} maxLength={1000} />
        {items.filter((i) => i.product_id).length > 0 && (
          <div className="mt-4 flex flex-col gap-3">
            <p className="text-sm font-medium text-ink">The products</p>
            {items.filter((i) => i.product_id).map((i) => (
              <div key={i.id} className="flex items-center justify-between gap-3 text-sm"><span className="min-w-0 truncate text-ink-2">{i.product_name}</span><RatingStars value={productStars[i.product_id!] ?? storeStars} size="md" interactive onChange={(v) => setProductStars((s) => ({ ...s, [i.product_id!]: v }))} /></div>
            ))}
          </div>
        )}
        <div className="mt-5 flex justify-end gap-2"><Button variant="tertiary" onClick={() => setReviewOpen(false)}>Not now</Button><Button onClick={review} disabled={busy}>Submit review</Button></div>
      </Modal>
    </div>
  );
}
