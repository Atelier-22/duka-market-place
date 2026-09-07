import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Megaphone, Plus, Trash2 } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { SellerProduct } from '../../market/types';
import { formatUgx } from '../../market/format';

export function SellerPromotionsPage() {
  usePageMeta({ title: 'Promotions', noindex: true });
  const { push } = useToast();
  const [promotions, setPromotions] = useState<any[] | null>(null);
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<'percentage' | 'fixed'>('percentage');
  const [value, setValue] = useState('10');
  const [endsAt, setEndsAt] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    Promise.all([api.get('/seller/promotions'), api.get('/seller/products?status=published&limit=200')])
      .then(([p, pr]) => { setPromotions(p.data.promotions); setProducts(pr.data.products); })
      .catch(() => setPromotions([]));
  }, []);
  useEffect(load, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (selected.length === 0) { push('Choose at least one product', 'error'); return; }
    setBusy(true);
    try {
      await api.post('/seller/promotions', { name: name.trim(), kind, value: Number(value), endsAt: endsAt ? new Date(endsAt).toISOString() : null, productIds: selected });
      push('Promotion is live', 'success');
      setOpen(false); setName(''); setSelected([]); setEndsAt('');
      load();
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  async function toggle(id: string, active: boolean) {
    try { await api.patch(`/seller/promotions/${id}`, { active }); load(); } catch (err) { push(apiErrorMessage(err), 'error'); }
  }
  async function remove(id: string) {
    try { await api.delete(`/seller/promotions/${id}`); push('Promotion removed', 'success'); load(); } catch (err) { push(apiErrorMessage(err), 'error'); }
  }

  if (!promotions) return <SkeletonRegion label="Loading promotions" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={3} /></div></SkeletonRegion>;
  const byId = new Map(products.map((p) => [p.id, p]));

  return (
    <div className="pb-10">
      <PageHeader title="Promotions" subtitle="Discounts across chosen products. Buyers see the lower price and the promotion name." actions={<Button size="sm" onClick={() => setOpen(true)} disabled={products.length === 0}><Plus size={15} /> New promotion</Button>} />
      {promotions.length === 0 ? (
        <EmptyState icon={<Megaphone />} title="No promotions yet" description={products.length === 0 ? 'Publish products first, then run a discount on them.' : 'Run a percentage or fixed discount on the products you choose.'} action={products.length > 0 ? <Button size="sm" onClick={() => setOpen(true)}>Create one</Button> : undefined} />
      ) : (
        <div className="flex flex-col gap-3">
          {promotions.map((p) => {
            const live = p.is_active && new Date(p.starts_at) <= new Date() && (!p.ends_at || new Date(p.ends_at) >= new Date());
            return (
              <Card key={p.id} padding="md">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 font-medium text-ink"><span className="truncate">{p.name}</span><span className={`rounded-full px-2 py-0.5 text-caption font-semibold ${live ? 'bg-brand-green-mist text-brand-green-deep' : 'bg-surface-2 text-ink-3'}`}>{live ? 'Live' : p.is_active ? 'Scheduled or ended' : 'Paused'}</span></p>
                    <p className="text-caption text-ink-3">{p.kind === 'percentage' ? `${p.value}% off` : `${formatUgx(p.value)} off`} · {p.product_ids.length} product{p.product_ids.length === 1 ? '' : 's'}{p.ends_at ? ` · ends ${new Date(p.ends_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}` : ''}</p>
                    <p className="mt-1 line-clamp-2 text-caption text-ink-2">{p.product_ids.map((id: string) => byId.get(id)?.name ?? 'Product').join(', ')}</p>
                  </div>
                  <div className="flex gap-2"><Button size="sm" variant="secondary" onClick={() => toggle(p.id, !p.is_active)}>{p.is_active ? 'Pause' : 'Resume'}</Button><Button size="sm" variant="tertiary" className="text-brand-red" onClick={() => remove(p.id)} aria-label="Delete promotion"><Trash2 size={15} /></Button></div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New promotion">
        <form onSubmit={create} className="flex flex-col gap-3">
          <Input label="Name buyers will see" placeholder="Weekend deal" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} required />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Type" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}><option value="percentage">Percentage off</option><option value="fixed">Fixed amount off</option></Select>
            <Input label={kind === 'percentage' ? 'Percent (1–90)' : 'Amount (UGX)'} type="number" inputMode="numeric" min={1} max={kind === 'percentage' ? 90 : undefined} value={value} onChange={(e) => setValue(e.target.value)} required />
          </div>
          <Input label="Ends (optional)" type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          <fieldset>
            <legend className="text-sm font-medium text-ink">Products</legend>
            <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-line">
              {products.map((p) => (
                <label key={p.id} className="flex min-h-[44px] cursor-pointer items-center gap-3 border-b border-line px-3 last:border-b-0"><input type="checkbox" checked={selected.includes(p.id)} onChange={(e) => setSelected((s) => e.target.checked ? [...s, p.id] : s.filter((x) => x !== p.id))} className="h-4 w-4 accent-brand-green" /><span className="min-w-0 flex-1 truncate text-sm text-ink">{p.name}</span><span className="text-caption text-ink-3">{formatUgx(p.sale_price_ugx ?? p.price_ugx)}</span></label>
              ))}
            </div>
          </fieldset>
          <div className="mt-2 flex justify-end gap-2"><Button type="button" variant="tertiary" onClick={() => setOpen(false)}>Cancel</Button><Button type="submit" disabled={busy}>Start promotion</Button></div>
        </form>
      </Modal>
    </div>
  );
}
