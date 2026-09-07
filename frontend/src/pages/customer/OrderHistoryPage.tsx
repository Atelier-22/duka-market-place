import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Order, ShoppingRequest } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RequestCard } from '../../components/domain/RequestCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

type View = 'orders' | 'requests';

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

  const openRequests = requests.filter((r) => r.status === 'open' || r.status === 'offer_received');

  function setView(next: View) {
    const updated = new URLSearchParams(params);
    if (next === 'orders') updated.delete('view');
    else updated.set('view', next);
    setParams(updated, { replace: true });
  }

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Your orders</h1>
        <GlassButton size="sm" onClick={() => navigate('/app/requests/new')}>
          <PlusCircle size={16} strokeWidth={2} /> New request
        </GlassButton>
      </div>

      <div className="mt-4 flex gap-2" role="tablist" aria-label="Orders or requests">
        <button
          role="tab"
          aria-selected={view === 'orders'}
          onClick={() => setView('orders')}
          className={[
            'min-h-[40px] rounded-xl px-4 text-sm font-medium transition-colors',
            view === 'orders' ? 'bg-brand-green text-white' : 'glass text-brand-ink/60',
          ].join(' ')}
        >
          Being delivered ({orders.length})
        </button>
        <button
          role="tab"
          aria-selected={view === 'requests'}
          onClick={() => setView('requests')}
          className={[
            'min-h-[40px] rounded-xl px-4 text-sm font-medium transition-colors',
            view === 'requests' ? 'bg-brand-green text-white' : 'glass text-brand-ink/60',
          ].join(' ')}
        >
          Waiting for a shopper ({openRequests.length})
        </button>
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingState />
        ) : view === 'orders' ? (
          orders.length === 0 ? (
            <EmptyState
              title="Nothing on its way yet"
              description="Once a shopper accepts a request, the order appears here."
            />
          ) : (
            <div className="flex flex-col gap-3">
              {orders.map((o) => (
                <GlassCard
                  key={o.id}
                  hover
                  onClick={() => navigate(`/app/orders/${o.id}`)}
                  className="flex cursor-pointer items-center justify-between"
                >
                  <div>
                    <p className="font-medium text-brand-ink">Order #{o.id.slice(0, 8)}</p>
                    <p className="text-xs text-brand-ink/45">
                      {o.total_amount_ugx ? formatUgx(o.total_amount_ugx) : 'Price pending'} ·{' '}
                      {new Date(o.created_at).toLocaleDateString('en-UG')}
                    </p>
                  </div>
                  <StatusBadge status={o.status} />
                </GlassCard>
              ))}
            </div>
          )
        ) : requests.length === 0 ? (
          <EmptyState
            title="No requests yet"
            description="Tell us what you need and a nearby shopper will pick it up."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((r) => (
              <RequestCard key={r.id} request={r} onClick={() => navigate(`/app/requests/${r.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
