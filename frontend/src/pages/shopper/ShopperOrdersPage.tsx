import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { Order, OrderStatus } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { actionFor, isYourTurn } from '../../components/domain/ActionNeededBanner';
import { SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

const FINISHED: OrderStatus[] = ['completed', 'cancelled', 'refunded'];

function JobRow({ order, onClick }: { order: Order; onClick: () => void }) {
  const yourTurn = isYourTurn(order.status, 'shopper');
  const copy = actionFor(order.status, 'shopper');
  return (
    <GlassCard
      hover
      glow={yourTurn ? 'yellow' : 'none'}
      onClick={onClick}
      className="flex cursor-pointer items-center justify-between gap-3"
    >
      <div className="min-w-0">
        <p className="font-medium text-brand-ink">Job #{order.id.slice(0, 8)}</p>
        <p className="text-xs text-brand-ink/45">
          Fee: {formatUgx(Number(order.shopping_fee_ugx) + Number(order.delivery_fee_ugx))} · {new Date(order.created_at).toLocaleDateString('en-UG')}
        </p>
        {yourTurn && copy?.cta && (
          <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-yellow-800">
            Your turn: {copy.cta} <ArrowRight size={12} strokeWidth={2.5} />
          </p>
        )}
        {!yourTurn && copy?.tone === 'wait' && (
          <p className="mt-1 text-xs text-brand-ink/50">{copy.title}</p>
        )}
      </div>
      <StatusBadge status={order.status} />
    </GlassCard>
  );
}

export function ShopperOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/mine').then((res) => setOrders(res.data.orders)).finally(() => setLoading(false));
  }, []);

  const needsYou = orders.filter((o) => isYourTurn(o.status, 'shopper'));
  const waiting = orders.filter((o) => !FINISHED.includes(o.status) && !isYourTurn(o.status, 'shopper'));
  const past = orders.filter((o) => FINISHED.includes(o.status));

  const section = (title: string, list: Order[]) => list.length > 0 && (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">{title}</p>
      <div className="flex flex-col gap-3">
        {list.map((o) => <JobRow key={o.id} order={o} onClick={() => navigate(`/shopper/orders/${o.id}`)} />)}
      </div>
    </div>
  );

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">My jobs</h1>
      {!loading && needsYou.length > 0 && (
        <p className="mt-1 text-sm text-brand-ink/50">
          {needsYou.length === 1 ? 'One job is waiting on you.' : `${needsYou.length} jobs are waiting on you.`}
        </p>
      )}
      <div className="mt-6">
        {loading ? (
          <SkeletonRegion label="Loading your jobs"><SkeletonRows count={4} /></SkeletonRegion>
        ) : orders.length === 0 ? (
          <EmptyState title="No jobs yet" description="Browse available requests to accept your first job." />
        ) : (
          <div className="flex flex-col gap-6">
            {section('Your turn', needsYou)}
            {section('Waiting on the customer', waiting)}
            {section('Past jobs', past)}
          </div>
        )}
      </div>
    </div>
  );
}
