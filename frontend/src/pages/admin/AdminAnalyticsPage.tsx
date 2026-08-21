import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { RatingStars } from '../../components/ui/RatingStars';
import { formatUgx } from './AdminDetailShell';

const WINDOWS = [7, 30, 90];

function Stat({ label, value, tone = 'ink' }: { label: string; value: string | number; tone?: 'ink' | 'good' | 'warn' }) {
  const colour =
    tone === 'good' ? 'text-brand-green-fresh' : tone === 'warn' ? 'text-brand-red' : 'text-brand-green-deep';
  return (
    <GlassCard padding="sm" hover={false}>
      <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">{label}</p>
      <p className={`mt-1 font-display text-xl font-medium ${colour}`}>{value}</p>
    </GlassCard>
  );
}

/**
 * The numbers you run the business on.
 *
 * The chart is plain divs rather than a charting library: it shows one series
 * over at most 90 points, and 40kB of dependency to draw rectangles is a poor
 * trade on a connection where every kilobyte is somebody's airtime.
 */
export function AdminAnalyticsPage() {
  const [days, setDays] = useState(30);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/admin/analytics?days=${days}`)
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, [days]);

  if (loading && !data) return <LoadingState label="Crunching the numbers…" />;
  if (!data) return null;

  const { totals, daily, topShoppers } = data;
  const peak = Math.max(1, ...daily.map((d: any) => Number(d.orders)));
  const completionRate = totals.orders
    ? Math.round((Number(totals.completed) / Number(totals.orders)) * 100)
    : 0;

  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Analytics</h1>
        <div className="flex gap-1 rounded-full border border-brand-green/15 p-1">
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setDays(w)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                days === w ? 'bg-brand-green text-white' : 'text-brand-ink/55 hover:bg-brand-green-mist'
              }`}
            >
              {w} days
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Stat label="Gross value" value={formatUgx(totals.gmv_ugx)} />
        <Stat label="Platform revenue" value={formatUgx(totals.revenue_ugx)} tone="good" />
        <Stat label="Owed to shoppers" value={formatUgx(totals.owed_ugx)} tone="warn" />
        <Stat label="Completion rate" value={`${completionRate}%`} />
        <Stat label="Open disputes" value={totals.open_disputes} tone={totals.open_disputes ? 'warn' : 'ink'} />
        <Stat label="Customers" value={totals.customers} />
        <Stat label="Shoppers" value={totals.shoppers} />
        <Stat label="Orders, all time" value={totals.orders} />
        <Stat label="Cancelled" value={totals.cancelled} />
        <Stat label="Suspended accounts" value={totals.suspended} tone={totals.suspended ? 'warn' : 'ink'} />
      </div>

      <GlassCard padding="lg" hover={false} className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
          Orders per day · last {days} days
        </p>
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
                {/* A day with nothing still gets a sliver, so a gap reads as
                    "no orders" rather than as missing data. */}
                <div
                  className="rounded-t bg-brand-green/25"
                  style={{ height: `${Math.max(2, (orders / peak) * 100)}%` }}
                >
                  <div
                    className="h-full rounded-t bg-brand-green-fresh"
                    style={{ height: orders ? `${(done / orders) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-3 flex items-center gap-4 text-xs text-brand-ink/45">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-green-fresh" /> completed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm bg-brand-green/25" /> all orders
          </span>
        </p>
      </GlassCard>

      <GlassCard padding="lg" hover={false} className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
          Top shoppers by value delivered
        </p>
        {topShoppers.length === 0 ? (
          <p className="mt-4 text-sm text-brand-ink/45">No completed orders yet.</p>
        ) : (
          <div className="mt-3 flex flex-col">
            {topShoppers.map((s: any, i: number) => (
              <Link
                key={s.id}
                to={`/admin/shoppers/${s.id}`}
                className="flex items-center gap-3 border-b border-brand-green/5 py-2.5 last:border-0 hover:bg-brand-green-mist/40"
              >
                <span className="w-5 shrink-0 text-xs font-semibold text-brand-ink/35">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-brand-green-deep">{s.full_name}</span>
                  <span className="block text-[11px] text-brand-ink/45">{s.completed_jobs} jobs done</span>
                </span>
                <RatingStars value={Number(s.rating_avg ?? 0)} />
                <span className="w-28 shrink-0 text-right text-sm text-brand-ink/70">{formatUgx(s.gmv_ugx)}</span>
              </Link>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
