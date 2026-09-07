import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import { api } from '../../services/api';
import { Order, OrderStatus } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
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
    <Card tone={yourTurn ? 'warning' : 'default'} onClick={onClick} className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="font-medium text-ink">Job #{order.id.slice(0, 8)}</p>
        <p className="mt-0.5 text-caption text-ink-3">
          Fee {formatUgx(Number(order.shopping_fee_ugx) + Number(order.delivery_fee_ugx))} ·{' '}
          {new Date(order.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
        </p>
        {yourTurn && copy?.cta && (
          <p className="mt-1.5 flex items-center gap-1 text-caption font-semibold text-warning">
            Your turn: {copy.cta} <ArrowRight size={12} strokeWidth={2.5} />
          </p>
        )}
        {!yourTurn && copy?.tone === 'wait' && (
          <p className="mt-1 text-caption text-ink-3">{copy.title}</p>
        )}
      </div>
      <StatusBadge status={order.status} />
    </Card>
  );
}

export function ShopperOrdersPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  function load() {
    setFailed(false);
    api.get('/orders/mine')
      .then((res) => setOrders(res.data.orders))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  const needsYou = orders.filter((o) => isYourTurn(o.status, 'shopper'));
  const waiting = orders.filter((o) => !FINISHED.includes(o.status) && !isYourTurn(o.status, 'shopper'));
  const past = orders.filter((o) => FINISHED.includes(o.status));

  const section = (title: string, list: Order[]) => list.length > 0 && (
    <section>
      <p className="mb-2 text-label font-semibold uppercase text-ink-3">{title}</p>
      <div className="flex flex-col gap-3">
        {list.map((o) => <JobRow key={o.id} order={o} onClick={() => navigate(`/shopper/orders/${o.id}`)} />)}
      </div>
    </section>
  );

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <PageHeader
        title="My jobs"
        subtitle={
          !loading && needsYou.length > 0
            ? needsYou.length === 1 ? 'One job is waiting on you.' : `${needsYou.length} jobs are waiting on you.`
            : 'Every job you have taken, newest first.'
        }
        actions={<Button size="sm" variant="secondary" onClick={() => navigate('/shopper/available')}>Find a job</Button>}
      />
      {loading ? (
        <SkeletonRegion label="Loading your jobs"><SkeletonRows count={4} /></SkeletonRegion>
      ) : failed ? (
        <EmptyState
          title="We couldn't load your jobs"
          description="Check your connection and try again."
          action={<Button size="sm" onClick={() => { setLoading(true); load(); }}>Try again</Button>}
        />
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag strokeWidth={1.5} />}
          title="No jobs yet"
          description="Browse open requests near you and send an offer to take your first job."
          action={<Button size="sm" onClick={() => navigate('/shopper/available')}>Browse requests</Button>}
        />
      ) : (
        <div className="flex flex-col gap-6">
          {section('Your turn', needsYou)}
          {section('Waiting on the customer', waiting)}
          {section('Past jobs', past)}
        </div>
      )}
    </div>
  );
}
