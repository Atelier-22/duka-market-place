import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Coins, ShieldAlert, Star, TrendingUp } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { ActiveJobCard } from '../../components/domain/ActiveJobCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows, SkeletonStats } from '../../components/ui/Skeleton';
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
  const [failed, setFailed] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [deciding, setDeciding] = useState<string | null>(null);

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
    setFailed(false);
    api.get('/shoppers/dashboard')
      .then((res) => setData(res.data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function toggleOnline() {
    setTogglingOnline(true);
    try {
      await api.patch('/shoppers/profile', { isOnline: !data.profile.is_online });
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setTogglingOnline(false);
    }
  }

  if (loading || (!data && !failed)) {
    return (
      <SkeletonRegion label="Loading your dashboard" className="flex flex-col gap-6 pb-10">
        <SkeletonHeading />
        <SkeletonStats />
        <SkeletonRows count={2} />
      </SkeletonRegion>
    );
  }

  if (failed || !data) {
    return (
      <EmptyState
        title="We couldn't load your dashboard"
        description="Check your connection and try again."
        action={<Button size="sm" onClick={() => { setLoading(true); load(); }}>Try again</Button>}
      />
    );
  }

  const activeJobs: any[] = data.activeOrders ?? [];
  const limit: number = data.activeJobLimit ?? 5;
  const atCapacity: boolean = data.atCapacity ?? activeJobs.length >= limit;
  const online: boolean = !!data.profile.is_online;
  const verified = data.profile.verification_status === 'approved';

  return (
    <div className="flex flex-col gap-6 pb-10">
      <PageHeader
        title={`${online ? "You're online" : "You're offline"}, ${user?.fullName.split(' ')[0] ?? ''}`}
        subtitle={`${data.availableJobsCount} open request${data.availableJobsCount === 1 ? '' : 's'} nearby right now.`}
        actions={
          <Button size="sm" variant={online ? 'secondary' : 'primary'} loading={togglingOnline} onClick={toggleOnline}>
            <span className={`h-2 w-2 rounded-full ${online ? 'bg-brand-green-fresh' : 'bg-ink-3'}`} aria-hidden />
            {online ? 'Go offline' : 'Go online'}
          </Button>
        }
        className="mb-0"
      />

      {!verified && (
        <Card tone="warning" className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-warning-soft text-warning">
            <ShieldAlert size={18} strokeWidth={1.9} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-medium text-ink">Verification {data.profile.verification_status ?? 'needed'}</p>
            <p className="mt-0.5 text-small text-ink-2">
              Complete verification to start accepting jobs. It takes a couple of minutes.
            </p>
            <Link to="/shopper/verification" className="mt-3 inline-block">
              <Button size="sm">Verify my account <ArrowRight size={15} strokeWidth={2} /></Button>
            </Link>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        <DashboardStat label="Today's earnings" value={formatUgx(data.earnings.today)} icon={<Coins />} accent="yellow" />
        <DashboardStat label="This week" value={formatUgx(data.earnings.week)} icon={<TrendingUp />} accent="yellow" />
        <DashboardStat label="Rating" value={String(data.profile.rating_avg || '—')} icon={<Star />} />
        <DashboardStat label="Completed jobs" value={String(data.profile.completed_jobs)} icon={<CheckCircle2 />} />
      </div>

      <section>
        <SectionHeader
          title={
            <>
              Your jobs
              <span className="ml-2 text-small font-normal text-ink-3">{activeJobs.length} of {limit}</span>
            </>
          }
          action={
            !atCapacity && activeJobs.length > 0 ? (
              <Link to="/shopper/available" className="text-sm font-medium text-brand-green hover:underline">
                Take another job
              </Link>
            ) : undefined
          }
        />

        {atCapacity && (
          <p className="mb-3 rounded-lg border border-brand-yellow/40 bg-warning-soft/50 px-4 py-3 text-small text-ink">
            You're carrying the maximum of {limit} jobs. Finish or hand one back before taking another.
          </p>
        )}

        {activeJobs.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {activeJobs.map((job: any, i: number) => (
              <ActiveJobCard key={job.id} job={job} index={i + 1} deciding={deciding === job.id} onDecide={decide} />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No active job right now"
            description={`Browse open requests near you and accept one to get started. You can run up to ${limit} at a time.`}
            action={
              <Link to="/shopper/available">
                <Button size="sm">Browse available requests <ArrowRight size={15} strokeWidth={2} /></Button>
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
