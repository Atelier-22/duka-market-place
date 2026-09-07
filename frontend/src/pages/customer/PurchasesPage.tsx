import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShoppingBag, Store as StoreIcon } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Tabs } from '../../components/ui/Tabs';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { SellerOrder } from '../../market/types';
import { formatUgx, timeAgo } from '../../market/format';

const OPEN = ['pending', 'confirmed', 'preparing', 'ready'];

export function PurchasesPage() {
  usePageMeta({ title: 'My purchases', noindex: true });
  const [orders, setOrders] = useState<SellerOrder[] | null>(null);
  const [tab, setTab] = useState<'active' | 'past'>('active');

  useEffect(() => {
    api.get('/marketplace/orders/mine').then((r) => setOrders(r.data.orders)).catch(() => setOrders([]));
  }, []);

  if (!orders) {
    return <SkeletonRegion label="Loading purchases" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={4} /></div></SkeletonRegion>;
  }

  const active = orders.filter((o) => OPEN.includes(o.status));
  const past = orders.filter((o) => !OPEN.includes(o.status));
  const list = tab === 'active' ? active : past;

  return (
    <div className="pb-10">
      <PageHeader title="Purchases" subtitle="Things you bought from stores on the marketplace." actions={<Link to="/marketplace"><Button size="sm" variant="secondary">Marketplace</Button></Link>} />
      <Tabs ariaLabel="Purchase status" value={tab} onChange={setTab} items={[{ value: 'active', label: 'On the way', count: active.length }, { value: 'past', label: 'Past', count: past.length }]} />
      <div className="mt-4">
        {orders.length === 0 ? (
          <EmptyState icon={<ShoppingBag />} title="No purchases yet" description="Browse the marketplace and buy from stores near you. Pay on delivery." action={<Link to="/marketplace"><Button size="sm">Browse the marketplace</Button></Link>} />
        ) : list.length === 0 ? (
          <EmptyState icon={<ShoppingBag />} title={tab === 'active' ? 'Nothing on the way' : 'No past purchases'} size="sm" />
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((o) => (
              <Link key={o.id} to={`/app/purchases/${o.id}`} className="block">
                <Card padding="md" hover>
                  <div className="flex gap-3">
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-surface-2 text-ink-3">
                      {o.image_url ? <img src={o.image_url} alt="" className="h-full w-full object-cover" /> : <StoreIcon size={20} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate font-medium text-ink">{o.summary}</p>
                        <StatusBadge status={o.status} />
                      </div>
                      <p className="mt-0.5 truncate text-caption text-ink-3">{o.store_name} · #{o.order_number} · {timeAgo(o.created_at)}</p>
                      <p className="mt-1 text-sm font-semibold text-brand-green-deep">{formatUgx(o.total_ugx)}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
