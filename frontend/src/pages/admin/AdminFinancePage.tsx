import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Banknote, Check } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { useToast } from '../../components/ui/Toast';
import { formatDate, formatUgx } from './AdminDetailShell';

type Tab = 'payouts' | 'payments';

/**
 * Money owed out, and money owed in.
 *
 * Both are irreversible from the UI, so both confirm first and both name the
 * exact figure in the confirmation — "pay this shopper" is not a sentence
 * anyone should agree to without seeing the number.
 */
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

  if (loading) return <LoadingState label="Loading the books…" />;

  const totalOwed = payouts.reduce((s, p) => s + Number(p.owed_ugx), 0);
  const pending = payments.filter((p) => p.status === 'pending');

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Finance</h1>
      <p className="mt-1 text-sm text-brand-ink/50">
        {formatUgx(totalOwed)} owed to shoppers · {pending.length} payment{pending.length === 1 ? '' : 's'} awaiting settlement
      </p>

      <div className="mt-5 flex gap-1 rounded-full border border-brand-green/15 p-1">
        {(['payouts', 'payments'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`flex-1 rounded-full px-3 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t ? 'bg-brand-green text-white' : 'text-brand-ink/55 hover:bg-brand-green-mist'
            }`}
          >
            {t === 'payouts' ? 'Shopper payouts' : 'Customer payments'}
          </button>
        ))}
      </div>

      {tab === 'payouts' && (
        <GlassCard padding="sm" hover={false} className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-green/10 text-left text-xs uppercase tracking-wide text-brand-ink/40">
                <th className="px-3 py-3">Shopper</th>
                <th className="px-3 py-3">Owed now</th>
                <th className="px-3 py-3">Paid to date</th>
                <th className="px-3 py-3">Last paid</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {payouts.map((p) => {
                const owed = Number(p.owed_ugx);
                return (
                  <tr key={p.shopper_id} className="border-b border-brand-green/5 last:border-0">
                    <td className="px-3 py-3">
                      <Link to={`/admin/shoppers/${p.shopper_id}`} className="font-medium text-brand-green-deep hover:underline">
                        {p.full_name}
                      </Link>
                      <span className="block text-xs text-brand-ink/40">{p.phone}</span>
                    </td>
                    <td className={`px-3 py-3 font-semibold ${owed > 0 ? 'text-brand-green-deep' : 'text-brand-ink/35'}`}>
                      {formatUgx(owed)}
                      {p.owed_jobs > 0 && <span className="block text-xs font-normal text-brand-ink/40">{p.owed_jobs} job(s)</span>}
                    </td>
                    <td className="px-3 py-3 text-brand-ink/60">{formatUgx(p.paid_ugx)}</td>
                    <td className="px-3 py-3 text-xs text-brand-ink/45">
                      {p.last_paid_at ? formatDate(p.last_paid_at) : 'Never'}
                    </td>
                    <td className="px-3 py-3 text-right">
                      <GlassButton
                        size="sm"
                        disabled={owed <= 0 || busy === p.shopper_id}
                        onClick={() => pay(p)}
                      >
                        <Banknote size={14} strokeWidth={2} />
                        {busy === p.shopper_id ? 'Paying…' : 'Pay out'}
                      </GlassButton>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </GlassCard>
      )}

      {tab === 'payments' && (
        <GlassCard padding="sm" hover={false} className="mt-5 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-green/10 text-left text-xs uppercase tracking-wide text-brand-ink/40">
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">For</th>
                <th className="px-3 py-3">Amount</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3" />
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-brand-green/5 last:border-0">
                  <td className="px-3 py-3">
                    <span className="font-medium text-brand-ink">{p.payer_name}</span>
                    <span className="block text-xs text-brand-ink/40">{p.payer_phone}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Link to={`/admin/orders/${p.order_id}`} className="text-brand-green-deep hover:underline">
                      {p.request_title ?? `#${String(p.order_id).slice(0, 8)}`}
                    </Link>
                    <span className="block text-xs text-brand-ink/40">{formatDate(p.created_at)}</span>
                  </td>
                  <td className="px-3 py-3 font-semibold text-brand-green-deep">{formatUgx(p.amount_ugx)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      p.status === 'paid'
                        ? 'bg-brand-green-mist text-brand-green-deep'
                        : 'bg-brand-yellow-soft text-yellow-800'
                    }`}>
                      {p.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {p.status !== 'paid' && (
                      <GlassButton size="sm" variant="secondary" disabled={busy === p.id} onClick={() => settle(p)}>
                        <Check size={14} strokeWidth={2} /> Mark received
                      </GlassButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      )}
    </div>
  );
}
