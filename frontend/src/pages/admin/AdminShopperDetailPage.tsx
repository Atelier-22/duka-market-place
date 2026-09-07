import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonDetail, SkeletonRegion } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RatingStars } from '../../components/ui/RatingStars';
import { ZoomableImage } from '../../components/ui/ZoomableImage';
import { AdminUserActions } from '../../components/domain/AdminUserActions';
import { AdminDetailShell, Empty, Field, Panel, Pill, PillTone, formatDate, formatUgx } from './AdminDetailShell';

const VERIFICATION_TONE: Record<string, PillTone> = {
  approved: 'success',
  pending: 'warning',
  rejected: 'danger',
  unverified: 'neutral',
};

export function AdminShopperDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.get(`/admin/shoppers/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load this shopper.'))
      .finally(() => setLoading(false));
  }, [id, reloadKey]);

  function retry() {
    setError(null);
    setLoading(true);
    setReloadKey((k) => k + 1);
  }

  if (loading) return <SkeletonRegion label="Loading"><SkeletonDetail /></SkeletonRegion>;
  if (error || !data) {
    return (
      <div className="mx-auto max-w-5xl pb-16">
        <PageHeader back title="Shopper" />
        <EmptyState
          title={error ?? 'Not found.'}
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={retry}>Try again</Button>}
        />
      </div>
    );
  }

  const { user, verifications, orders, earnings, ratings, offers } = data;

  return (
    <AdminDetailShell
      title={user.full_name}
      subtitle={<>{user.phone}{user.email ? ` · ${user.email}` : ''}</>}
      badges={
        <>
          <Pill tone={VERIFICATION_TONE[user.verification_status] ?? 'neutral'} className="capitalize">
            {user.verification_status ?? 'unverified'}
          </Pill>
          <Pill tone={user.is_online ? 'success' : 'neutral'} dot>
            {user.is_online ? 'Online' : 'Offline'}
          </Pill>
          {!user.is_active && <Pill tone="danger">Deactivated</Pill>}
        </>
      }
    >
      <Panel title="Performance">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field
            label="Rating"
            value={
              <span className="flex items-center gap-2 tabular-nums">
                {Number(user.rating_avg ?? 0).toFixed(2)} <RatingStars value={Number(user.rating_avg ?? 0)} count={user.rating_count} />
              </span>
            }
          />
          <Field label="Completed jobs" value={user.completed_jobs ?? 0} />
          <Field label="Cancelled jobs" value={user.cancelled_jobs ?? 0} />
          <Field label="Completion rate" value={`${Number(user.completion_rate ?? 0)}%`} />
          <Field label="Available balance" value={<span className="tabular-nums">{formatUgx(user.available_balance_ugx)}</span>} />
          <Field label="Lifetime earnings" value={<span className="tabular-nums">{formatUgx(user.lifetime_earnings_ugx)}</span>} />
          <Field label="Operating area" value={user.operating_area} />
          <Field label="Joined" value={formatDate(user.created_at)} />
        </div>
        {user.bio && <p className="mt-5 border-t border-line pt-4 text-sm text-ink-2">{user.bio}</p>}
      </Panel>

      <Panel title="Verification documents" count={verifications.length}>
        {verifications.length === 0 ? <Empty title="Nothing submitted" description="Documents the shopper uploads will appear here." /> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {verifications.map((v: any) => (
              <div key={v.id} className="rounded-xl border border-line p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium capitalize text-brand-green-deep">{v.document_type.replace(/_/g, ' ')}</p>
                  <Pill tone={VERIFICATION_TONE[v.status] ?? 'neutral'} className="capitalize">{v.status}</Pill>
                </div>
                {v.document_url && (
                  <ZoomableImage
                    src={v.document_url}
                    alt={v.document_type.replace(/_/g, ' ')}
                    caption={`${user.full_name} · ${v.document_type.replace(/_/g, ' ')}`}
                    wrapperClassName="mt-3 w-full rounded-lg"
                    className="h-32 w-full rounded-lg object-cover"
                  />
                )}
                <p className="mt-2 text-caption text-ink-3">Submitted {formatDate(v.created_at)}</p>
                {v.rejection_reason && <p className="mt-1 text-caption font-medium text-brand-red">{v.rejection_reason}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Jobs taken" count={orders.length}>
        {orders.length === 0 ? <Empty title="No jobs yet" description="Orders this shopper takes on will be listed here." /> : (
          <div className="-mx-2 flex flex-col">
            {orders.map((o: any) => (
              <Link
                key={o.id}
                to={`/admin/orders/${o.id}`}
                className="flex items-center gap-3 border-b border-line px-2 py-3 transition-colors last:border-0 hover:bg-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-brand-green-deep">
                    #{o.id.slice(0, 8)} · {o.request_title ?? 'Order'}
                  </span>
                  <span className="block truncate text-caption text-ink-3">
                    {o.customer_name} · {formatDate(o.created_at)}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink-2">{formatUgx(o.total_amount_ugx)}</span>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel title="Earnings history" count={earnings.length}>
          {earnings.length === 0 ? <Empty title="No earnings recorded" /> : (
            <div className="flex flex-col">
              {earnings.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
                  <span className="min-w-0 truncate text-caption text-ink-3">
                    #{String(e.order_id).slice(0, 8)} · {formatDate(e.created_at)}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    <span className="text-sm tabular-nums text-ink">{formatUgx(e.amount_ugx)}</span>
                    <StatusBadge status={e.status} />
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Rating history" count={ratings.length}>
          {ratings.length === 0 ? <Empty title="Not rated yet" /> : (
            <div className="flex flex-col">
              {ratings.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-ink">{r.rated_by_name ?? 'A customer'}</span>
                    <span className="block text-caption text-ink-3">{formatDate(r.created_at)}</span>
                  </span>
                  <RatingStars value={r.stars} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Offers made" count={offers.length}>
        {offers.length === 0 ? <Empty title="No offers yet" description="Offers this shopper makes on requests will be listed here." /> : (
          <div className="flex flex-col">
            {offers.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
                <span className="text-caption text-ink-3">{formatDate(o.created_at)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-sm tabular-nums text-ink-2">fee {formatUgx(o.shopping_fee_ugx)}</span>
                  <StatusBadge status={o.status} />
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <AdminUserActions
        userId={user.id}
        name={user.full_name}
        role={'shopper'}
        isActive={user.is_active !== false}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </AdminDetailShell>
  );
}
