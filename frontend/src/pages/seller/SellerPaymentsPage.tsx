import { FormEvent, useEffect, useState } from 'react';
import { Coins, Wallet } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows, SkeletonStats } from '../../components/ui/Skeleton';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { useToast } from '../../components/ui/Toast';
import { compactUgx, formatUgx, timeAgo } from '../../market/format';

export function SellerPaymentsPage() {
  usePageMeta({ title: 'Payments', noindex: true });
  const { push } = useToast();
  const [data, setData] = useState<any | null>(null);
  const [form, setForm] = useState({ payoutMethod: 'mobile_money', payoutName: '', payoutPhone: '', payoutBank: '', payoutAccount: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/seller/payments').then((r) => {
      setData(r.data);
      const s = r.data.settings;
      setForm({ payoutMethod: s.payout_method, payoutName: s.payout_name ?? '', payoutPhone: s.payout_phone ?? '', payoutBank: s.payout_bank ?? '', payoutAccount: s.payout_account ?? '' });
    }).catch(() => setData({ settings: null, summary: null, recent: [] }));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.patch('/seller/settings', { payoutMethod: form.payoutMethod, payoutName: form.payoutName.trim() || null, payoutPhone: form.payoutPhone.trim() || null, payoutBank: form.payoutBank.trim() || null, payoutAccount: form.payoutAccount.trim() || null });
      push('Payout details saved', 'success');
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setSaving(false); }
  }

  if (!data) return <SkeletonRegion label="Loading payments" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonStats /></div><div className="mt-6"><SkeletonRows count={3} /></div></SkeletonRegion>;
  const s = data.summary;

  return (
    <div className="pb-10">
      <PageHeader title="Payments" subtitle="Customers pay you cash on delivery. This is your record of what you collected and what is on the way." />
      {s ? (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <DashboardStat label="Collected" value={compactUgx(s.collected_ugx)} icon={<Coins />} accent="yellow" trend={`${s.paid_orders} delivered order${Number(s.paid_orders) === 1 ? '' : 's'}`} />
          <DashboardStat label="Last 30 days" value={compactUgx(s.collected_30d_ugx)} icon={<Coins />} />
          <DashboardStat label="Expected" value={compactUgx(s.expected_ugx)} icon={<Wallet />} trend="Confirmed, not yet delivered" />
          <DashboardStat label="Refunded" value={compactUgx(s.refunded_ugx)} icon={<Wallet />} accent={Number(s.refunded_ugx) ? 'red' : 'green'} />
        </div>
      ) : null}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_360px]">
        <Card padding="lg">
          <SectionHeader title="Collected payments" />
          {data.recent.length === 0 ? <EmptyState size="sm" icon={<Coins />} title="Nothing collected yet" description="Delivered orders are listed here with what you received." /> : (
            <ul className="divide-y divide-line">
              {data.recent.map((o: any) => (
                <li key={o.id} className="flex items-center gap-3 py-2.5 text-sm"><span className="min-w-0 flex-1"><span className="block truncate text-ink">#{o.order_number} · {o.customer_name}</span><span className="block text-caption text-ink-3">{o.payment_method.replace(/_/g, ' ')} · {timeAgo(o.completed_at ?? o.created_at)}</span></span><span className="font-semibold tabular-nums text-ink">{formatUgx(o.total_ugx)}</span><StatusBadge status={o.payment_status} /></li>
              ))}
            </ul>
          )}
        </Card>
        <Card padding="lg">
          <SectionHeader title="Payout details" />
          <p className="mb-3 text-small text-ink-3">Kept for when Duka settles online payments to you. Cash on delivery goes straight to you today.</p>
          <form onSubmit={save} className="flex flex-col gap-3">
            <Select label="Method" value={form.payoutMethod} onChange={(e) => setForm((f) => ({ ...f, payoutMethod: e.target.value }))}><option value="mobile_money">Mobile money</option><option value="bank">Bank account</option></Select>
            <Input label="Name on the account" value={form.payoutName} onChange={(e) => setForm((f) => ({ ...f, payoutName: e.target.value }))} maxLength={120} />
            {form.payoutMethod === 'mobile_money' ? (
              <Input label="Mobile money number" type="tel" value={form.payoutPhone} onChange={(e) => setForm((f) => ({ ...f, payoutPhone: e.target.value }))} maxLength={30} />
            ) : (
              <><Input label="Bank" value={form.payoutBank} onChange={(e) => setForm((f) => ({ ...f, payoutBank: e.target.value }))} maxLength={120} /><Input label="Account number" value={form.payoutAccount} onChange={(e) => setForm((f) => ({ ...f, payoutAccount: e.target.value }))} maxLength={60} /></>
            )}
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save payout details'}</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
