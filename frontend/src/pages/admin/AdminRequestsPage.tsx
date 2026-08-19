import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';

export function AdminRequestsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/requests').then((r) => setRows(r.data.requests)).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Shopping requests</h1>
      <GlassCard hover={false} padding="sm" className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-green/10 text-left text-xs uppercase tracking-wide text-brand-ink/40">
              <th className="px-4 py-3">Title</th><th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Posted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-brand-green/5 last:border-0">
                <td className="px-4 py-3 font-medium">{r.title}</td>
                <td className="px-4 py-3 text-brand-ink/60">{r.customer_name}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3">{Number(r.budget_max_ugx).toLocaleString()} UGX</td>
                <td className="px-4 py-3 text-brand-ink/50">{new Date(r.created_at).toLocaleDateString('en-UG')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
