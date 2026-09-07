import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Check, Wallet } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { AdminTable, Td, Th, Tr, formatDate, formatUgx } from './AdminDetailShell';

type Tab = 'payouts' | 'payments';

export function AdminFinancePage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('payouts');
  const [payouts, setPayouts] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/payouts').then((r) => setPayouts(r.data.payouts)),
      api.get('/admin/payments').then((r) => setPayments(r.data.payments)),
    ]).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function pay(row: any) {
    const owed = Number(row.owed_ugx);
    if (!window.confirm(`Pay ${row.full_name} ${formatUgx(owed)} for ${row.owed_jobs} job(s)?\n\nThis cannot be undone from here.`)) return;
    setBusy(row.shopper_id);
    try {
      const res = await api.post(`/admin/payouts/${row.shopper_id}/pay`);
      push(`Paid ${formatUgx(res.data.paidUgx)} to ${row.full_name}`, 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function settle(p: any) {
    if (!window.confirm(`Mark ${formatUgx(p.amount_ugx)} from ${p.payer_name} as received?`)) return;
    setBusy(p.id);
    try {
      await api.post(`/admin/payments/${p.id}/settle`);
      push('Payment settled', 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <SkeletonRegion label="Loading" className="pb-10">
        <SkeletonHeading />
        <div className="mt-6"><SkeletonTable rows={6} cols={5} /></div>
      </SkeletonRegion>
    );
  }

  const totalOwed = payouts.reduce((s, p) => s + Number(p.owed_ugx), 0);
  const pending = payments.filter((p) => p.status === 'pending');
  const owedCount = payouts.filter((p) => Number(p.owed_ugx) > 0).length;

  return (
    <div className="pb-10">
      <PageHeader
        title="Finance"
        subtitle={`${formatUgx(totalOwed)} owed to shoppers · ${pending.length} payment${pending.length === 1 ? '' : 's'} awaiting settlement`}
      />

      <Tabs
        ariaLabel="Finance view"
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'payouts', label: 'Shopper payouts', count: owedCount },
          { value: 'payments', label: 'Customer payments', count: pending.length },
        ]}
      />

      {tab === 'payouts' && (
        payouts.length === 0 ? (
          <EmptyState
            icon={<Wallet />}
            title="No payouts yet"
            description="Shoppers are listed here once they have earnings to pay out."
          />
        ) : (
          <AdminTable
            caption="Shopper payouts"
            minWidth="min-w-[720px]"
            head={
              <>
                <Th>Shopper</Th>
                <Th align="right">Owed now</Th>
                <Th align="right">Paid to date</Th>
                <Th>Last paid</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </>
            }
          >
            {payouts.map((p) => {
              const owed = Number(p.owed_ugx);
              return (
                <Tr key={p.shopper_id}>
                  <Td>
                    <Link to={`/admin/shoppers/${p.shopper_id}`} className="font-medium text-brand-green-deep hover:underline">
                      {p.full_name}
                    </Link>
                    <span className="block text-caption text-ink-3">{p.phone}</span>
                  </Td>
                  <Td numeric className={owed > 0 ? 'font-semibold text-brand-green-deep' : 'text-ink-3'}>
                    {formatUgx(owed)}
                    {p.owed_jobs > 0 && <span className="block text-caption font-normal text-ink-3">{p.owed_jobs} job(s)</span>}
                  </Td>
                  <Td numeric muted>{formatUgx(p.paid_ugx)}</Td>
                  <Td muted className="whitespace-nowrap text-caption">
                    {p.last_paid_at ? formatDate(p.last_paid_at) : 'Never'}
                  </Td>
                  <Td align="right">
                    <Button
                      size="sm"
                      disabled={owed <= 0}
                      loading={busy === p.shopper_id}
                      onClick={() => pay(p)}
                    >
                      <Banknote size={16} strokeWidth={2} /> Pay out
                    </Button>
                  </Td>
                </Tr>
              );
            })}
          </AdminTable>
        )
      )}

      {tab === 'payments' && (
        payments.length === 0 ? (
          <EmptyState
            icon={<Wallet />}
            title="No payments yet"
            description="Customer payments are listed here as orders are placed."
          />
        ) : (
          <AdminTable
            caption="Customer payments"
            minWidth="min-w-[720px]"
            head={
              <>
                <Th>Customer</Th>
                <Th>For</Th>
                <Th align="right">Amount</Th>
                <Th>Status</Th>
                <Th align="right"><span className="sr-only">Actions</span></Th>
              </>
            }
          >
            {payments.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <span className="font-medium">{p.payer_name}</span>
                  <span className="block text-caption text-ink-3">{p.payer_phone}</span>
                </Td>
                <Td>
                  <Link to={`/admin/orders/${p.order_id}`} className="font-medium text-brand-green-deep hover:underline">
                    {p.request_title ?? `#${String(p.order_id).slice(0, 8)}`}
                  </Link>
                  <span className="block text-caption text-ink-3">{formatDate(p.created_at)}</span>
                </Td>
                <Td numeric className="font-semibold text-brand-green-deep">{formatUgx(p.amount_ugx)}</Td>
                <Td><StatusBadge status={p.status} /></Td>
                <Td align="right">
                  {p.status !== 'paid' && (
                    <Button size="sm" variant="secondary" loading={busy === p.id} onClick={() => settle(p)}>
                      <Check size={16} strokeWidth={2} /> Mark received
                    </Button>
                  )}
                </Td>
              </Tr>
            ))}
          </AdminTable>
        )
      )}
    </div>
  );
}
