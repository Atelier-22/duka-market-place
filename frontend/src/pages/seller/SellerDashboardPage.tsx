import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle, ArrowRight, BadgeCheck, Boxes, ChartLine, Coins, ExternalLink, Heart, Package, PackagePlus, Star, Users,
} from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RatingStars } from '../../components/ui/RatingStars';
import { BarChart } from '../../components/ui/MiniChart';
import { SkeletonHeading, SkeletonRegion, SkeletonRows, SkeletonStats } from '../../components/ui/Skeleton';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { SellerOnboardingPage } from './SellerOnboardingPage';
import { SellerProfile, SellerStore } from '../../market/types';
import { compactUgx, formatUgx, timeAgo } from '../../market/format';

interface Dashboard {
  store: SellerStore | null;
  profile: SellerProfile;
  stock?: { products: number; published: number; drafts: number; inventory_value_ugx: number; low_stock: number; out_of_stock: number };
  orders?: { total: number; pending: number; in_progress: number; completed: number; revenue_ugx: number; revenue_today_ugx: number; orders_today: number; customers: number };
  followers?: { total: number; week: number };
  recentOrders?: any[];
  recentReviews?: any[];
  lowStock?: any[];
  sales14?: { day: string; orders: number; revenue_ugx: number }[];
  topProducts?: any[];
}

