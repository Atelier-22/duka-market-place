import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, CreditCard, CheckCircle2, Package, PlusCircle, ShoppingCart, Users } from 'lucide-react';
import { api } from '../../services/api';
import { Order, OrderStatus, ShoppingRequest } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { RequestCard } from '../../components/domain/RequestCard';
import { ActionNeededBanner, isYourTurn } from '../../components/domain/ActionNeededBanner';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonHeading, SkeletonRegion, SkeletonRequestGrid, SkeletonStats } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

const FINISHED: OrderStatus[] = ['completed', 'cancelled', 'refunded'];

const CTA: Partial<Record<OrderStatus, string>> = {
  awaiting_customer_approval: 'Approve the purchase',
  out_for_delivery: 'Confirm delivery',
  delivered: 'Mark complete',
  disputed: 'See what happened',
};

export function CustomerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ShoppingRequest[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  function load() {
    setFailed(false);
    Promise.all([api.get('/requests/mine'), api.get('/orders/mine')])
      .then(([reqRes, orderRes]) => {
        setRequests(reqRes.data.requests);
        setOrders(orderRes.data.orders);
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  if (loading) {
    return (
      <SkeletonRegion label="Loading your dashboard" className="flex flex-col gap-6 pb-10">
        <SkeletonHeading />
        <SkeletonStats />
        <SkeletonRequestGrid count={3} />
      </SkeletonRegion>
    );
  }

  if (failed) {
    return (
      <EmptyState
        title="We couldn't load your dashboard"
        description="Check your connection and try again."
        action={<Button size="sm" onClick={() => { setLoading(true); load(); }}>Try again</Button>}
      />
    );
  }

  const live = orders.filter((o) => !FINISHED.includes(o.status));
  const activeOrder = live.find((o) => isYourTurn(o.status, 'customer')) ?? live[0];
  const withOffers = requests.filter((r) => r.status === 'offer_received');
  const totalSpent = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + (o.total_amount_ugx ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title={`Welcome back, ${user?.fullName.split(' ')[0] ?? ''}`}
        subtitle="Here's what's happening with your requests."
        actions={
          <Link to="/app/requests/new">
            <Button size="sm"><PlusCircle size={16} strokeWidth={2} /> Request something</Button>
          </Link>
        }
        className="mb-0"
      />

      {(withOffers.length > 0 || activeOrder) && (
        <div className="-mt-2 flex flex-col">
          {withOffers.length > 0 && (
            <Link
              to={`/app/requests/${withOffers[0].id}`}
              className="mt-4 flex w-full items-center gap-3 rounded-2xl border border-brand-yellow/60 bg-warning-soft/40 px-4 py-3 shadow-card transition-[border-color,transform,box-shadow] duration-150 hover:border-line-strong hover:shadow-raised active:scale-[0.99]"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow text-brand-ink">
                <Users size={17} strokeWidth={2.25} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-label font-semibold uppercase text-warning">Your turn</span>
                <span className="block text-sm font-medium text-ink">
                  {withOffers.length === 1
                    ? `Offers are in for "${withOffers[0].title}"`
                    : `${withOffers.length} requests have offers waiting`}
                </span>
                <span className="mt-0.5 block text-caption text-ink-3">Pick a shopper to get going.</span>
              </span>
              <span className="flex shrink-0 items-center gap-1 rounded-lg bg-brand-green px-3 py-2 text-caption font-semibold text-white">
                Choose <ArrowRight size={13} strokeWidth={2.5} />
              </span>
            </Link>
          )}
          {activeOrder && (
            <ActionNeededBanner status={activeOrder.status} perspective="customer" to={`/app/orders/${activeOrder.id}`} />
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <DashboardStat label="Active requests" value={String(requests.filter((r) => r.status === 'open' || r.status === 'offer_received').length)} icon={<ClipboardList />} />
        <DashboardStat label="Orders in flight" value={String(live.length)} icon={<Package />} />
        <DashboardStat label="Total spent" value={formatUgx(totalSpent)} icon={<CreditCard />} accent="yellow" />
        <DashboardStat label="Completed" value={String(orders.filter((o) => o.status === 'completed').length)} icon={<CheckCircle2 />} />
      </div>

      {activeOrder && (
        <Card tone={isYourTurn(activeOrder.status, 'customer') ? 'warning' : 'success'} padding="lg">
          <div className="flex items-center justify-between gap-3">
            <p className="text-label font-semibold uppercase text-ink-3">
              {live.length > 1 ? `Active order · ${live.length} in flight` : 'Active order'}
            </p>
            <StatusBadge status={activeOrder.status} />
          </div>
          <p className="mt-2 font-display text-h3 font-medium text-brand-green-deep">
            Order #{activeOrder.id.slice(0, 8)}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <Link to={`/app/orders/${activeOrder.id}`}>
              <Button size="sm">
                {CTA[activeOrder.status] ?? 'Track this order'} <ArrowRight size={15} strokeWidth={2} />
              </Button>
            </Link>
            {live.length > 1 && (
              <Link to="/app/orders" className="text-sm font-medium text-brand-green hover:underline">See all orders</Link>
            )}
          </div>
        </Card>
      )}

      <section>
        <SectionHeader
          title="Recent requests"
          action={<Link to="/app/orders?view=requests" className="text-sm font-medium text-brand-green hover:underline">View all</Link>}
        />
        {requests.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart strokeWidth={1.5} />}
            title="No requests yet"
            description="Tell us what you need and a nearby shopper will get it for you."
            action={<Link to="/app/requests/new"><Button size="sm">Create your first request</Button></Link>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.slice(0, 6).map((r) => (
              <RequestCard key={r.id} request={r} onClick={() => navigate(`/app/requests/${r.id}`)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
