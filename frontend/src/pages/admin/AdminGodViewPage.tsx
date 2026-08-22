import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { formatDate, formatUgx } from './AdminDetailShell';

function Stat({ label, value, to, tone = 'ink' }: {
  label: string; value: string | number; to?: string; tone?: 'ink' | 'good' | 'warn';
}) {
  const colour = tone === 'good' ? 'text-brand-green-fresh' : tone === 'warn' ? 'text-brand-red' : 'text-brand-green-deep';
  const inner = (
    <GlassCard padding="sm" hover={!!to}>
      <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">{label}</p>
      <p className={`mt-1 font-display text-xl font-medium ${colour}`}>{value}</p>
    </GlassCard>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
}

/**
 * Everything at once, for a super admin: the platform, and what the staff have
 * been doing to it.
 *
 * The staff feed is the part that only exists here. An admin can see the audit
 * log of their own console; a super admin sees it across every admin, with who
 * did what, which is the difference between running the platform and overseeing
 * the people who run it.
 */
export function AdminGodViewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = () => api.get('/admin/god-view').then((r) => setData(r.data)).finally(() => setLoading(false));
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) return <LoadingState label="Looking at everything…" />;
  if (!data) return null;

  const { platform: p, staffActivity, capacity } = data;

  return (
    <div className="pb-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-brand-green-deep">Everything</h1>
          <p className="mt-1 text-sm text-brand-ink/50">
            The whole platform, and every action your admins have taken on it.
          </p>
        </div>
        <span className="flex items-center gap-2 rounded-full bg-brand-yellow-soft px-3 py-1.5 text-xs font-semibold text-yellow-800">
          <Eye size={13} strokeWidth={2} /> Super admin
        </span>
      </div>

      <p className="mt-5 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">People</p>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Customers" value={p.customers} to="/admin/customers" />
        <Stat label="Shoppers" value={p.shoppers} to="/admin/shoppers" />
        <Stat label="Suspended" value={p.suspended_users} tone={p.suspended_users ? 'warn' : 'ink'} />
        <Stat
          label="Staff"
          value={`${capacity.admins.used + capacity.superAdmins.used}`}
          to="/admin/staff"
        />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Trade</p>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Orders in flight" value={p.orders_in_flight} to="/admin/orders" />
        <Stat label="Orders, all time" value={p.orders} />
        <Stat label="Gross value" value={formatUgx(p.gmv_ugx)} />
        <Stat label="Platform revenue" value={formatUgx(p.revenue_ugx)} tone="good" />
      </div>

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Needs attention</p>
      <div className="mt-2 grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Open disputes" value={p.open_disputes} to="/admin/disputes"
          tone={p.open_disputes ? 'warn' : 'ink'} />
        <Stat label="Awaiting verification" value={p.pending_verifications} to="/admin/verifications"
          tone={p.pending_verifications ? 'warn' : 'ink'} />
        <Stat label="Owed to shoppers" value={formatUgx(p.owed_ugx)} to="/admin/finance"
          tone={Number(p.owed_ugx) > 0 ? 'warn' : 'ink'} />
        <Stat label="Admin places left" value={capacity.admins.limit - capacity.admins.used} to="/admin/staff" />
      </div>

      <GlassCard padding="lg" hover={false} className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
          What your staff have been doing
        </p>
        {staffActivity.length === 0 ? (
          <p className="mt-4 text-sm text-brand-ink/45">Nothing yet.</p>
        ) : (
          <div className="mt-3 flex flex-col">
            {staffActivity.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 border-b border-brand-green/5 py-2.5 last:border-0">
                <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                  a.admin_role === 'super_admin' ? 'bg-brand-yellow' : 'bg-brand-green/40'
                }`} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-brand-ink/80">{a.summary}</p>
                  <p className="mt-0.5 text-xs text-brand-ink/40">
                    {a.admin_name}
                    {a.admin_role === 'super_admin' && ' · super admin'}
                    {' · '}{a.action}{' · '}{formatDate(a.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
