import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, ClipboardList, CreditCard, CheckCircle2, Package, PlusCircle, ShoppingCart, Users } from 'lucide-react';
import { api } from '../../services/api';
import { Order, OrderStatus, ShoppingRequest } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
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

/** What the big button on the active-order card should say, by status. */
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

  useEffect(() => {
    Promise.all([api.get('/requests/mine'), api.get('/orders/mine')])
      .then(([reqRes, orderRes]) => {
        setRequests(reqRes.data.requests);
        setOrders(orderRes.data.orders);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <SkeletonRegion label="Loading your dashboard" className="flex flex-col gap-6 pb-10">
        <SkeletonHeading />
        <SkeletonStats />
        <SkeletonRequestGrid count={3} />
      </SkeletonRegion>
    );
  }

  // The order that needs the customer comes first; otherwise the newest live one.
  const live = orders.filter((o) => !FINISHED.includes(o.status));
  const activeOrder = live.find((o) => isYourTurn(o.status, 'customer')) ?? live[0];
  const withOffers = requests.filter((r) => r.status === 'offer_received');
  const totalSpent = orders
    .filter((o) => o.status === 'completed')
    .reduce((sum, o) => sum + (o.total_amount_ugx ?? 0), 0);

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-brand-green-deep">
            Welcome back, {user?.fullName.split(' ')[0]}
          </h1>
          <p className="text-sm text-brand-ink/50">Here's what's happening with your requests.</p>
        </div>
        <Link to="/app/requests/new">
          <GlassButton size="sm"><PlusCircle size={16} strokeWidth={2} /> Request something</GlassButton>
        </Link>
      </div>

      {/* Anything that needs the customer, right at the top. */}
      {withOffers.length > 0 && (
        <Link
          to={`/app/requests/${withOffers[0].id}`}
          className="glass -mb-2 flex items-center gap-3 rounded-xl2 border-l-4 border-l-brand-yellow px-4 py-3 transition-[background-color,transform] hover:bg-brand-yellow-soft/30 active:scale-[0.99]"
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-yellow-soft text-yellow-800">
            <Users size={17} strokeWidth={2.25} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold uppercase tracking-wide text-yellow-800">Your turn</span>
            <span className="block text-sm font-medium text-brand-ink">
              {withOffers.length === 1
                ? `Offers are in for "${withOffers[0].title}"`
                : `${withOffers.length} requests have offers waiting`}
            </span>
            <span className="mt-0.5 block text-xs text-brand-ink/50">Pick a shopper to get going.</span>
          </span>
          <span className="flex shrink-0 items-center gap-1 rounded-full bg-brand-green px-3 py-1.5 text-xs font-semibold text-white">
            Choose <ArrowRight size={13} strokeWidth={2.5} />
          </span>
        </Link>
      )}

      {activeOrder && (
        <ActionNeededBanner
          status={activeOrder.status}
          perspective="customer"
          to={`/app/orders/${activeOrder.id}`}
          className="-mb-2 mt-0"
        />
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Active requests" value={String(requests.filter((r) => r.status === 'open' || r.status === 'offer_received').length)} icon={<ClipboardList size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Orders in flight" value={String(live.length)} icon={<Package size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Total spent" value={formatUgx(totalSpent)} icon={<CreditCard size={18} strokeWidth={1.75} />} accent="yellow" />
        <DashboardStat label="Completed" value={String(orders.filter((o) => o.status === 'completed').length)} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} />
      </div>

      {activeOrder && (
        <GlassCard glow={isYourTurn(activeOrder.status, 'customer') ? 'yellow' : 'green'} padding="lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
              {live.length > 1 ? `Active order · ${live.length} in flight` : 'Active order'}
            </p>
            <StatusBadge status={activeOrder.status} />
          </div>
          <p className="mt-2 font-display text-lg font-medium text-brand-green-deep">
            Order #{activeOrder.id.slice(0, 8)}
          </p>
          <Link to={`/app/orders/${activeOrder.id}`} className="mt-4 inline-block">
            <GlassButton size="sm">
              {CTA[activeOrder.status] ?? 'Track this order'} <ArrowRight size={15} strokeWidth={2} />
            </GlassButton>
          </Link>
          {live.length > 1 && (
            <Link to="/app/orders" className="ml-3 text-sm font-semibold text-brand-green-fresh">See all</Link>
          )}
        </GlassCard>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-brand-green-deep">Recent requests</h2>
          <Link to="/app/orders?view=requests" className="text-sm font-semibold text-brand-green-fresh">View all</Link>
        </div>
        {requests.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={40} strokeWidth={1.25} />}
            title="No requests yet"
            description="Tell us what you need and a nearby shopper will get it for you."
            action={<Link to="/app/requests/new"><GlassButton size="sm">Create your first request</GlassButton></Link>}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.slice(0, 6).map((r) => (
              <RequestCard key={r.id} request={r} onClick={() => navigate(`/app/requests/${r.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
