import { useEffect, useState } from 'react';
import { CalendarDays, Coins, Trophy, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { SkeletonRegion, SkeletonRows, SkeletonStats } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function ShopperEarningsPage() {
  const [earnings, setEarnings] = useState<any[]>([]);
  const [dashboard, setDashboard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.get('/shoppers/earnings'), api.get('/shoppers/dashboard')])
      .then(([e, d]) => {
        setEarnings(e.data.earnings);
        setDashboard(d.data);
      })
      .finally(() => setLoading(false));
  }, []);

  const header = <PageHeader title="Earnings" subtitle="What you have made with Duka, and what is ready to withdraw." />;

  if (loading) {
    return (
      <SkeletonRegion label="Loading your earnings" className="pb-10">
        {header}
        <SkeletonStats />
        <div className="mt-8"><SkeletonRows count={4} /></div>
      </SkeletonRegion>
    );
  }

  return (
    <div className="pb-10">
      {header}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Available balance" value={formatUgx(dashboard?.profile.available_balance_ugx ?? 0)} icon={<Coins size={18} strokeWidth={1.75} />} accent="yellow" />
        <DashboardStat label="Today" value={formatUgx(dashboard?.earnings.today ?? 0)} icon={<CalendarDays size={18} strokeWidth={1.75} />} />
        <DashboardStat label="This week" value={formatUgx(dashboard?.earnings.week ?? 0)} icon={<TrendingUp size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Lifetime" value={formatUgx(dashboard?.profile.lifetime_earnings_ugx ?? 0)} icon={<Trophy size={18} strokeWidth={1.75} />} />
      </div>

      <section className="mt-8">
        <SectionHeader title="History" />
        {earnings.length === 0 ? (
          <EmptyState
            icon={<Coins />}
            title="No earnings yet"
            description="Complete your first job to start earning."
          />
        ) : (
          <Card padding="none" hover={false}>
            <ul>
              {earnings.map((e) => (
                <li key={e.id} className="border-b border-line last:border-0">
                  <div className="flex min-h-[64px] items-center justify-between gap-4 px-4 py-3">
                    <div className="min-w-0">
                      <p className="font-semibold tabular-nums text-ink">{formatUgx(e.amount_ugx)}</p>
                      <p className="mt-0.5 truncate text-caption text-ink-3">
                        Order #{e.order_id.slice(0, 8)} · {formatDate(e.created_at)}
                      </p>
                    </div>
                    {e.status && <StatusBadge status={e.status} />}
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
