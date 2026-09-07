import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows, SkeletonStats } from '../../components/ui/Skeleton';
import { RatingStars } from '../../components/ui/RatingStars';
import { Empty, Panel, StatTile, formatUgx } from './AdminDetailShell';

type WindowKey = '7' | '30' | '90';

const WINDOWS: { value: WindowKey; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

export function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.get(`/admin/analytics?days=${days}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [days]);
  useEffect(load, [load]);

  if (loading && !data) {
    return (
      <SkeletonRegion label="Loading" className="pb-10">
        <SkeletonHeading />
        <div className="mt-6"><SkeletonStats /></div>
        <div className="mt-6"><SkeletonRows count={3} /></div>
      </SkeletonRegion>
    );
  }
  if (!data) {
    return (
      <div className="pb-10">
        <PageHeader title="Analytics" />
        <EmptyState
          title="Could not load this page"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={load}>Try again</Button>}
        />
      </div>
    );
  }

  const { totals, daily, topShoppers } = data;
  const peak = Math.max(1, ...daily.map((d: any) => Number(d.orders)));
  const completionRate = totals.orders
    ? Math.round((Number(totals.completed) / Number(totals.orders)) * 100)
    : 0;

  return (
    <div className="pb-10">
      <PageHeader
        title="Analytics"
        subtitle={`How the platform has performed over the last ${days} days.`}
        actions={
          <Tabs
            ariaLabel="Time window"
            value={String(days) as WindowKey}
            onChange={(v) => setDays(Number(v))}
            items={WINDOWS}
          />
        }
      />

      <div aria-busy={loading || undefined} className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
          <StatTile label="Gross value" value={formatUgx(totals.gmv_ugx)} />
          <StatTile label="Platform revenue" value={formatUgx(totals.revenue_ugx)} tone="success" />
          <StatTile label="Owed to shoppers" value={formatUgx(totals.owed_ugx)} tone="danger" />
          <StatTile label="Completion rate" value={`${completionRate}%`} />
          <StatTile label="Open disputes" value={totals.open_disputes} tone={totals.open_disputes ? 'danger' : 'default'} />
          <StatTile label="Customers" value={totals.customers} />
          <StatTile label="Shoppers" value={totals.shoppers} />
          <StatTile label="Orders, all time" value={totals.orders} />
          <StatTile label="Cancelled" value={totals.cancelled} />
          <StatTile label="Suspended accounts" value={totals.suspended} tone={totals.suspended ? 'danger' : 'default'} />
        </div>

        <Card padding="lg" hover={false} className="mt-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Orders per day</h2>
            <span className="text-caption text-ink-3">last {days} days</span>
          </div>
          <div className="mt-5 flex h-40 items-end gap-[3px] overflow-x-auto">
            {daily.map((d: any) => {
              const orders = Number(d.orders);
              const done = Number(d.completed);
              return (
                <div
                  key={d.day}
                  className="group relative flex min-w-[6px] flex-1 flex-col justify-end"
                  title={`${new Date(d.day).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })} · ${orders} order(s), ${done} completed, ${formatUgx(d.gmv_ugx)}`}
                >
                  <div
                    className="rounded-t-sm bg-brand-green/20"
                    style={{ height: `${Math.max(2, (orders / peak) * 100)}%` }}
                  >
                    <div
                      className="h-full rounded-t-sm bg-brand-green-fresh"
                      style={{ height: orders ? `${(done / orders) * 100}%` : '0%' }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-4 text-caption text-ink-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand-green-fresh" /> completed
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-brand-green/20" /> all orders
            </span>
          </p>
        </Card>

        <Panel title="Top shoppers by value delivered" className="mt-6">
          {topShoppers.length === 0 ? (
            <Empty title="No completed orders yet" description="Shoppers show up here once they have delivered." />
          ) : (
            <ol className="-mx-2 flex flex-col">
              {topShoppers.map((s: any, i: number) => (
                <li key={s.id}>
                  <Link
                    to={`/admin/shoppers/${s.id}`}
                    className="flex items-center gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-surface-2"
                  >
                    <span className="w-5 shrink-0 text-caption font-semibold tabular-nums text-ink-3">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-brand-green-deep">{s.full_name}</span>
                      <span className="block text-caption text-ink-3">{s.completed_jobs} jobs done</span>
                    </span>
                    <RatingStars value={Number(s.rating_avg ?? 0)} />
                    <span className="w-28 shrink-0 text-right text-sm tabular-nums text-ink-2">{formatUgx(s.gmv_ugx)}</span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      </div>
    </div>
  );
}
