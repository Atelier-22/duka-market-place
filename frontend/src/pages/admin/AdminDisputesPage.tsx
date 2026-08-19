import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

export function AdminDisputesPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.get('/disputes').then((r) => setRows(r.data.disputes)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function resolve(id: string, status: string, finalOrderStatus?: string) {
    try {
      await api.post(`/disputes/${id}/resolve`, { status, finalOrderStatus });
      push('Dispute resolved', 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Disputes</h1>
      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No disputes" description="All clear — no open disputes right now." />
        ) : (
          <div className="flex flex-col gap-4">
            {rows.map((d) => (
              <GlassCard key={d.id} hover={false}>
                <div className="flex items-center justify-between">
                  <p className="font-medium text-brand-green-deep">{d.reason}</p>
                  <StatusBadge status={d.status} />
                </div>
                <p className="mt-2 text-sm text-brand-ink/60">{d.description}</p>
                <p className="mt-2 text-xs text-brand-ink/40">Order #{d.order_id.slice(0, 8)} · Order status: {d.order_status}</p>
                {d.status === 'open' && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <GlassButton size="sm" onClick={() => resolve(d.id, 'resolved_customer', 'refunded')}>Side with customer (refund)</GlassButton>
                    <GlassButton size="sm" onClick={() => resolve(d.id, 'resolved_shopper', 'completed')}>Side with shopper (complete)</GlassButton>
                    <GlassButton size="sm" variant="secondary" onClick={() => resolve(d.id, 'closed')}>Close without action</GlassButton>
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
