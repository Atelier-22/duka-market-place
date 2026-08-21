import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { LoadingState } from '../../components/ui/LoadingState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RatingStars } from '../../components/ui/RatingStars';
import { ZoomableImage } from '../../components/ui/ZoomableImage';
import { AdminDetailShell, Empty, Field, Panel, formatDate, formatUgx } from './AdminDetailShell';

const VERIFICATION_TONE: Record<string, string> = {
  approved: 'bg-brand-green-mist text-brand-green-deep',
  pending: 'bg-brand-yellow-soft text-yellow-800',
  rejected: 'bg-brand-red/10 text-brand-red',
  unverified: 'bg-brand-ink/10 text-brand-ink/60',
};

export function AdminShopperDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/admin/shoppers/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load this shopper.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState label="Loading shopper…" />;
  if (error || !data) return <p className="p-8 text-sm text-brand-red">{error ?? 'Not found.'}</p>;

  const { user, verifications, orders, earnings, ratings, offers } = data;

  return (
    <AdminDetailShell
      title={user.full_name}
      subtitle={<>{user.phone}{user.email ? ` · ${user.email}` : ''}</>}
      badges={
        <>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${VERIFICATION_TONE[user.verification_status] ?? VERIFICATION_TONE.unverified}`}>
            {user.verification_status ?? 'unverified'}
          </span>
          <span className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${user.is_online ? 'bg-brand-green-mist text-brand-green-deep' : 'bg-brand-ink/10 text-brand-ink/50'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${user.is_online ? 'bg-brand-green-fresh' : 'bg-brand-ink/30'}`} />
            {user.is_online ? 'Online' : 'Offline'}
          </span>
          {!user.is_active && <span className="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-semibold text-brand-red">Deactivated</span>}
        </>
      }
    >
      <Panel title="Performance">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Rating" value={<span className="flex items-center gap-2">{Number(user.rating_avg ?? 0).toFixed(2)} <RatingStars value={Number(user.rating_avg ?? 0)} count={user.rating_count} /></span>} />
          <Field label="Completed jobs" value={user.completed_jobs ?? 0} />
          <Field label="Cancelled jobs" value={user.cancelled_jobs ?? 0} />
          <Field label="Completion rate" value={`${Number(user.completion_rate ?? 0)}%`} />
          <Field label="Available balance" value={formatUgx(user.available_balance_ugx)} />
          <Field label="Lifetime earnings" value={formatUgx(user.lifetime_earnings_ugx)} />
          <Field label="Operating area" value={user.operating_area} />
          <Field label="Joined" value={formatDate(user.created_at)} />
        </div>
        {user.bio && <p className="mt-4 border-t border-brand-green/10 pt-4 text-sm text-brand-ink/70">{user.bio}</p>}
      </Panel>

      <Panel title="Verification documents" count={verifications.length}>
        {verifications.length === 0 ? <Empty>Nothing submitted.</Empty> : (
          <div className="grid gap-3 sm:grid-cols-2">
            {verifications.map((v: any) => (
              <div key={v.id} className="rounded-xl2 border border-brand-green/15 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-brand-green-deep">{v.document_type.replace(/_/g, ' ')}</p>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${VERIFICATION_TONE[v.status] ?? VERIFICATION_TONE.unverified}`}>
                    {v.status}
                  </span>
                </div>
                {v.document_url && (
                  <ZoomableImage
                    src={v.document_url}
                    alt={v.document_type.replace(/_/g, ' ')}
                    caption={`${user.full_name} · ${v.document_type.replace(/_/g, ' ')}`}
                    wrapperClassName="mt-2 w-full rounded-lg"
                    className="h-32 w-full rounded-lg object-cover"
                  />
                )}
                <p className="mt-2 text-xs text-brand-ink/45">Submitted {formatDate(v.created_at)}</p>
                {v.rejection_reason && <p className="mt-1 text-xs text-brand-red">{v.rejection_reason}</p>}
              </div>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Jobs taken" count={orders.length}>
        {orders.length === 0 ? <Empty>No jobs yet.</Empty> : (
          <div className="flex flex-col">
            {orders.map((o: any) => (
              <Link
                key={o.id}
                to={`/admin/orders/${o.id}`}
                className="flex items-center gap-3 border-b border-brand-green/5 py-2.5 last:border-0 hover:bg-brand-green-mist/40"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-brand-green-deep">
                    #{o.id.slice(0, 8)} · {o.request_title ?? 'Order'}
                  </span>
                  <span className="block truncate text-xs text-brand-ink/45">
                    {o.customer_name} · {formatDate(o.created_at)}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-brand-ink/60">{formatUgx(o.total_amount_ugx)}</span>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid gap-5 md:grid-cols-2">
        <Panel title="Earnings history" count={earnings.length}>
          {earnings.length === 0 ? <Empty>No earnings recorded.</Empty> : (
            <div className="flex flex-col">
              {earnings.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between border-b border-brand-green/5 py-2 last:border-0">
                  <span className="text-xs text-brand-ink/50">
                    #{String(e.order_id).slice(0, 8)} · {formatDate(e.created_at)}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-sm text-brand-ink/75">{formatUgx(e.amount_ugx)}</span>
                    <span className="text-[11px] uppercase tracking-wide text-brand-ink/35">{e.status}</span>
                  </span>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Rating history" count={ratings.length}>
          {ratings.length === 0 ? <Empty>Not rated yet.</Empty> : (
            <div className="flex flex-col">
              {ratings.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between border-b border-brand-green/5 py-2 last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-brand-ink/75">{r.rated_by_name ?? 'A customer'}</span>
                    <span className="block text-[11px] text-brand-ink/40">{formatDate(r.created_at)}</span>
                  </span>
                  <RatingStars value={r.stars} />
                </div>
              ))}
            </div>
          )}
        </Panel>
      </div>

      <Panel title="Offers made" count={offers.length}>
        {offers.length === 0 ? <Empty>No offers yet.</Empty> : (
          <div className="flex flex-col">
            {offers.map((o: any) => (
              <div key={o.id} className="flex items-center justify-between border-b border-brand-green/5 py-2 last:border-0">
                <span className="text-xs text-brand-ink/50">{formatDate(o.created_at)}</span>
                <span className="flex items-center gap-3">
                  <span className="text-sm text-brand-ink/70">fee {formatUgx(o.shopping_fee_ugx)}</span>
                  <span className="text-[11px] uppercase tracking-wide text-brand-ink/40">{o.status}</span>
                </span>
              </div>
            ))}
          </div>
        )}
      </Panel>
    </AdminDetailShell>
  );
}
