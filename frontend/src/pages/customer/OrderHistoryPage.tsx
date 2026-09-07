import { ReactNode, useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Package, PlusCircle } from 'lucide-react';
import { api } from '../../services/api';
import { Order, OrderStatus, ShoppingRequest } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
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
    <Card tone={yourTurn ? 'warning' : 'default'} onClick={onClick} className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-ink">Order #{order.id.slice(0, 8)}</p>
        <p className="mt-0.5 text-caption text-ink-3">
          {order.total_amount_ugx ? formatUgx(order.total_amount_ugx) : 'Price pending'} ·{' '}
          {new Date(order.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
        </p>
        {yourTurn && copy?.cta && (
          <p className="mt-1.5 flex items-center gap-1 text-caption font-semibold text-warning">
            Your turn: {copy.cta} <ArrowRight size={12} strokeWidth={2.5} />
          </p>
        )}
      </div>
      <StatusBadge status={order.status} />
    </Card>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-label font-semibold uppercase text-ink-3">{title}</p>
      {children}
    </section>
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

  const rows = (list: Order[]) => (
    <div className="flex flex-col gap-3">
      {list.map((o) => <OrderRow key={o.id} order={o} onClick={() => navigate(`/app/orders/${o.id}`)} />)}
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <PageHeader
        title="Your orders"
        subtitle="Everything in flight and everything past."
        actions={
          <Button size="sm" onClick={() => navigate('/app/requests/new')}>
            <PlusCircle size={16} strokeWidth={2} /> New request
          </Button>
        }
      />

      <Tabs<View>
        ariaLabel="Orders or requests"
        value={view}
        onChange={setView}
        items={[
          { value: 'orders', label: 'Orders', count: loading ? undefined : liveCount },
          { value: 'requests', label: 'Waiting for a shopper', count: loading ? undefined : openRequests.length },
        ]}
      />

      <div className="mt-5">
        {loading ? (
          <SkeletonRegion label="Loading your orders">
            {view === 'orders' ? <SkeletonRows count={4} /> : <SkeletonRequestGrid count={3} />}
          </SkeletonRegion>
        ) : view === 'orders' ? (
          orders.length === 0 ? (
            <EmptyState
              icon={<Package strokeWidth={1.5} />}
              title="Nothing on its way yet"
              description="Once you choose a shopper for a request, the order appears here."
              action={<Button size="sm" onClick={() => navigate('/app/requests/new')}>Make a request</Button>}
            />
          ) : (
            <div className="flex flex-col gap-6">
              {needsYou.length > 0 && <Section title="Needs you">{rows(needsYou)}</Section>}
              {inProgress.length > 0 && <Section title="In progress">{rows(inProgress)}</Section>}
              {past.length > 0 && <Section title="Past orders">{rows(past)}</Section>}
            </div>
          )
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<Package strokeWidth={1.5} />}
            title="No requests yet"
            description="Tell us what you need and a nearby shopper will pick it up."
            action={<Button size="sm" onClick={() => navigate('/app/requests/new')}>Make a request</Button>}
          />
        ) : (
          <div className="flex flex-col gap-6">
            {openRequests.length === 0 ? (
              <EmptyState
                size="sm"
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
            {pastRequests.length > 0 && (
              <Section title="Past requests">
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {pastRequests.map((r) => (
                    <RequestCard key={r.id} request={r} onClick={() => navigate(`/app/requests/${r.id}`)} />
                  ))}
                </div>
              </Section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
