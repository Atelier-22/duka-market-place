import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingState } from '../../components/ui/LoadingState';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function AdminCustomersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/customers').then((r) => setRows(r.data.customers)).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Customers</h1>
      <GlassCard hover={false} padding="sm" className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-green/10 text-left text-xs uppercase tracking-wide text-brand-ink/40">
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Orders</th><th className="px-4 py-3">Total spent</th><th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="border-b border-brand-green/5 last:border-0">
                <td className="px-4 py-3 font-medium">{c.full_name}</td>
                <td className="px-4 py-3 text-brand-ink/60">{c.phone}</td>
                <td className="px-4 py-3">{c.total_orders}</td>
                <td className="px-4 py-3">{formatUgx(Number(c.total_spent_ugx))}</td>
                <td className="px-4 py-3 text-brand-ink/50">{new Date(c.created_at).toLocaleDateString('en-UG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
