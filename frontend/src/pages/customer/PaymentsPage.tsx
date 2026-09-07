import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Wallet } from 'lucide-react';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

const METHOD_LABEL: Record<string, string> = {
  cash_on_delivery: 'Cash on delivery',
  mobile_money: 'Mobile money',
  card: 'Card',
};

export function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  function load() {
    setFailed(false);
    api.get('/payments/mine')
      .then((res) => setPayments(res.data.payments))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }
  useEffect(load, []);

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader
        title="Payments"
        subtitle="Every payment tied to your orders."
        back="/app/settings"
        backLabel="Settings"
      />

      <Card className="mb-5 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green">
          <Wallet size={18} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">You pay on delivery</p>
          <p className="mt-0.5 text-small text-ink-2">
            Cash or mobile money, handed to your shopper when they arrive. The exact amount is shown before you approve a purchase.
          </p>
          <Link to="/app/settings/payment-methods" className="mt-2 inline-block text-sm font-medium text-brand-green hover:underline">
            Payment methods
          </Link>
        </div>
      </Card>

      {loading ? (
        <SkeletonRegion label="Loading your payments"><SkeletonRows count={4} /></SkeletonRegion>
      ) : failed ? (
        <EmptyState
          title="We couldn't load your payments"
          description="Check your connection and try again."
          action={<Button size="sm" onClick={() => { setLoading(true); load(); }}>Try again</Button>}
        />
      ) : payments.length === 0 ? (
        <EmptyState
          icon={<CreditCard strokeWidth={1.5} />}
          title="No payments yet"
          description="A payment appears here the moment you approve a purchase on an order."
        />
      ) : (
        <Card padding="none">
          {payments.map((p) => (
            <Link
              key={p.id}
              to={`/app/orders/${p.order_id}`}
              className="flex min-h-[64px] items-center justify-between gap-3 border-b border-line px-4 py-3 transition-colors last:border-0 hover:bg-surface-2"
            >
              <div className="min-w-0">
                <p className="font-medium tabular-nums text-ink">{formatUgx(p.amount_ugx)}</p>
                <p className="mt-0.5 truncate text-caption text-ink-3">
                  {METHOD_LABEL[p.method] ?? String(p.method).replace(/_/g, ' ')} · Order #{p.order_id.slice(0, 8)}
                  {p.created_at ? ` · ${new Date(p.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}` : ''}
                </p>
              </div>
              <StatusBadge status={p.status} />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
