import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';

export function AdminShoppersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/shoppers').then((r) => setRows(r.data.shoppers)).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Shoppers</h1>
      <GlassCard hover={false} padding="sm" className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-green/10 text-left text-xs uppercase tracking-wide text-brand-ink/40">
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Verification</th><th className="px-4 py-3">Rating</th><th className="px-4 py-3">Jobs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => (
              <tr
                key={s.id}
                onClick={() => navigate(`/admin/shoppers/${s.id}`)}
                className="cursor-pointer border-b border-brand-green/5 transition-colors last:border-0 hover:bg-brand-green-mist/50"
              >
                <td className="px-4 py-3 font-medium">{s.full_name}</td>
                <td className="px-4 py-3 text-brand-ink/60">{s.phone}</td>
                <td className="px-4 py-3"><StatusBadge status={s.verification_status} /></td>
                <td className="px-4 py-3">{s.rating_avg || '—'} ★</td>
                <td className="px-4 py-3">{s.completed_jobs}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
