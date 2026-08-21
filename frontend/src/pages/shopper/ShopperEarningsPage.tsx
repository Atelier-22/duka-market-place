import { useEffect, useState } from 'react';
import { CalendarDays, Coins, Trophy, TrendingUp } from 'lucide-react';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
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

  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Earnings</h1>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Available balance" value={formatUgx(dashboard?.profile.available_balance_ugx ?? 0)} icon={<Coins size={18} strokeWidth={1.75} />} accent="yellow" />
        <DashboardStat label="Today" value={formatUgx(dashboard?.earnings.today ?? 0)} icon={<CalendarDays size={18} strokeWidth={1.75} />} />
        <DashboardStat label="This week" value={formatUgx(dashboard?.earnings.week ?? 0)} icon={<TrendingUp size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Lifetime" value={formatUgx(dashboard?.profile.lifetime_earnings_ugx ?? 0)} icon={<Trophy size={18} strokeWidth={1.75} />} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-medium text-brand-green-deep">History</h2>
        {earnings.length === 0 ? (
          <EmptyState title="No earnings yet" description="Complete your first job to start earning." />
        ) : (
          <div className="flex flex-col gap-3">
            {earnings.map((e) => (
              <GlassCard key={e.id} hover={false} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-brand-ink">{formatUgx(e.amount_ugx)}</p>
                  <p className="text-xs text-brand-ink/45">Order #{e.order_id.slice(0, 8)} · {e.status}</p>
                </div>
                <span className="text-xs text-brand-ink/40">{new Date(e.created_at).toLocaleDateString('en-UG')}</span>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
