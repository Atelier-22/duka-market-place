import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonDetail, SkeletonRegion } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AdminUserActions } from '../../components/domain/AdminUserActions';
import { AdminDetailShell, Empty, Field, Panel, Pill, formatDate, formatUgx } from './AdminDetailShell';

export function AdminCustomerDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    api.get(`/admin/customers/${id}`)
      .then((res) => setData(res.data))
      .catch(() => setError('Could not load this customer.'))
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
        <PageHeader back title="Customer" />
        <EmptyState
          title={error ?? 'Not found.'}
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={retry}>Try again</Button>}
        />
      </div>
    );
  }

  const { user, requests, orders, disputes, addresses, totals } = data;

  return (
    <AdminDetailShell
      title={user.full_name}
      subtitle={<>{user.phone}{user.email ? ` · ${user.email}` : ''}</>}
      badges={
        <>
          <Pill tone="brand">Customer</Pill>
          {!user.is_active && <Pill tone="danger">Deactivated</Pill>}
        </>
      }
    >
      <Panel title="Profile">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Joined" value={formatDate(user.created_at)} />
          <Field label="Lifetime spent" value={<span className="tabular-nums">{formatUgx(totals.lifetimeSpentUgx)}</span>} />
          <Field label="Completed orders" value={totals.completedOrders} />
          <Field label="Requests posted" value={requests.length} />
        </div>
        {addresses.length > 0 && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-label font-semibold uppercase text-ink-3">Addresses</p>
            <ul className="mt-2 flex flex-col gap-1">
              {addresses.map((a: any) => (
                <li key={a.id} className="text-sm text-ink-2">
                  <span className="font-medium text-ink">{a.label}:</span> {a.line1}, {a.city}{a.is_default ? ' (default)' : ''}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Panel>

      {disputes.length > 0 && (
        <Panel title="Disputes raised" count={disputes.length}>
          <div className="flex flex-col gap-2">
            {disputes.map((d: any) => (
              <Link
                key={d.id}
                to={`/admin/orders/${d.order_id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-brand-red/25 bg-danger-soft/30 px-4 py-3 transition-colors hover:bg-danger-soft/50"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-ink">{d.reason}</span>
                  <span className="block text-caption text-ink-3">Order #{d.order_id.slice(0, 8)} · {formatDate(d.created_at)}</span>
                </span>
                <span className="shrink-0 text-label font-semibold uppercase text-brand-red">{d.status.replace(/_/g, ' ')}</span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Orders" count={orders.length}>
        {orders.length === 0 ? <Empty title="No orders yet" description="Orders this customer places will be listed here." /> : (
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
                    {o.shopper_name ? `Shopper: ${o.shopper_name}` : 'Unassigned'} · {formatDate(o.created_at)}
                  </span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink-2">{formatUgx(o.total_amount_ugx)}</span>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Requests" count={requests.length}>
        {requests.length === 0 ? <Empty title="No requests yet" description="Shopping requests this customer posts will be listed here." /> : (
          <div className="flex flex-col">
            {requests.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-line py-3 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-ink">{r.title}</span>
                  <span className="block text-caption text-ink-3">{formatDate(r.created_at)}</span>
                </span>
                <span className="shrink-0 text-sm tabular-nums text-ink-2">up to {formatUgx(r.budget_max_ugx)}</span>
                <StatusBadge status={r.status} />
              </div>
            ))}
          </div>
        )}
      </Panel>

      <AdminUserActions
        userId={user.id}
        name={user.full_name}
        role={'customer'}
        isActive={user.is_active !== false}
        onChanged={() => setReloadKey((k) => k + 1)}
      />
    </AdminDetailShell>
  );
}
