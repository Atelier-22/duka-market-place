import { useCallback, useEffect, useState } from 'react';
import { Eye } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonStats } from '../../components/ui/Skeleton';
import { Empty, Panel, Pill, StatTile, formatDate, formatUgx } from './AdminDetailShell';

export function AdminGodViewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    () => api.get('/admin/god-view').then((r) => setData(r.data)).finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    load();
    const t = setInterval(load, 20_000);
    return () => clearInterval(t);
  }, [load]);

  if (loading && !data) {
    return (
      <SkeletonRegion label="Loading" className="pb-10">
        <SkeletonHeading />
        <div className="mt-6"><SkeletonStats /></div>
        <div className="mt-6"><SkeletonStats /></div>
      </SkeletonRegion>
    );
  }
  if (!data) {
    return (
      <div className="pb-10">
        <PageHeader title="Everything" />
        <EmptyState
          title="Could not load this page"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={() => { setLoading(true); load(); }}>Try again</Button>}
        />
      </div>
    );
  }

  const { platform: p, staffActivity, capacity } = data;

  return (
    <div className="pb-10">
      <PageHeader
        title="Everything"
        subtitle="The whole platform, and every action your admins have taken on it."
        actions={
          <Pill tone="warning">
            <Eye size={13} strokeWidth={2} /> Super admin
          </Pill>
        }
      />

      <div className="flex flex-col gap-6">
        <section>
          <SectionHeader title="People" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Customers" value={p.customers} to="/admin/customers" />
            <StatTile label="Shoppers" value={p.shoppers} to="/admin/shoppers" />
            <StatTile label="Suspended" value={p.suspended_users} tone={p.suspended_users ? 'danger' : 'default'} />
            <StatTile
              label="Staff"
              value={`${capacity.admins.used + capacity.superAdmins.used}`}
              to="/admin/staff"
            />
          </div>
        </section>

        <section>
          <SectionHeader title="Trade" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile label="Orders in flight" value={p.orders_in_flight} to="/admin/orders" />
            <StatTile label="Orders, all time" value={p.orders} />
            <StatTile label="Gross value" value={formatUgx(p.gmv_ugx)} />
            <StatTile label="Platform revenue" value={formatUgx(p.revenue_ugx)} tone="success" />
          </div>
        </section>

        <section>
          <SectionHeader title="Needs attention" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatTile
              label="Open disputes" value={p.open_disputes} to="/admin/disputes"
              tone={p.open_disputes ? 'danger' : 'default'}
            />
            <StatTile
              label="Awaiting verification" value={p.pending_verifications} to="/admin/verifications"
              tone={p.pending_verifications ? 'danger' : 'default'}
            />
            <StatTile
              label="Owed to shoppers" value={formatUgx(p.owed_ugx)} to="/admin/finance"
              tone={Number(p.owed_ugx) > 0 ? 'danger' : 'default'}
            />
            <StatTile label="Admin places left" value={capacity.admins.limit - capacity.admins.used} to="/admin/staff" />
          </div>
        </section>

        <Panel title="What your staff have been doing" count={staffActivity.length}>
          {staffActivity.length === 0 ? (
            <Empty title="Nothing yet" description="Admin actions will be listed here as they happen." />
          ) : (
            <ul className="flex flex-col">
              {staffActivity.map((a: any) => (
                <li key={a.id} className="flex items-start gap-3 border-b border-line py-3 last:border-0">
                  <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${
                    a.admin_role === 'super_admin' ? 'bg-brand-yellow' : 'bg-brand-green-fresh'
                  }`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-small text-ink">{a.summary}</p>
                    <p className="mt-0.5 text-caption text-ink-3">
                      {a.admin_name}
                      {a.admin_role === 'super_admin' && ' · super admin'}
                      {' · '}{a.action}{' · '}{formatDate(a.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
