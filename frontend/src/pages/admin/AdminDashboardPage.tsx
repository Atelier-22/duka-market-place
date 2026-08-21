import { useEffect, useState } from 'react';
import { CheckCircle2, Coins, Package, Scale, SearchCheck, ShoppingBag, Users } from 'lucide-react';
import { api } from '../../services/api';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { LoadingState } from '../../components/ui/LoadingState';
import { GlassCard } from '../../components/ui/GlassCard';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function AdminDashboardPage() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/admin/dashboard').then((res) => setData(res.data)); }, []);
  if (!data) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Admin overview</h1>
      <p className="text-sm text-brand-ink/50">Platform-wide health at a glance.</p>

      <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Customers" value={String(data.customers)} icon={<Users size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Shoppers" value={String(data.shoppers)} icon={<ShoppingBag size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Active orders" value={String(data.activeOrders)} icon={<Package size={18} strokeWidth={1.75} />} accent="yellow" />
        <DashboardStat label="Completed today" value={String(data.completedToday)} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} />
        <DashboardStat label="GMV (completed)" value={formatUgx(data.grossMerchandiseValueUgx)} icon={<Coins size={18} strokeWidth={1.75} />} accent="yellow" />
        <DashboardStat label="Open disputes" value={String(data.openDisputes)} icon={<Scale size={18} strokeWidth={1.75} />} accent="red" />
        <DashboardStat label="Pending verifications" value={String(data.pendingVerifications)} icon={<SearchCheck size={18} strokeWidth={1.75} />} accent="yellow" />
      </div>

      <GlassCard hover={false} className="mt-8">
        <p className="text-sm text-brand-ink/60">
          This is Stage 1 of the admin panel. See <code>docs/ROADMAP.md</code> for the Stage 2 plan
          (Customers/Shoppers detail drilldowns, a full Notifications centre, and a Platform Settings editor).
        </p>
      </GlassCard>
    </div>
  );
}
