import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChartLine, Coins, Eye, Heart, ShoppingBag, Star, Users } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Tabs } from '../../components/ui/Tabs';
import { Input } from '../../components/ui/Input';
import { EmptyState } from '../../components/ui/EmptyState';
import { BarChart, HorizontalBars } from '../../components/ui/MiniChart';
import { SkeletonHeading, SkeletonRegion, SkeletonRows, SkeletonStats } from '../../components/ui/Skeleton';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { categoryLabel, compactUgx, formatUgx } from '../../market/format';

type Range = 'today' | '7d' | '30d' | '90d' | '12m' | 'custom';

function pct(now: number, before: number): string | undefined {
  if (before === 0) return now > 0 ? 'new' : undefined;
  const d = Math.round(((now - before) / before) * 100);
  return `${d >= 0 ? '+' : ''}${d}% vs previous`;
}

export function SellerAnalyticsPage() {
  usePageMeta({ title: 'Analytics', noindex: true });
  const [range, setRange] = useState<Range>('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [data, setData] = useState<any | null | undefined>(undefined);

  const load = useCallback(() => {
    const p = new URLSearchParams({ range });
    if (range === 'custom') { if (from) p.set('from', from); if (to) p.set('to', to); }
    api.get(`/seller/analytics?${p.toString()}`).then((r) => setData(r.data)).catch(() => setData(null));
  }, [range, from, to]);
  useEffect(load, [load]);

  if (data === undefined) return <SkeletonRegion label="Loading analytics" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonStats /></div><div className="mt-6"><SkeletonRows count={3} /></div></SkeletonRegion>;
  if (data === null) return <div className="pb-10"><PageHeader title="Analytics" /><EmptyState icon={<ChartLine />} title="Create your store first" action={<Link to="/seller" className="text-sm font-medium text-brand-green">Go to the dashboard</Link>} /></div>;

  const t = data.totals;
  const series = data.series.map((s: any) => ({
    label: data.range.bucket === 'month' ? new Date(s.bucket).toLocaleDateString('en-UG', { month: 'short' }) : new Date(s.bucket).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }),
    value: s.revenueUgx,
    secondary: s.orders,
  }));
  const orderSeries = series.map((s: any) => ({ label: s.label, value: s.secondary }));

  return (
    <div className="pb-10">
      <PageHeader title="Analytics" subtitle="Everything here comes from your real orders, views and followers." />
      <Tabs ariaLabel="Time range" value={range} onChange={setRange} items={[{ value: 'today', label: 'Today' }, { value: '7d', label: '7 days' }, { value: '30d', label: '30 days' }, { value: '90d', label: '3 months' }, { value: '12m', label: '12 months' }, { value: 'custom', label: 'Custom' }]} />
      {range === 'custom' && (
        <div className="mt-3 grid grid-cols-2 gap-3 sm:max-w-md"><Input label="From" type="date" value={from} onChange={(e) => setFrom(e.target.value)} /><Input label="To" type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
      )}

      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardStat label="Revenue (delivered)" value={compactUgx(t.revenueUgx)} icon={<Coins />} accent="yellow" trend={pct(t.revenueUgx, data.previous.revenueUgx)} />
        <DashboardStat label="Orders" value={String(t.orders)} icon={<ShoppingBag />} trend={pct(t.orders, data.previous.orders)} />
        <DashboardStat label="Avg. order" value={compactUgx(t.avgOrderUgx)} icon={<Coins />} />
        <DashboardStat label="Customers" value={String(t.customers)} icon={<Users />} />
        <DashboardStat label="Product views" value={String(t.views)} icon={<Eye />} trend={t.conversionPercent !== null ? `${t.conversionPercent}% became orders` : undefined} />
        <DashboardStat label="Followers gained" value={`+${t.followersGained}`} icon={<Heart />} trend={`${t.followersTotal} total`} />
        <DashboardStat label="Reviews" value={String(t.reviewsReceived)} icon={<Star />} trend={t.ratingCount ? `${t.ratingAll.toFixed(1)} overall` : undefined} />
        <DashboardStat label="Cancelled" value={String(t.cancelled)} icon={<ShoppingBag />} accent={t.cancelled ? 'red' : 'green'} />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card padding="lg"><SectionHeader title="Revenue" /><BarChart points={series} format={formatUgx} ariaLabel="Revenue over time" /></Card>
        <Card padding="lg"><SectionHeader title="Orders" /><BarChart points={orderSeries} ariaLabel="Orders over time" /></Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card padding="lg">
          <SectionHeader title="Top products" />
          <HorizontalBars rows={data.topProducts.map((p: any) => ({ label: p.name, value: Number(p.units), hint: formatUgx(p.revenue_ugx) }))} format={(v) => `${v} sold`} />
        </Card>
        <Card padding="lg">
          <SectionHeader title="Slow movers" />
          {data.slowProducts.length === 0 ? <p className="text-small text-ink-3">Publish products to see which ones need attention.</p> : (
            <ul className="flex flex-col gap-2">
              {data.slowProducts.map((p: any) => (
                <li key={p.id} className="flex items-center justify-between gap-3 text-sm"><Link to={`/seller/products/${p.id}/edit`} className="min-w-0 truncate text-ink hover:text-brand-green">{p.name}</Link><span className="shrink-0 text-caption text-ink-3">{p.units} sold · {p.view_count} views · {p.available} in stock</span></li>
              ))}
            </ul>
          )}
        </Card>
        <Card padding="lg">
          <SectionHeader title="Categories" />
          <HorizontalBars rows={data.categories.map((c: any) => ({ label: categoryLabel(c.category), value: Number(c.revenue_ugx), hint: `${c.units} units · ${c.orders} orders` }))} format={compactUgx} />
        </Card>
      </div>
    </div>
  );
}