export function SellerDashboardPage() {
  usePageMeta({ title: 'Seller dashboard', noindex: true });
  const [data, setData] = useState<Dashboard | null>(null);
  const load = useCallback(() => { api.get('/seller/dashboard').then((r) => setData(r.data)).catch(() => undefined); }, []);
  useEffect(load, [load]);

  if (!data) {
    return <SkeletonRegion label="Loading dashboard" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonStats /></div><div className="mt-6"><SkeletonRows count={3} /></div></SkeletonRegion>;
  }

  if (!data.store) return <SellerOnboardingPage onCreated={load} />;

  const { store, profile, stock, orders, followers } = data;
  const series = (data.sales14 ?? []).map((d) => ({ label: new Date(d.day).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }), value: Number(d.revenue_ugx), secondary: Number(d.orders) }));
  const hasSales = series.some((s) => s.value > 0);
  const needsAttention = (orders?.pending ?? 0) > 0 || (stock?.low_stock ?? 0) > 0 || profile.is_suspended;

  return (
    <div className="pb-10">
      <PageHeader
        eyebrow="Seller dashboard"
        title={store.name}
        subtitle={profile.is_suspended ? 'Your store is suspended.' : `${stock?.published ?? 0} published product${stock?.published === 1 ? '' : 's'} · ${followers?.total ?? 0} follower${followers?.total === 1 ? '' : 's'}`}
        actions={(
          <div className="flex gap-2">
            <Link to={`/store/${store.slug}`} target="_blank" rel="noreferrer"><Button variant="secondary" size="sm"><ExternalLink size={15} /> View store</Button></Link>
            <Link to="/seller/products/new"><Button size="sm"><PackagePlus size={15} /> Add product</Button></Link>
          </div>
        )}
      />

      {profile.is_suspended && (
        <Card tone="danger" padding="md" className="mb-4">
          <p className="flex items-center gap-2 text-sm font-medium text-brand-red"><AlertTriangle size={16} /> Suspended{profile.suspended_reason ? `: ${profile.suspended_reason}` : ''}. Your products are hidden and you cannot make changes. Contact Duka support.</p>
        </Card>
      )}

      {profile.verification_status !== 'verified' && !profile.is_suspended && (
        <Link to="/seller/settings/verification" className="mb-4 block rounded-2xl focus-visible:outline-none focus-visible:shadow-focus">
          <Card tone="warning" padding="md" hover>
            <p className="flex items-center gap-2 text-sm font-medium text-brand-green-deep">
              <BadgeCheck size={16} className="text-warning" />
              {profile.verification_status === 'pending' ? 'Verification submitted. Duka is reviewing your details.' : profile.verification_status === 'rejected' ? 'Verification was not approved. See why and resubmit.' : 'Get the verified badge: submit your business details.'}
            </p>
          </Card>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardStat label="Sales (completed)" value={compactUgx(orders?.revenue_ugx ?? 0)} icon={<Coins />} accent="yellow" trend={orders?.revenue_today_ugx ? `${compactUgx(orders.revenue_today_ugx)} today` : undefined} />
        <DashboardStat label="Orders" value={String(orders?.total ?? 0)} icon={<Boxes />} trend={orders?.pending ? `${orders.pending} waiting` : orders?.orders_today ? `${orders.orders_today} today` : undefined} accent={orders?.pending ? 'red' : 'green'} />
        <DashboardStat label="Products" value={String(stock?.published ?? 0)} icon={<Package />} trend={stock?.drafts ? `${stock.drafts} draft${stock.drafts === 1 ? '' : 's'}` : undefined} />
        <DashboardStat label="Inventory value" value={compactUgx(stock?.inventory_value_ugx ?? 0)} icon={<PackagePlus />} />
        <DashboardStat label="Low stock" value={String(stock?.low_stock ?? 0)} icon={<AlertTriangle />} accent={stock?.low_stock ? 'red' : 'green'} trend={stock?.out_of_stock ? `${stock.out_of_stock} out` : undefined} />
        <DashboardStat label="Customers" value={String(orders?.customers ?? 0)} icon={<Users />} />
        <DashboardStat label="Followers" value={String(followers?.total ?? 0)} icon={<Heart />} trend={followers?.week ? `+${followers.week} this week` : undefined} />
        <DashboardStat label="Store rating" value={store.rating_count ? Number(store.rating_avg).toFixed(1) : '—'} icon={<Star />} trend={store.rating_count ? `${store.rating_count} review${store.rating_count === 1 ? '' : 's'}` : 'No reviews yet'} />
      </div>

      {needsAttention && !profile.is_suspended && (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {(orders?.pending ?? 0) > 0 && (
            <Link to="/seller/orders?status=pending" className="block rounded-2xl focus-visible:outline-none focus-visible:shadow-focus">
              <Card tone="warning" padding="md" hover><p className="flex items-center justify-between gap-2 text-sm font-medium text-brand-green-deep"><span><Boxes size={16} className="mr-2 inline text-warning" />{orders!.pending} order{orders!.pending === 1 ? '' : 's'} waiting for you to confirm</span><ArrowRight size={16} /></p></Card>
            </Link>
          )}
          {(stock?.low_stock ?? 0) > 0 && (
            <Link to="/seller/inventory?low=1" className="block rounded-2xl focus-visible:outline-none focus-visible:shadow-focus">
              <Card tone="warning" padding="md" hover><p className="flex items-center justify-between gap-2 text-sm font-medium text-brand-green-deep"><span><AlertTriangle size={16} className="mr-2 inline text-warning" />{stock!.low_stock} product{stock!.low_stock === 1 ? '' : 's'} running low</span><ArrowRight size={16} /></p></Card>
            </Link>
          )}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <SectionHeader title="Sales, last 14 days" action={<Link to="/seller/analytics" className="flex items-center gap-1 text-sm font-medium text-brand-green"><ChartLine size={14} /> Analytics</Link>} />
          {hasSales ? <BarChart points={series} format={formatUgx} ariaLabel="Completed sales per day for the last fourteen days" /> : (
            <EmptyState size="sm" title="No sales data yet" description="Completed orders will draw the chart. Publish products to get your first order." />
          )}
        </Card>
        <Card padding="lg">
          <SectionHeader title="Top products" />
          {(data.topProducts ?? []).filter((p) => Number(p.sales_count) > 0).length === 0 ? (
            <p className="text-small text-ink-3">Nothing sold yet.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {data.topProducts!.filter((p) => Number(p.sales_count) > 0).map((p) => (
                <li key={p.id}>
                  <Link to={`/seller/products/${p.id}/edit`} className="flex items-center gap-3">
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm text-ink">{p.name}</span><span className="block text-caption text-ink-3">{p.sales_count} sold · {p.view_count} views</span></span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card padding="lg" className="lg:col-span-2">
          <SectionHeader title="Recent orders" action={<Link to="/seller/orders" className="text-sm font-medium text-brand-green">All orders</Link>} />
          {(data.recentOrders ?? []).length === 0 ? <p className="text-small text-ink-3">No orders yet. They appear here the moment a customer buys.</p> : (
            <ul className="divide-y divide-line">
              {data.recentOrders!.map((o) => (
                <li key={o.id}>
                  <Link to={`/seller/orders/${o.id}`} className="flex items-center gap-3 py-2.5">
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">#{o.order_number} · {o.customer_name}</span><span className="block truncate text-caption text-ink-3">{o.summary} · {timeAgo(o.created_at)}</span></span>
                    <span className="text-sm font-semibold tabular-nums text-ink">{formatUgx(o.total_ugx)}</span>
                    <StatusBadge status={o.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card padding="lg">
          <SectionHeader title="Recent reviews" action={<Link to="/seller/reviews" className="text-sm font-medium text-brand-green">All</Link>} />
          {(data.recentReviews ?? []).length === 0 ? <p className="text-small text-ink-3">No reviews yet. Buyers can review after delivery.</p> : (
            <ul className="flex flex-col gap-3">
              {data.recentReviews!.map((r) => (
                <li key={r.id}><RatingStars value={r.stars} /><p className="mt-0.5 line-clamp-2 text-sm text-ink-2">{r.comment || 'No comment'}</p><p className="text-caption text-ink-3">{r.author_name} · {timeAgo(r.created_at)}</p></li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
