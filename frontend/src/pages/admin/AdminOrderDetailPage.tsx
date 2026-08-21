import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, Scale } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { LoadingState } from '../../components/ui/LoadingState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { OrderTimeline } from '../../components/domain/OrderTimeline';
import { PricingBreakdown } from '../../components/domain/PricingBreakdown';
import { useToast } from '../../components/ui/Toast';
import { OrderStatus } from '../../types';
import { AdminDetailShell, Empty, Field, Panel, formatDate, formatUgx } from './AdminDetailShell';

const TERMINAL = ['completed', 'cancelled', 'refunded'];

export function AdminOrderDetailPage() {
  const { id } = useParams();
  const { push } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [cancelReason, setCancelReason] = useState('');
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDetail, setDisputeDetail] = useState('');
  const [onBehalfOf, setOnBehalfOf] = useState<'customer' | 'shopper'>('customer');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/admin/orders/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load this order.'))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);

  async function forceCancel() {
    if (cancelReason.trim().length < 3) {
      push('Give a reason — it is recorded against the order', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/admin/orders/${id}/force-cancel`, { reason: cancelReason.trim() });
      setCancelReason('');
      push('Order cancelled', 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  async function openDispute() {
    if (disputeReason.trim().length < 3 || disputeDetail.trim().length < 3) {
      push('A dispute needs a reason and a description', 'error');
      return;
    }
    setBusy(true);
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
      setBusy(false);
    }
  }

  if (loading) return <LoadingState label="Loading order…" />;
  if (error || !data) return <p className="p-8 text-sm text-brand-red">{error ?? 'Not found.'}</p>;

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
            <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">Customer</p>
            {order.customer_id ? (
              <Link to={`/admin/customers/${order.customer_id}`} className="mt-0.5 block text-sm font-medium text-brand-green-deep hover:underline">
                {order.customer_name}
              </Link>
            ) : <p className="text-sm text-brand-ink/50">—</p>}
            <p className="text-xs text-brand-ink/45">{order.customer_phone}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">Shopper</p>
            {order.shopper_id ? (
              <Link to={`/admin/shoppers/${order.shopper_id}`} className="mt-0.5 block text-sm font-medium text-brand-green-deep hover:underline">
                {order.shopper_name}
              </Link>
            ) : <p className="text-sm text-brand-ink/50">Unassigned</p>}
            <p className="text-xs text-brand-ink/45">{order.shopper_phone}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4 border-t border-brand-green/10 pt-4 md:grid-cols-4">
          <Field label="Created" value={formatDate(order.created_at)} />
          <Field label="Delivering to" value={order.delivery_line1 ? `${order.delivery_line1}, ${order.delivery_city}` : '—'} />
          <Field label="Total" value={formatUgx(order.total_amount_ugx)} />
          <Field label="Payments" value={payments.length ? `${payments.length} record(s)` : 'none'} />
        </div>
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Timeline">
          <OrderTimeline status={order.status as OrderStatus} />
        </Panel>

        <div className="flex flex-col gap-5">
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
            <div className="flex flex-col">
              {history.map((h: any) => (
                <div key={h.id} className="border-b border-brand-green/5 py-2 last:border-0">
                  <p className="text-sm text-brand-ink/75">
                    {h.from_status ? `${h.from_status.replace(/_/g, ' ')} → ` : ''}
                    <strong>{h.to_status.replace(/_/g, ' ')}</strong>
                  </p>
                  <p className="text-[11px] text-brand-ink/40">
                    {h.changed_by_name ?? 'System'} · {formatDate(h.created_at)}
                  </p>
                  {h.note && <p className="mt-0.5 text-xs text-brand-ink/55">{h.note}</p>}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {items.length > 0 && (
        <Panel title="Purchase options" count={items.length}>
          <div className="grid gap-3 sm:grid-cols-3">
            {items.map((it: any) => (
              <div key={it.id} className={`rounded-xl2 border p-3 ${it.is_selected ? 'border-brand-green-fresh bg-brand-green-mist' : 'border-brand-green/15'}`}>
                {it.photo_url && <img src={it.photo_url} alt="" className="mb-2 h-28 w-full rounded-lg object-cover" />}
                <p className="text-sm font-medium text-brand-green-deep">{it.name}</p>
                <p className="text-xs text-brand-ink/50">{formatUgx(it.price_ugx)}{it.shop_name ? ` · ${it.shop_name}` : ''}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Evidence and receipts" count={evidence.length + receipts.length}>
        {evidence.length === 0 && receipts.length === 0 ? <Empty>Nothing uploaded.</Empty> : (
          <div className="grid gap-3 sm:grid-cols-3">
            {evidence.map((e: any) => (
              <a key={e.id} href={e.file_url} target="_blank" rel="noreferrer" className="block rounded-xl2 border border-brand-green/15 p-2 hover:bg-brand-green-mist/40">
                <img src={e.file_url} alt="" className="h-28 w-full rounded-lg object-cover" />
                <p className="mt-2 text-xs font-medium text-brand-green-deep">{e.type.replace(/_/g, ' ')}</p>
                <p className="text-[11px] text-brand-ink/45">{e.uploaded_by_name} · {formatDate(e.created_at)}</p>
                {e.caption && <p className="text-[11px] text-brand-ink/55">{e.caption}</p>}
              </a>
            ))}
            {receipts.map((r: any) => (
              <div key={r.id} className="rounded-xl2 border border-brand-green/15 p-3">
                <p className="text-xs font-medium text-brand-green-deep">Receipt</p>
                <p className="mt-1 text-sm text-brand-ink/75">{formatUgx(r.amount_ugx)}</p>
                <p className="text-[11px] text-brand-ink/45">{r.shop_name ?? ''} {formatDate(r.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Conversation" count={messages.length}>
        {messages.length === 0 ? <Empty>No messages exchanged.</Empty> : (
          <div className="flex max-h-96 flex-col gap-3 overflow-y-auto pr-1">
            {messages.map((m: any) => (
              <div key={m.id} className={`max-w-[80%] rounded-xl2 px-3 py-2 ${m.sender_role === 'shopper' ? 'self-start bg-brand-green-mist' : 'self-end bg-brand-white/80 border border-brand-green/10'}`}>
                <p className="text-[11px] font-semibold text-brand-ink/50">{m.sender_name} · {m.sender_role}</p>
                {m.body && <p className="mt-0.5 text-sm text-brand-ink/80">{m.body}</p>}
                {m.attachment_url && (
                  <a href={m.attachment_url} target="_blank" rel="noreferrer">
                    <img src={m.attachment_url} alt="" className="mt-2 max-h-40 rounded-lg object-cover" />
                  </a>
                )}
                <p className="mt-1 text-[10px] text-brand-ink/35">{formatDate(m.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {disputes.length > 0 && (
        <Panel title="Disputes" count={disputes.length}>
          <div className="flex flex-col gap-2">
            {disputes.map((d: any) => (
              <div key={d.id} className="rounded-xl border border-brand-red/20 bg-brand-red/5 px-3 py-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-brand-ink">{d.reason}</p>
                  <span className="text-xs font-semibold uppercase text-brand-red">{d.status.replace(/_/g, ' ')}</span>
                </div>
                <p className="mt-1 whitespace-pre-line text-xs text-brand-ink/60">{d.description}</p>
                <p className="mt-1 text-[11px] text-brand-ink/40">{formatDate(d.created_at)}</p>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* Admin-only interventions. Deliberately last, and never one-click. */}
      <Panel title="Admin actions">
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-brand-ink">
              <Ban size={15} strokeWidth={2} className="text-brand-red" /> Force-cancel
            </p>
            <p className="mt-1 text-xs text-brand-ink/45">
              {isTerminal
                ? `This order is already ${order.status}.`
                : 'Bypasses the normal flow. The reason is recorded in the order history against your account.'}
            </p>
            {!isTerminal && (
              <div className="mt-3 flex flex-col gap-2">
                <Input label="Reason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
                <div>
                  <GlassButton size="sm" variant="danger" disabled={busy} onClick={forceCancel}>
                    Force-cancel this order
                  </GlassButton>
                </div>
              </div>
            )}
          </div>

          <div>
            <p className="flex items-center gap-2 text-sm font-medium text-brand-ink">
              <Scale size={15} strokeWidth={2} className="text-brand-yellow" /> Open a dispute on their behalf
            </p>
            <p className="mt-1 text-xs text-brand-ink/45">
              For complaints that arrive by phone or message. Recorded against the person it is for, not you.
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <div className="flex gap-2">
                {(['customer', 'shopper'] as const).map((side) => (
                  <button
                    key={side}
                    type="button"
                    onClick={() => setOnBehalfOf(side)}
                    className={[
                      'rounded-full px-3 py-1.5 text-xs font-semibold capitalize transition-colors',
                      onBehalfOf === side ? 'bg-brand-green text-white' : 'bg-brand-green-mist text-brand-ink/60',
                    ].join(' ')}
                  >
                    {side}
                  </button>
                ))}
              </div>
              <Input label="Reason" placeholder="never_delivered" value={disputeReason} onChange={(e) => setDisputeReason(e.target.value)} />
              <Textarea label="What happened" value={disputeDetail} onChange={(e) => setDisputeDetail(e.target.value)} />
              <div>
                <GlassButton size="sm" variant="secondary" disabled={busy} onClick={openDispute}>
                  Open dispute
                </GlassButton>
              </div>
            </div>
          </div>
        </div>
      </Panel>
    </AdminDetailShell>
  );
}
