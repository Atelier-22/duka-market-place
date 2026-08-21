import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/orders').then((r) => setRows(r.data.orders)).finally(() => setLoading(false)); }, []);
  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Orders</h1>
      <GlassCard hover={false} padding="sm" className="mt-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-green/10 text-left text-xs uppercase tracking-wide text-brand-ink/40">
              <th className="px-4 py-3">Order</th><th className="px-4 py-3">Customer</th><th className="px-4 py-3">Shopper</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3">Total</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr
                key={o.id}
                onClick={() => navigate(`/admin/orders/${o.id}`)}
                className="cursor-pointer border-b border-brand-green/5 transition-colors last:border-0 hover:bg-brand-green-mist/50"
              >
                <td className="px-4 py-3 font-mono text-xs">{o.id.slice(0, 8)}</td>
                <td className="px-4 py-3">{o.customer_name}</td>
                <td className="px-4 py-3">{o.shopper_name}</td>
                <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-3">{o.total_amount_ugx ? Number(o.total_amount_ugx).toLocaleString() + ' UGX' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
