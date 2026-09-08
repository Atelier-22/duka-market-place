import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, History, Package, PackagePlus, Search } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Modal } from '../../components/ui/Modal';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows, SkeletonStats } from '../../components/ui/Skeleton';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { useToast } from '../../components/ui/Toast';
import { compactUgx, timeAgo } from '../../market/format';

interface Variation { id: string; name: string; value: string; sku: string | null; color_name: string | null; color_hex: string | null; stock_quantity: number; reserved_quantity: number }
interface Item {
  id: string; name: string; sku: string | null; status: string; stock_quantity: number; reserved_quantity: number;
  low_stock_threshold: number; unit_price_ugx: number; image_url: string | null; variations: Variation[]; available: number;
}
interface Summary { products: number; lowStock: number; outOfStock: number; reserved: number; valueUgx: number }

export function SellerInventoryPage() {
  usePageMeta({ title: 'Inventory', noindex: true });
  const { push } = useToast();
  const [params] = useSearchParams();
  const [data, setData] = useState<{ items: Item[]; summary: Summary } | null>(null);
  const [q, setQ] = useState('');
  const [onlyLow, setOnlyLow] = useState(params.get('low') === '1');
  const [adjust, setAdjust] = useState<{ item: Item; variation: Variation | null } | null>(null);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState<'restock' | 'correction' | 'manual'>('restock');
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<{ item: Item; events: any[] } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api.get('/seller/inventory').then((r) => setData(r.data)).catch(() => setData({ items: [], summary: { products: 0, lowStock: 0, outOfStock: 0, reserved: 0, valueUgx: 0 } })); }, []);
  useEffect(load, [load]);

  useEffect(() => {
    const focus = params.get('product');
    if (focus && data) {
      const el = document.getElementById(`inv-${focus}`);
      el?.scrollIntoView({ block: 'center' });
    }
  }, [params, data]);

  async function submitAdjust(e: FormEvent) {
    e.preventDefault();
    if (!adjust) return;
    const n = Number(delta);
    if (!Number.isInteger(n) || n === 0) { push('Enter the change, for example 10 or -2', 'error'); return; }
    setBusy(true);
    try {
      await api.post('/seller/inventory/adjust', { productId: adjust.item.id, variationId: adjust.variation?.id ?? null, delta: n, reason, note: note.trim() || undefined });
      push('Stock updated', 'success');
      setAdjust(null); setDelta(''); setNote('');
      load();
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  async function openHistory(item: Item) {
    const res = await api.get(`/seller/products/${item.id}/inventory`).catch(() => ({ data: { events: [] } }));
    setHistory({ item, events: res.data.events });
  }

  if (!data) return <SkeletonRegion label="Loading inventory" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonStats /></div><div className="mt-6"><SkeletonRows count={5} /></div></SkeletonRegion>;

  const items = data.items.filter((i) => (!q.trim() || `${i.name} ${i.sku ?? ''}`.toLowerCase().includes(q.toLowerCase())) && (!onlyLow || i.available <= i.low_stock_threshold));
  const { summary } = data;

  return (
    <div className="pb-10">
      <PageHeader title="Inventory" subtitle="Live stock across every product and option. Reserved units belong to orders waiting to be delivered." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <DashboardStat label="Products tracked" value={String(summary.products)} icon={<Package />} />
        <DashboardStat label="Low stock" value={String(summary.lowStock)} icon={<AlertTriangle />} accent={summary.lowStock ? 'red' : 'green'} />
        <DashboardStat label="Out of stock" value={String(summary.outOfStock)} icon={<AlertTriangle />} accent={summary.outOfStock ? 'red' : 'green'} />
        <DashboardStat label="Stock value" value={compactUgx(summary.valueUgx)} icon={<PackagePlus />} accent="yellow" trend={summary.reserved ? `${summary.reserved} reserved` : undefined} />
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1"><span className="sr-only">Search inventory</span><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or SKU" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:shadow-focus" /></label>
        <label className="flex min-h-[44px] items-center gap-2.5 text-sm text-ink"><input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="h-4 w-4 rounded border-line-strong accent-brand-green" /> Low stock only</label>
      </div>

      <div className="mt-4">
        {items.length === 0 ? (
          <EmptyState icon={<Package />} title={data.items.length === 0 ? 'Nothing to track yet' : 'No products match'} description={data.items.length === 0 ? 'Add products and their stock shows up here.' : undefined} action={data.items.length === 0 ? <Link to="/seller/products/new"><Button size="sm">Add a product</Button></Link> : undefined} />
        ) : (
          <Card padding="none">
            <div className="hidden grid-cols-[1fr_90px_90px_90px_140px] gap-3 border-b border-line px-4 py-2 text-label font-semibold uppercase text-ink-3 md:grid"><span>Product</span><span className="text-right">Stock</span><span className="text-right">Reserved</span><span className="text-right">Available</span><span /></div>
            <ul className="divide-y divide-line">
              {items.map((i) => {
                const low = i.available <= i.low_stock_threshold;
                return (
                  <li key={i.id} id={`inv-${i.id}`} className="p-3 sm:p-4">
                    <div className="grid grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1fr_90px_90px_90px_140px]">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-11 w-11 shrink-0 overflow-hidden rounded-lg bg-surface-2">{i.image_url && <img src={i.image_url} alt="" className="h-full w-full object-cover" />}</span>
                        <span className="min-w-0"><Link to={`/seller/products/${i.id}/edit`} className="block truncate text-sm font-medium text-ink hover:text-brand-green">{i.name}</Link><span className="block text-caption text-ink-3">{i.sku ? `SKU ${i.sku} · ` : ''}{i.status}{low && <span className="ml-1 font-medium text-brand-red">· {i.available === 0 ? 'Out of stock' : 'Low'}</span>}</span></span>
                      </div>
                      <span className="hidden text-right text-sm tabular-nums text-ink md:block">{i.stock_quantity}</span>
                      <span className="hidden text-right text-sm tabular-nums text-ink-2 md:block">{i.reserved_quantity}</span>
                      <span className={`text-right text-sm font-semibold tabular-nums md:block ${low ? 'text-brand-red' : 'text-ink'}`}>{i.available}<span className="ml-1 text-caption font-normal text-ink-3 md:hidden">avail.</span></span>
                      <div className="col-span-2 flex justify-end gap-1.5 md:col-span-1">
                        <Button size="sm" variant="secondary" onClick={() => openHistory(i)} aria-label="Stock history"><History size={14} /></Button>
                        {i.variations.length === 0 && <Button size="sm" onClick={() => setAdjust({ item: i, variation: null })}>Adjust</Button>}
                      </div>
                    </div>
                    {i.variations.length > 0 && (
                      <ul className="mt-2 flex flex-col gap-1.5 border-l-2 border-line pl-3">
                        {i.variations.map((v) => {
                          const av = Math.max(0, Number(v.stock_quantity) - Number(v.reserved_quantity));
                          return (
                            <li key={v.id} className="flex items-center justify-between gap-3 text-sm">
                              <span className="flex min-w-0 items-center gap-2 truncate text-ink-2">{v.color_hex && <span className="h-4 w-4 shrink-0 rounded-full border border-black/10" style={{ background: v.color_hex }} aria-hidden />}{[v.value, v.color_name].filter(Boolean).join(' · ') || v.name}{v.sku ? <span className="text-ink-3"> · {v.sku}</span> : null}</span>
                              <span className="flex items-center gap-3"><span className={`tabular-nums ${av === 0 ? 'font-semibold text-brand-red' : 'text-ink'}`}>{av} avail.</span><Button size="sm" variant="secondary" onClick={() => setAdjust({ item: i, variation: v })}>Adjust</Button></span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      <Modal open={!!adjust} onClose={() => setAdjust(null)} title={adjust ? `Adjust ${adjust.item.name}${adjust.variation ? ` (${[adjust.variation.value, adjust.variation.color_name].filter(Boolean).join(' · ')})` : ''}` : ''}>
        <form onSubmit={submitAdjust} className="flex flex-col gap-3">
          <Input label="Change" type="number" inputMode="numeric" placeholder="10 to add, -2 to remove" value={delta} onChange={(e) => setDelta(e.target.value)} autoFocus />
          <Select label="Reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}><option value="restock">Restock</option><option value="correction">Count correction</option><option value="manual">Other</option></Select>
          <Input label="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
          <div className="mt-2 flex justify-end gap-2"><Button type="button" variant="tertiary" onClick={() => setAdjust(null)}>Cancel</Button><Button type="submit" disabled={busy}>Update stock</Button></div>
        </form>
      </Modal>

      <Modal open={!!history} onClose={() => setHistory(null)} title={history ? `History · ${history.item.name}` : ''}>
        {history && (history.events.length === 0 ? <p className="text-sm text-ink-3">No movements yet.</p> : (
          <ul className="max-h-[60vh] divide-y divide-line overflow-y-auto">
            {history.events.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <span className="min-w-0"><span className="block text-ink">{e.reason.replace(/_/g, ' ')}{e.variation_value ? ` · ${e.variation_value}` : ''}</span>{e.note && <span className="block text-caption text-ink-3">{e.note}</span>}<span className="block text-caption text-ink-3">{timeAgo(e.created_at)}</span></span>
                <span className={`shrink-0 font-semibold tabular-nums ${Number(e.delta) < 0 ? 'text-brand-red' : 'text-brand-green'}`}>{Number(e.delta) > 0 ? '+' : ''}{e.delta}<span className="ml-1 text-caption font-normal text-ink-3">→ {e.quantity_after}</span></span>
              </li>
            ))}
          </ul>
        ))}
      </Modal>
    </div>
  );
}
