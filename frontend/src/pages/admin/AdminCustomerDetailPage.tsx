import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../../services/api';
import { LoadingState } from '../../components/ui/LoadingState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { AdminUserActions } from '../../components/domain/AdminUserActions';
import { AdminDetailShell, Empty, Field, Panel, formatDate, formatUgx } from './AdminDetailShell';

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

  if (loading) return <LoadingState label="Loading customer…" />;
  if (error || !data) return <p className="p-8 text-sm text-brand-red">{error ?? 'Not found.'}</p>;

  const { user, requests, orders, disputes, addresses, totals } = data;

  return (
    <AdminDetailShell
      title={user.full_name}
      subtitle={<>{user.phone}{user.email ? ` · ${user.email}` : ''}</>}
      badges={
        <>
          <span className="rounded-full bg-brand-green-mist px-3 py-1 text-xs font-semibold text-brand-green-deep">Customer</span>
          {!user.is_active && <span className="rounded-full bg-brand-red/10 px-3 py-1 text-xs font-semibold text-brand-red">Deactivated</span>}
        </>
      }
    >
      <Panel title="Profile">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Field label="Joined" value={formatDate(user.created_at)} />
          <Field label="Lifetime spent" value={formatUgx(totals.lifetimeSpentUgx)} />
          <Field label="Completed orders" value={totals.completedOrders} />
          <Field label="Requests posted" value={requests.length} />
        </div>
        {addresses.length > 0 && (
          <div className="mt-4 border-t border-brand-green/10 pt-4">
            <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">Addresses</p>
            <ul className="mt-2 flex flex-col gap-1">
              {addresses.map((a: any) => (
                <li key={a.id} className="text-sm text-brand-ink/70">
                  {a.label}: {a.line1}, {a.city}{a.is_default ? ' (default)' : ''}
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
                className="flex items-center justify-between gap-3 rounded-xl border border-brand-red/20 bg-brand-red/5 px-3 py-2 hover:bg-brand-red/10"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-brand-ink">{d.reason}</span>
                  <span className="block text-xs text-brand-ink/45">Order #{d.order_id.slice(0, 8)} · {formatDate(d.created_at)}</span>
                </span>
                <span className="shrink-0 text-xs font-semibold uppercase text-brand-red">{d.status.replace(/_/g, ' ')}</span>
              </Link>
            ))}
          </div>
        </Panel>
      )}

      <Panel title="Orders" count={orders.length}>
        {orders.length === 0 ? <Empty>No orders yet.</Empty> : (
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
                    {o.shopper_name ? `Shopper: ${o.shopper_name}` : 'Unassigned'} · {formatDate(o.created_at)}
                  </span>
                </span>
                <span className="shrink-0 text-sm text-brand-ink/60">{formatUgx(o.total_amount_ugx)}</span>
                <StatusBadge status={o.status} />
              </Link>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Requests" count={requests.length}>
        {requests.length === 0 ? <Empty>No requests yet.</Empty> : (
          <div className="flex flex-col">
            {requests.map((r: any) => (
              <div key={r.id} className="flex items-center gap-3 border-b border-brand-green/5 py-2.5 last:border-0">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-brand-ink/80">{r.title}</span>
                  <span className="block text-xs text-brand-ink/45">{formatDate(r.created_at)}</span>
                </span>
                <span className="shrink-0 text-sm text-brand-ink/55">up to {formatUgx(r.budget_max_ugx)}</span>
                <span className="shrink-0 text-[11px] uppercase tracking-wide text-brand-ink/40">{r.status.replace(/_/g, ' ')}</span>
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
