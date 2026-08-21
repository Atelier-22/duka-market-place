import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ClipboardList, CreditCard, CheckCircle2, Package, PlusCircle, ShoppingCart } from 'lucide-react';
import { api } from '../../services/api';
import { Order, ShoppingRequest } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { RequestCard } from '../../components/domain/RequestCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function CustomerDashboardPage() {
  const { user } = useAuth();
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

  if (loading) return <LoadingState label="Loading your dashboard…" />;

  const activeOrder = orders.find((o) => !['completed', 'cancelled', 'refunded'].includes(o.status));
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
          <GlassButton><PlusCircle size={17} strokeWidth={2} /> Request something</GlassButton>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Active requests" value={String(requests.filter((r) => r.status !== 'cancelled').length)} icon={<ClipboardList size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Total orders" value={String(orders.length)} icon={<Package size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Total spent" value={formatUgx(totalSpent)} icon={<CreditCard size={18} strokeWidth={1.75} />} accent="yellow" />
        <DashboardStat label="Completed" value={String(orders.filter((o) => o.status === 'completed').length)} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} />
      </div>

      {activeOrder && (
        <GlassCard glow="green" padding="lg">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Active order</p>
            <StatusBadge status={activeOrder.status} />
          </div>
          <p className="mt-2 font-display text-lg font-medium text-brand-green-deep">
            Order #{activeOrder.id.slice(0, 8)}
          </p>
          <Link to={`/app/orders/${activeOrder.id}`} className="mt-4 inline-block">
            <GlassButton size="sm">Track this order <ArrowRight size={15} strokeWidth={2} /></GlassButton>
          </Link>
        </GlassCard>
      )}

      <div>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-medium text-brand-green-deep">Recent requests</h2>
          <Link to="/app/requests" className="text-sm font-semibold text-brand-green-fresh">View all</Link>
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
            {requests.slice(0, 6).map((r) => <RequestCard key={r.id} request={r} />)}
          </div>
        )}
      </div>
    </div>
  );
}
