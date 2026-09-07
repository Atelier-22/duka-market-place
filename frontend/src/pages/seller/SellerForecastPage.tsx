import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BarChart3, TrendingDown, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { BarChart } from '../../components/ui/MiniChart';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function SellerForecastPage() {
  usePageMeta({ title: 'Forecasting', noindex: true });
  const [data, setData] = useState<any | null | undefined>(undefined);
  useEffect(() => { api.get('/seller/forecast').then((r) => setData(r.data)).catch(() => setData(null)); }, []);

  if (data === undefined) return <SkeletonRegion label="Loading forecast" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={4} /></div></SkeletonRegion>;
  if (data === null) return <div className="pb-10"><PageHeader title="Forecasting" /><EmptyState icon={<BarChart3 />} title="Create your store first" /></div>;

  const sold = data.products.filter((p: any) => p.unitsLast30 > 0);
  const weekday = DAYS.map((d, i) => ({ label: d, value: Number(data.weekdayPattern.find((w: any) => Number(w.dow) === i + 1)?.orders ?? 0) }));

  return (
    <div className="pb-10">
      <PageHeader title="Forecasting" subtitle="Projections from your own sales. No guesswork beyond the arithmetic shown." />
      <Card padding="md" className="mb-4"><p className="text-small text-ink-2"><span className="font-medium text-ink">How this works:</span> {data.method}</p></Card>

      {data.products.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title="Nothing to forecast yet" description="Publish products and make a few sales. Projections appear once there is real data." />
      ) : sold.length === 0 ? (
        <EmptyState icon={<BarChart3 />} title="No sales in the last 30 days" description="Forecasts need recent sales. Once orders come in, restock advice appears here." />
      ) : (
        <>
          {data.stockoutRisk.length > 0 && (
            <Card tone="warning" padding="lg" className="mb-4">
              <SectionHeader title={<span className="flex items-center gap-2"><AlertTriangle size={18} className="text-warning" /> Likely to run out</span>} />
              <ul className="divide-y divide-line">
                {data.stockoutRisk.map((p: any) => (
                  <li key={p.id} className="flex items-center gap-3 py-2.5">
                    <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">{p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}</span>
                    <span className="min-w-0 flex-1"><Link to={`/seller/inventory?product=${p.id}`} className="block truncate text-sm font-medium text-ink hover:text-brand-green">{p.name}</Link><span className="block text-caption text-ink-3">{p.available} left · about {p.dailyRate}/day · out in {p.daysOfStock} day{p.daysOfStock === 1 ? '' : 's'}</span></span>
                    <span className="shrink-0 rounded-full bg-brand-green-mist px-2.5 py-1 text-caption font-semibold text-brand-green-deep">Restock {p.recommendedRestock}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <Card padding="lg">
              <SectionHeader title={<span className="flex items-center gap-2"><TrendingUp size={18} className="text-brand-green" /> Fast moving</span>} />
              <ul className="divide-y divide-line">
                {data.fastMoving.map((p: any) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate text-ink">{p.name}</span><span className="shrink-0 text-caption text-ink-3">{p.unitsLast30} in 30 d · {p.trend === 'up' ? '▲' : p.trend === 'down' ? '▼' : '•'} {p.trend}</span></li>
                ))}
              </ul>
            </Card>
            <Card padding="lg">
              <SectionHeader title={<span className="flex items-center gap-2"><TrendingDown size={18} className="text-ink-3" /> Slow moving</span>} />
              {data.slowMoving.length === 0 ? <p className="text-small text-ink-3">Everything published has sold in the last month.</p> : (
                <ul className="divide-y divide-line">
                  {data.slowMoving.map((p: any) => (
                    <li key={p.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate text-ink">{p.name}</span><span className="shrink-0 text-caption text-ink-3">{p.available} in stock · {p.views30} views</span></li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card padding="lg" className="mt-4">
            <SectionHeader title="Orders by weekday, last 90 days" />
            <BarChart points={weekday} ariaLabel="Orders by day of the week" emptyText="Not enough orders yet to see a weekly pattern." />
          </Card>

          <Card padding="none" className="mt-4">
            <div className="hidden grid-cols-[1fr_90px_90px_100px_110px] gap-3 border-b border-line px-4 py-2 text-label font-semibold uppercase text-ink-3 md:grid"><span>Product</span><span className="text-right">Per day</span><span className="text-right">In stock</span><span className="text-right">Days left</span><span className="text-right">Restock</span></div>
            <ul className="divide-y divide-line">
              {data.products.map((p: any) => (
                <li key={p.id} className="grid grid-cols-[1fr_auto] items-center gap-2 p-3 md:grid-cols-[1fr_90px_90px_100px_110px] md:gap-3">
                  <span className="min-w-0 truncate text-sm text-ink">{p.name}<span className="ml-2 text-caption text-ink-3 md:hidden">{p.dailyRate}/day · {p.available} left</span></span>
                  <span className="hidden text-right text-sm tabular-nums md:block">{p.dailyRate}</span>
                  <span className="hidden text-right text-sm tabular-nums md:block">{p.available}</span>
                  <span className={`text-right text-sm tabular-nums ${p.risk === 'critical' ? 'font-semibold text-brand-red' : p.risk === 'soon' ? 'text-warning' : 'text-ink-2'}`}>{p.daysOfStock === null ? '—' : `${p.daysOfStock} d`}</span>
                  <span className="hidden text-right text-sm tabular-nums text-ink md:block">{p.recommendedRestock > 0 ? `+${p.recommendedRestock}` : '—'}</span>
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
