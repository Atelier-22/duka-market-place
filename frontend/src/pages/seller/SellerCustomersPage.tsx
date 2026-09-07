import { useEffect, useState } from 'react';
import { Heart, Search, Users } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Avatar } from '../../components/ui/Avatar';
import { RatingStars } from '../../components/ui/RatingStars';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { formatUgx, timeAgo } from '../../market/format';

interface Row {
  id: string; full_name: string; avatar_url: string | null; orders: number; completed_orders: number;
  total_spent_ugx: number; last_order_at: string; first_order_at: string; follows: boolean; rating_given: number | null;
}

export function SellerCustomersPage() {
  usePageMeta({ title: 'Customers', noindex: true });
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState('');
  useEffect(() => { api.get('/seller/customers').then((r) => setRows(r.data.customers)).catch(() => setRows([])); }, []);

  if (!rows) return <SkeletonRegion label="Loading customers" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={5} /></div></SkeletonRegion>;
  const list = rows.filter((r) => !q.trim() || r.full_name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="pb-10">
      <PageHeader title="Customers" subtitle="People who have ordered from your store. Contact details appear on each order, not here." />
      <label className="relative block sm:max-w-sm"><span className="sr-only">Search customers</span><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:shadow-focus" /></label>
      <div className="mt-4">
        {list.length === 0 ? (
          <EmptyState icon={<Users />} title={rows.length === 0 ? 'No customers yet' : 'No one matches'} description={rows.length === 0 ? 'Your first order brings your first customer.' : undefined} />
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-line">
              {list.map((c) => (
                <li key={c.id} className="flex items-center gap-3 p-3 sm:p-4">
                  <Avatar name={c.full_name} src={c.avatar_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-medium text-ink"><span className="truncate">{c.full_name}</span>{c.follows && <Heart size={13} className="shrink-0 fill-brand-red text-brand-red" aria-label="Follows your store" />}</p>
                    <p className="text-caption text-ink-3">{c.orders} order{c.orders === 1 ? '' : 's'} · {c.completed_orders} delivered · last {timeAgo(c.last_order_at)}{c.rating_given ? <> · <RatingStars value={Number(c.rating_given)} /></> : null}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums text-ink">{formatUgx(c.total_spent_ugx)}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
