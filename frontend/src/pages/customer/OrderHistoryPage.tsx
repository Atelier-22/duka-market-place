import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, PlusCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Order, OrderStatus, ShoppingRequest } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RequestCard } from '../../components/domain/RequestCard';
import { actionFor, isYourTurn } from '../../components/domain/ActionNeededBanner';
import { SkeletonRegion, SkeletonRequestGrid, SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

type View = 'orders' | 'requests';

const FINISHED: OrderStatus[] = ['completed', 'cancelled', 'refunded'];

function OrderRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const yourTurn = isYourTurn(order.status, 'customer');
  const copy = actionFor(order.status, 'customer');
  return (
    <GlassCard
      hover
      glow={yourTurn ? 'yellow' : 'none'}
      onClick={onClick}
      className="flex cursor-pointer items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="font-medium text-brand-ink">Order #{order.id.slice(0, 8)}</p>
        <p className="text-xs text-brand-ink/45">
          {order.total_amount_ugx ? formatUgx(order.total_amount_ugx) : 'Price pending'} ·{' '}
          {new Date(order.created_at).toLocaleDateString('en-UG')}
        </p>
        {yourTurn && copy?.cta && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-yellow-800">
            Your turn: {copy.cta} <ArrowRight size={12} strokeWidth={2.5} />
          </p>
        )}
      </div>
      <StatusBadge status={order.status} />
    </GlassCard>
  );
}

export function OrdersListPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const view: View = params.get('view') === 'requests' ? 'requests' : 'orders';

  const [orders, setOrders] = useState<Order[]>([]);
  const [requests, setRequests] = useState<ShoppingRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/orders/mine').then((res) => setOrders(res.data.orders)).catch(() => undefined),
      api.get('/requests/mine').then((res) => setRequests(res.data.requests)).catch(() => undefined),
    ]).finally(() => setLoading(false));
  }, []);

  const needsYou = orders.filter((o) => isYourTurn(o.status, 'customer'));
  const inProgress = orders.filter((o) => !FINISHED.includes(o.status) && !isYourTurn(o.status, 'customer'));
  const past = orders.filter((o) => FINISHED.includes(o.status));
  const liveCount = needsYou.length + inProgress.length;

  const openRequests = requests.filter((r) => r.status === 'open' || r.status === 'offer_received');
  const pastRequests = requests.filter((r) => r.status !== 'open' && r.status !== 'offer_received');

  function setView(next: View) {
    const updated = new URLSearchParams(params);
    if (next === 'orders') updated.delete('view');
    else updated.set('view', next);
    setParams(updated, { replace: true });
  }

  const tab = (key: View, label: string) => (
    <button
      role="tab"
      aria-selected={view === key}
      onClick={() => setView(key)}
      className={[
        'min-h-[40px] rounded-xl px-4 text-sm font-medium transition-[background-color,transform] active:scale-[0.98]',
        view === key ? 'bg-brand-green text-white' : 'glass text-brand-ink/60',
      ].join(' ')}
    >
      {label}
    </button>
  );

  const section = (title: string, children: React.ReactNode) => (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">{title}</p>
      {children}
    </div>
  );

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Your orders</h1>
        <GlassButton size="sm" onClick={() => navigate('/app/requests/new')}>
          <PlusCircle size={16} strokeWidth={2} /> New request
        </GlassButton>
      </div>

      <div className="mt-4 flex gap-2" role="tablist" aria-label="Orders or requests">
        {tab('orders', loading ? 'Orders' : `Orders (${liveCount} live)`)}
        {tab('requests', loading ? 'Requests' : `Waiting for a shopper (${openRequests.length})`)}
      </div>

      <div className="mt-6">
        {loading ? (
          <SkeletonRegion label="Loading your orders">
            {view === 'orders' ? <SkeletonRows count={4} /> : <SkeletonRequestGrid count={3} />}
          </SkeletonRegion>
        ) : view === 'orders' ? (
          orders.length === 0 ? (
            <EmptyState
              title="Nothing on its way yet"
              description="Once you choose a shopper for a request, the order appears here."
            />
          ) : (
            <div className="flex flex-col gap-6">
              {needsYou.length > 0 && section('Needs you', (
                <div className="flex flex-col gap-3">
                  {needsYou.map((o) => <OrderRow key={o.id} order={o} onClick={() => navigate(`/app/orders/${o.id}`)} />)}
                </div>
              ))}
              {inProgress.length > 0 && section('In progress', (
                <div className="flex flex-col gap-3">
                  {inProgress.map((o) => <OrderRow key={o.id} order={o} onClick={() => navigate(`/app/orders/${o.id}`)} />)}
                </div>
              ))}
              {past.length > 0 && section('Past orders', (
                <div className="flex flex-col gap-3">
                  {past.map((o) => <OrderRow key={o.id} order={o} onClick={() => navigate(`/app/orders/${o.id}`)} />)}
                </div>
              ))}
            </div>
          )
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Tell us what you need and a nearby shopper will pick it up."
          />
        ) : (
          <div className="flex flex-col gap-6">
            {openRequests.length === 0 ? (
              <EmptyState
                title="Nothing waiting"
                description="Every request you posted already has a shopper, or was closed."
              />
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {openRequests.map((r) => (
                  <RequestCard key={r.id} request={r} onClick={() => navigate(`/app/requests/${r.id}`)} />
                ))}
              </div>
            )}
            {pastRequests.length > 0 && section('Past requests', (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastRequests.map((r) => (
                  <RequestCard key={r.id} request={r} onClick={() => navigate(`/app/requests/${r.id}`)} />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
