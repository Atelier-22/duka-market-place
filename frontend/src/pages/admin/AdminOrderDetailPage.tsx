import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Scale } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { SkeletonDetail, SkeletonRegion } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Button } from '../../components/ui/Button';
import { Input, labelClasses } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Tabs } from '../../components/ui/Tabs';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { OrderTimeline } from '../../components/domain/OrderTimeline';
import { PricingBreakdown } from '../../components/domain/PricingBreakdown';
import { VoiceNotePlayer } from '../../components/domain/VoiceNotePlayer';
import { ZoomableImage } from '../../components/ui/ZoomableImage';
import { useToast } from '../../components/ui/Toast';
import { OrderStatus } from '../../types';
import { AdminDetailShell, Empty, Field, Panel, Pill, formatDate, formatUgx } from './AdminDetailShell';

const TERMINAL = ['completed', 'cancelled', 'refunded'];

type Side = 'customer' | 'shopper';

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const { push } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelReason, setCancelReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetail, setDisputeDetail] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState<Side>('customer');
  const [busy, setBusy] = useState<'cancel' | 'dispute' | null>(null);

  const load = useCallback(() => {
    api.get(`/admin/orders/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load this order.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  function retry() {
    setError(null);
    setLoading(true);
    load();
  }

  async function forceCancel() {
    if (cancelReason.trim().length < 3) {
      push('Give a reason — it is recorded against the order', 'error');
      return;
    }
    setBusy('cancel');
    try {
      await api.post(`/admin/orders/${id}/force-cancel`, { reason: cancelReason.trim() });
      setCancelReason('');
      push('Order cancelled', 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function openDispute() {
    if (disputeReason.trim().length < 3 || disputeDetail.trim().length < 3) {
      push('A dispute needs a reason and a description', 'error');
      return;
    }
    setBusy('dispute');
    try {
      await api.post(`/admin/orders/${id}/dispute`, {
        reason: disputeReason.trim(),
        description: disputeDetail.trim(),
        onBehalfOf,
      });
      setDisputeReason('');
      setDisputeDetail('');
      push('Dispute opened', 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (loading) return <SkeletonRegion label="Loading"><SkeletonDetail /></SkeletonRegion>;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl pb-16">
        <PageHeader back title="Order" />
        <EmptyState
          title={error ?? 'Not found.'}
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={retry}>Try again</Button>}
        />
      </div>
    );
  }

  const { order, history, items, evidence, receipts, messages, disputes, payments } = data;
  const isTerminal = TERMINAL.includes(order.status);

  return (
    <AdminDetailShell
      title={`Order #${order.id.slice(0, 8)}`}
      subtitle={order.request_title}
      badges={<StatusBadge status={order.status as OrderStatus} />}
    >
      <Panel title="Parties">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-label font-semibold uppercase text-ink-3">Customer</p>
            {order.customer_id ? (
              <Link to={`/admin/customers/${order.customer_id}`} className="mt-1 block text-body font-medium text-brand-green-deep hover:underline">
                {order.customer_name}
              </Link>
            ) : <p className="mt-1 text-body text-ink-3">—</p>}
            <p className="text-caption text-ink-3">{order.customer_phone}</p>
          </div>
          <div>
            <p className="text-label font-semibold uppercase text-ink-3">Shopper</p>
            {order.shopper_id ? (
              <Link to={`/admin/shoppers/${order.shopper_id}`} className="mt-1 block text-body font-medium text-brand-green-deep hover:underline">
                {order.shopper_name}
              </Link>
            ) : <p className="mt-1 text-body text-ink-3">Unassigned</p>}
            <p className="text-caption text-ink-3">{order.shopper_phone}</p>
          </div>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 md:grid-cols-4">
          <Field label="Created" value={formatDate(order.created_at)} />
          <Field label="Delivering to" value={order.delivery_line1 ? `${order.delivery_line1}, ${order.delivery_city}` : '—'} />
          <Field label="Total" value={<span className="tabular-nums">{formatUgx(order.total_amount_ugx)}</span>} />
          <Field label="Payments" value={payments.length ? `${payments.length} record(s)` : 'none'} />
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Timeline">
          <OrderTimeline status={order.status as OrderStatus} />
        </Panel>

        <div className="flex flex-col gap-6">
          {order.item_price_ugx && (
            <Panel title="Pricing">
              <PricingBreakdown
                itemPriceUgx={order.item_price_ugx}
                shoppingFeeUgx={order.shopping_fee_ugx}
                deliveryFeeUgx={order.delivery_fee_ugx}
                platformFeeUgx={order.platform_fee_ugx}
                totalUgx={order.total_amount_ugx ?? undefined}
              />
            </Panel>
          )}

          <Panel title="Status history" count={history.length}>
            {history.length === 0 ? <Empty title="No changes yet" /> : (
              <div className="flex flex-col">
                {history.map((h: any) => (
                  <div key={h.id} className="border-b border-line py-2.5 last:border-0">
                    <p className="text-sm text-ink">
                      {h.from_status ? `${h.from_status.replace(/_/g, ' ')} → ` : ''}
                      <strong className="font-semibold">{h.to_status.replace(/_/g, ' ')}</strong>
                    </p>
                    <p className="text-caption text-ink-3">
                      {h.changed_by_name ?? 'System'} · {formatDate(h.created_at)}
                    </p>
                    {h.note && <p className="mt-0.5 text-caption text-ink-2">{h.note}</p>}
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {items.length > 0 && (
        <Panel title="Purchase options" count={items.length}>
          <div className="grid gap-3 sm:grid-cols-3">
            {items.map((it: any) => (
              <div
                key={it.id}
                className={`rounded-xl border p-3 ${it.is_selected ? 'border-brand-green-fresh bg-brand-green-mist' : 'border-line'}`}
              >
                {it.photo_url && (
                  <ZoomableImage
                    src={it.photo_url}
                    alt={it.name}
                    caption={`${it.name}${it.shop_name ? ` · ${it.shop_name}` : ''}`}
                    wrapperClassName="mb-3 w-full rounded-lg"
                    className="h-28 w-full rounded-lg object-cover"
                  />
                )}
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-brand-green-deep">{it.name}</p>
                  {it.is_selected && <Pill tone="success">Chosen</Pill>}
                </div>
                <p className="mt-0.5 text-caption text-ink-3">
                  <span className="tabular-nums">{formatUgx(it.price_ugx)}</span>{it.shop_name ? ` · ${it.shop_name}` : ''}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Evidence and receipts" count={evidence.length + receipts.length}>
        {evidence.length === 0 && receipts.length === 0 ? <Empty title="Nothing uploaded" description="Photos and receipts the shopper adds will appear here." /> : (
          <div className="grid gap-3 sm:grid-cols-3">
            {evidence.map((e: any) => (
              <div key={e.id} className="rounded-xl border border-line p-2">
                <ZoomableImage
                  src={e.file_url}
                  alt={e.type.replace(/_/g, ' ')}
                  caption={`${e.type.replace(/_/g, ' ')} · ${e.uploaded_by_name}`}
                  wrapperClassName="w-full rounded-lg"
                  className="h-28 w-full rounded-lg object-cover"
                />
                <p className="mt-2 text-caption font-medium capitalize text-brand-green-deep">{e.type.replace(/_/g, ' ')}</p>
                <p className="text-caption text-ink-3">{e.uploaded_by_name} · {formatDate(e.created_at)}</p>
                {e.caption && <p className="text-caption text-ink-2">{e.caption}</p>}
              </div>
            ))}
            {receipts.map((r: any) => (
              <div key={r.id} className="rounded-xl border border-line p-3">
                <p className="text-caption font-medium text-brand-green-deep">Receipt</p>
                <p className="mt-1 text-sm tabular-nums text-ink">{formatUgx(r.amount_ugx)}</p>
                <p className="text-caption text-ink-3">{r.shop_name ?? ''} {formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Conversation" count={messages.length}>
        {messages.length === 0 ? <Empty title="No messages exchanged" /> : (
          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((m: any) => (
              <div
                key={m.id}
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                  m.sender_role === 'shopper' ? 'self-start bg-brand-green-mist' : 'self-end border border-line bg-surface-2'
                }`}
              >
                <p className="text-caption font-semibold text-ink-2">{m.sender_name} · {m.sender_role}</p>
                {m.body && <p className="mt-0.5 text-sm text-ink">{m.body}</p>}

                {m.attachment_url && m.attachment_type === 'audio' && (
                  <div className="mt-2">
                    <VoiceNotePlayer src={m.attachment_url} durationMs={m.attachment_duration_ms} tone="other" />
                  </div>
                )}
                {m.attachment_url && m.attachment_type !== 'audio' && (
                  <ZoomableImage
                    src={m.attachment_url}
                    alt={`Attachment from ${m.sender_name}`}
                    caption={`${m.sender_name} · ${formatDate(m.created_at)}`}
                    wrapperClassName="mt-2 rounded-lg"
                    className="max-h-40 rounded-lg object-cover"
                  />
                )}
                <p className="mt-1 text-caption text-ink-3">{formatDate(m.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {disputes.length > 0 && (
        <Panel title="Disputes" count={disputes.length}>
          <div className="flex flex-col gap-2">
            {disputes.map((d: any) => (
              <div key={d.id} className="rounded-xl border border-brand-red/25 bg-danger-soft/30 px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-ink">{d.reason}</p>
                  <span className="text-label font-semibold uppercase text-brand-red">{d.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-caption text-ink-2">{d.description}</p>
                <p className="mt-1 text-caption text-ink-3">{formatDate(d.created_at)}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Admin actions" tone="danger">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Ban size={16} strokeWidth={2} className="text-brand-red" /> Force-cancel
            </p>
            <p className="mt-1 text-small text-ink-2">
              {isTerminal
                ? `This order is already ${order.status}.`
                : 'Bypasses the normal flow. The reason is recorded in the order history against your account.'}
            </p>
            {!isTerminal && (
              <div className="mt-4 flex flex-col gap-4">
                <Input label="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                <div>
                  <Button
                    size="sm"
                    variant="destructive"
                    loading={busy === 'cancel'}
                    disabled={busy !== null}
                    onClick={forceCancel}
                  >
                    Force-cancel this order
                  </Button>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <Scale size={16} strokeWidth={2} className="text-warning" /> Open a dispute on their behalf
            </p>
            <p className="mt-1 text-small text-ink-2">
              For complaints that arrive by phone or message. Recorded against the person it is for, not you.
            </p>
            <div className="mt-4 flex flex-col gap-4">
              <div>
                <p className={labelClasses}>On behalf of</p>
                <Tabs
                  ariaLabel="On behalf of"
                  value={onBehalfOf}
                  onChange={setOnBehalfOf}
                  items={[
                    { value: 'customer', label: 'Customer' },
                    { value: 'shopper', label: 'Shopper' },
                  ]}
                />
              </div>
              <Input label="Reason" placeholder="never_delivered" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
              <Textarea label="What happened" value={disputeDetail} onChange={(e) => setDisputeDetail(e.target.value)} />
              <div>
                <Button
                  size="sm"
                  variant="secondary"
                  loading={busy === 'dispute'}
                  disabled={busy !== null}
                  onClick={openDispute}
                >
                  Open dispute
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </AdminDetailShell>
  );
}
