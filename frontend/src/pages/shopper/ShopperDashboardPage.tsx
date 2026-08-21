import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Coins, Star, TrendingUp } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { NotificationBell } from '../../components/domain/NotificationBell';
import { ActiveJobCard } from '../../components/domain/ActiveJobCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function ShopperDashboardPage() {
  const { user } = useAuth();
  const { push } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [togglingOnline, setTogglingOnline] = useState(false);
  /** The order id currently being accepted/declined — several may be waiting. */
  const [deciding, setDeciding] = useState<string | null>(null);

  /** Accept or decline a job the customer assigned but the shopper hasn't answered. */
  async function decide(orderId: string, accept: boolean) {
    setDeciding(orderId);
    try {
      if (accept) {
        await api.post(`/orders/${orderId}/assign`);
        push('Job accepted', 'success');
      } else {
        await api.post(`/orders/${orderId}/cancel`, { reason: 'Shopper declined the job' });
        push('Job declined', 'success');
      }
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setDeciding(null);
    }
  }

  function load() {
    api.get('/shoppers/dashboard').then((res) => setData(res.data)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleOnline() {
    setTogglingOnline(true);
    try {
      await api.patch('/shoppers/profile', { isOnline: !data.profile.is_online });
      load();
    } finally {
      setTogglingOnline(false);
    }
  }

  if (loading || !data) return <LoadingState label="Loading your dashboard…" />;

  const activeJobs: any[] = data.activeOrders ?? [];
  const limit: number = data.activeJobLimit ?? 5;
  const atCapacity: boolean = data.atCapacity ?? activeJobs.length >= limit;

  return (
    <div className="flex flex-col gap-6 pb-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-medium text-brand-green-deep">
            {data.profile.is_online ? "You're online" : "You're offline"}, {user?.fullName.split(' ')[0]}
          </h1>
          <p className="text-sm text-brand-ink/50">
            {data.availableJobsCount} open request{data.availableJobsCount === 1 ? '' : 's'} nearby right now.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <GlassButton
            size="sm"
            variant={data.profile.is_online ? 'danger' : 'primary'}
            disabled={togglingOnline}
            onClick={toggleOnline}
          >
            {data.profile.is_online ? 'Go offline' : 'Go online'}
          </GlassButton>
        </div>
      </div>

      {data.profile.verification_status !== 'approved' && (
        <GlassCard glow="yellow" hover={false}>
          <p className="font-medium text-brand-green-deep">Verification {data.profile.verification_status}</p>
          <p className="mt-1 text-sm text-brand-ink/60">
            Complete verification to start accepting jobs. It only takes a couple of minutes.
          </p>
          <Link to="/shopper/verification" className="mt-3 inline-block">
            <GlassButton size="sm">Verify my account <ArrowRight size={15} strokeWidth={2} /></GlassButton>
          </Link>
        </GlassCard>
      )}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Today's earnings" value={formatUgx(data.earnings.today)} icon={<Coins size={18} strokeWidth={1.75} />} accent="yellow" />
        <DashboardStat label="This week" value={formatUgx(data.earnings.week)} icon={<TrendingUp size={18} strokeWidth={1.75} />} accent="yellow" />
        <DashboardStat label="Rating" value={String(data.profile.rating_avg || '—')} icon={<Star size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Completed jobs" value={String(data.profile.completed_jobs)} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} />
      </div>

      {activeJobs.length > 0 ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-lg font-medium text-brand-green-deep">
              Your jobs
              {/* Slots used, so the cap is never a surprise at the moment
                  someone tries to take a sixth. */}
              <span className="ml-2 text-sm font-normal text-brand-ink/40">
                {activeJobs.length} of {limit}
              </span>
            </h2>
            {!atCapacity && (
              <Link to="/shopper/available" className="text-sm font-medium text-brand-green-deep hover:underline">
                Take another job <ArrowRight size={14} strokeWidth={2} className="inline" />
              </Link>
            )}
          </div>

          {atCapacity && (
            <p className="rounded-xl bg-brand-yellow-soft/60 px-4 py-3 text-sm text-yellow-800">
              You're carrying the maximum of {limit} jobs. Finish or hand one back before taking another.
            </p>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            {activeJobs.map((job: any, i: number) => (
              <ActiveJobCard
                key={job.id}
                job={job}
                index={i + 1}
                deciding={deciding === job.id}
                onDecide={decide}
              />
            ))}
          </div>
        </div>
      ) : (
        <GlassCard padding="lg" hover={false}>
          <p className="font-medium text-brand-green-deep">No active job right now</p>
          <p className="mt-1 text-sm text-brand-ink/60">
            Browse available requests near you and accept one to get started — you can run up to {limit} at a time.
          </p>
          <Link to="/shopper/available" className="mt-4 inline-block">
            <GlassButton size="sm">Browse available requests <ArrowRight size={15} strokeWidth={2} /></GlassButton>
          </Link>
        </GlassCard>
      )}
    </div>
  );
}
