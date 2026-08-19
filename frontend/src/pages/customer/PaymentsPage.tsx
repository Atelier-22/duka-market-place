import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/payments/mine').then((res) => setPayments(res.data.payments)).finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Payments</h1>
      <p className="mt-1 text-sm text-brand-ink/50">Every payment tied to your orders, with full status history.</p>

      <div className="mt-6">
        {payments.length === 0 ? (
          <EmptyState title="No payments yet" description="Payments will appear here once you approve a purchase." />
        ) : (
          <div className="flex flex-col gap-3">
            {payments.map((p) => (
              <GlassCard key={p.id} hover={false} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-brand-ink">{formatUgx(p.amount_ugx)}</p>
                  <p className="text-xs text-brand-ink/45 capitalize">{p.method.replace(/_/g, ' ')} · Order #{p.order_id.slice(0, 8)}</p>
                </div>
                <StatusBadge status={p.status} />
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
