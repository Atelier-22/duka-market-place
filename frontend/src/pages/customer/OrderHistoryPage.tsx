import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { Order } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function OrdersListPage() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/orders/mine').then((res) => setOrders(res.data.orders)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Orders</h1>
      <div className="mt-6">
        {orders.length === 0 ? (
          <EmptyState title="No orders yet" />
        ) : (
          <div className="flex flex-col gap-3">
            {orders.map((o) => (
              <GlassCard key={o.id} onClick={() => navigate(`/app/orders/${o.id}`)} className="flex cursor-pointer items-center justify-between">
                <div>
                  <p className="font-medium text-brand-ink">Order #{o.id.slice(0, 8)}</p>
                  <p className="text-xs text-brand-ink/45">
                    {o.total_amount_ugx ? formatUgx(o.total_amount_ugx) : 'Price pending'} · {new Date(o.created_at).toLocaleDateString('en-UG')}
                  </p>
                </div>
                <StatusBadge status={o.status} />
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
