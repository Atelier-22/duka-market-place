import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Boxes } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Tabs } from '../../components/ui/Tabs';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { SellerOrder } from '../../market/types';
import { formatUgx, timeAgo } from '../../market/format';

type Filter = 'open' | 'pending' | 'completed' | 'cancelled' | 'all';

export function SellerOrdersPage() {
  usePageMeta({ title: 'Orders', noindex: true });
  const [params, setParams] = useSearchParams();
  const filter = (params.get('status') as Filter) || 'open';
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);

  const load = useCallback(() => {
    api.get(`/seller/orders?status=${filter}`).then((r) => setOrders(r.data.orders)).catch(() => setOrders([]));
  }, [filter]);
  useEffect(load, [load]);
  useEffect(() => {
    if (filter !== 'open' && filter !== 'pending') return;
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, [filter, load]);

  return (
    <div className="pb-10">
      <PageHeader title="Orders" subtitle="Confirm, prepare, and mark delivered. Customers pay you on delivery." />
      <Tabs
        ariaLabel="Order filter"
        value={filter}
        onChange={(v) => setParams(v === 'open' ? {} : { status: v })}
        items={[{ value: 'open', label: 'Open' }, { value: 'pending', label: 'Needs confirming' }, { value: 'completed', label: 'Delivered' }, { value: 'cancelled', label: 'Cancelled' }, { value: 'all', label: 'All' }]}
      />
      <div className="mt-4">
        {!orders ? (
          <SkeletonRegion label="Loading orders"><SkeletonHeading subtitle={false} /><div className="mt-4"><SkeletonRows count={4} /></div></SkeletonRegion>
        ) : orders.length === 0 ? (
          <EmptyState icon={<Boxes />} title={filter === 'open' ? 'No open orders' : 'No orders here'} description={filter === 'open' ? 'New orders show up here the moment a customer buys. Keep your products published and in stock.' : undefined} />
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-line">
              {orders.map((o) => (
                <li key={o.id}>
                  <Link to={`/seller/orders/${o.id}`} className="flex items-center gap-3 p-3 hover:bg-surface-2 sm:p-4">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-ink"><span>#{o.order_number}</span><span className="truncate text-ink-2">{o.customer_name}</span></p>
                      <p className="mt-0.5 truncate text-caption text-ink-3">{o.summary} · {o.item_count} item{o.item_count === 1 ? '' : 's'} · {timeAgo(o.created_at)}</p>
                    </div>
                    <span className="text-sm font-semibold tabular-nums text-ink">{formatUgx(o.total_ugx)}</span>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
