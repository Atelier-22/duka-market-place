import { useCallback, useEffect, useState } from 'react';
import { ExternalLink, Search, Sparkles } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { AdminTable, Pill, PillTone, Td, Th, Tr, formatDate } from './AdminDetailShell';
import { CategoryOptions } from '../../components/market/CategoryOptions';
import { categoryLabel } from '../../market/format';

const SPEC_TONE: Record<string, PillTone> = { verified: 'success', pending: 'warning', conflict: 'danger', rejected: 'neutral' };
const TIER_LABEL: Record<number, string> = { 1: 'manufacturer', 2: 'retailer', 3: 'web', 4: 'seller' };
const pct = (n: number | string | null | undefined) => `${Math.round(Number(n ?? 0) * 100)}%`;

export function CanonicalProductsTab() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  const [q, setQ] = useState('');
  const [review, setReview] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ brand: '', model: '', category: 'phones' });
  const [busy, setBusy] = useState(false);
  const [researchConfigured, setResearchConfigured] = useState(true);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (review) p.set('needsReview', '1');
    api.get(`/admin/knowledge/products?${p}`).then((r) => { setRows(r.data.products); setResearchConfigured(r.data.researchConfigured); }).catch(() => setRows([]));
  }, [q, review]);
  useEffect(load, [load]);

  async function create() {
    setBusy(true);
    try {
      const r = await api.post('/admin/knowledge/products', draft);
      push('Product added. Add its specifications.', 'success');
      setAdding(false); setDraft({ brand: '', model: '', category: 'phones' });
      load();
      setOpen(r.data.product.id);
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  return (
    <div>
      {!researchConfigured && <p className="mb-3 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">Web research is off: no TAVILY_API_KEY on the server. Specs come from admins and from what sellers enter, which still flows through review.</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1"><span className="sr-only">Search products</span><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Brand or model" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:shadow-focus" /></label>
        <label className="flex min-h-[44px] items-center gap-2.5 text-sm text-ink"><input type="checkbox" checked={review} onChange={(e) => setReview(e.target.checked)} className="h-4 w-4 rounded border-line-strong accent-brand-green" /> Needs review only</label>
        <Button size="sm" onClick={() => setAdding(true)}>Add a product</Button>
      </div>
      <div className="mt-4">
        {!rows ? <SkeletonRegion label="Loading"><SkeletonHeading subtitle={false} /><div className="mt-4"><SkeletonTable rows={6} cols={5} /></div></SkeletonRegion> : rows.length === 0 ? (
          <EmptyState icon={<Sparkles />} title="No products known yet" description="Products appear here when a seller lists something with a brand and model, or when you add one." />
        ) : (
          <AdminTable caption="Canonical products" head={<><Th>Product</Th><Th>Category</Th><Th align="right">Verified</Th><Th align="right">Pending</Th><Th align="right">Conflicts</Th><Th align="right">Corrections</Th><Th>Research</Th><Th align="right">Listings</Th></>}>
            {rows.map((p) => (
              <Tr key={p.id} onClick={() => setOpen(p.id)} className="cursor-pointer">
                <Td className="font-medium">{p.display_name}<span className="block text-caption font-normal text-ink-3">Added by {p.created_by} · {formatDate(p.created_at)}</span></Td>
                <Td>{categoryLabel(p.category)}</Td><Td numeric>{p.verified_specs}</Td><Td numeric>{p.pending_specs}</Td>
                <Td numeric>{p.conflict_specs > 0 ? <Pill tone="danger">{p.conflict_specs}</Pill> : 0}</Td>
                <Td numeric>{p.pending_corrections > 0 ? <Pill tone="warning">{p.pending_corrections}</Pill> : 0}</Td>
                <Td>{p.research_status ?? '—'}</Td><Td numeric>{p.listing_count}</Td>
              </Tr>
            ))}
          </AdminTable>
        )}
      </div>
      <Modal open={adding} onClose={() => setAdding(false)} title="Add a product Duka should know">
        <div className="flex flex-col gap-3">
          <Input label="Brand" value={draft.brand} onChange={(e) => setDraft((d) => ({ ...d, brand: e.target.value }))} autoFocus />
          <Input label="Model" value={draft.model} onChange={(e) => setDraft((d) => ({ ...d, model: e.target.value }))} />
          <Select label="Category" value={draft.category} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}><CategoryOptions /></Select>
          <div className="flex justify-end gap-2"><Button variant="tertiary" onClick={() => setAdding(false)}>Cancel</Button><Button disabled={busy || draft.brand.trim().length < 1 || draft.model.trim().length < 2} onClick={create}>Add</Button></div>
        </div>
      </Modal>
      {open && <CanonicalProductDialog id={open} onClose={() => { setOpen(null); load(); }} />}
    </div>
  );
}

export function CanonicalProductDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const { push } = useToast();
  const [data, setData] = useState<any>(null);
  const [edit, setEdit] = useState<{ key: string; label: string; value: string; unit: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => { api.get(`/admin/knowledge/products/${id}`).then((r) => setData(r.data)).catch((err) => { push(apiErrorMessage(err), 'error'); onClose(); }); }, [id, push, onClose]);
  useEffect(load, [load]);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try { await fn(); push(label, 'success'); setEdit(null); load(); } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  const sourcesFor = (key: string) => (data?.sources ?? []).filter((s: any) => s.attribute_key === key);

  return (
    <Modal open onClose={onClose} title={data ? data.product.display_name : 'Product'}>
      {!data ? <SkeletonRegion label="Loading"><SkeletonTable rows={4} cols={3} /></SkeletonRegion> : (
        <div className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1 text-sm">
          <div className="flex flex-wrap items-center gap-2 text-caption text-ink-3">
            <span>{categoryLabel(data.product.category)}</span><span>·</span><span>{data.product.listing_count} listing{data.product.listing_count === 1 ? '' : 's'}</span><span>·</span>
            <span>{data.product.researched_at ? `Researched ${formatDate(data.product.researched_at)}` : 'Not researched'}</span>
            <Button size="sm" variant="secondary" disabled={busy || !data.researchConfigured} onClick={() => run('Research queued', () => api.post(`/admin/knowledge/products/${id}/research`))}>Research now</Button>
            {!data.researchConfigured && <span>(research is off: no TAVILY_API_KEY)</span>}
          </div>

          {data.corrections.filter((c: any) => c.status === 'pending').length > 0 && (
            <Card padding="md" tone="danger">
              <p className="font-semibold text-ink">Seller corrections waiting for review</p>
              <ul className="mt-2 flex flex-col gap-2">
                {data.corrections.filter((c: any) => c.status === 'pending').map((c: any) => (
                  <li key={c.id} className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                    <span><span className="font-medium text-ink">{c.label}</span>: Duka has <span className="text-ink">{c.canonical_value ?? '—'}</span>, {c.seller_name ?? 'a seller'} says <span className="text-ink">{c.proposed_value}</span><span className="block text-caption text-ink-3">{formatDate(c.created_at)}</span></span>
                    <span className="flex gap-1"><Button size="sm" disabled={busy} onClick={() => run('Correction applied', () => api.post(`/admin/knowledge/corrections/${c.id}/approve`))}>Approve</Button><Button size="sm" variant="tertiary" className="text-brand-red" disabled={busy} onClick={() => run('Correction rejected', () => api.post(`/admin/knowledge/corrections/${c.id}/reject`))}>Reject</Button></span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <div>
            <div className="flex items-center justify-between"><p className="font-semibold text-ink">Specifications</p><Button size="sm" variant="secondary" onClick={() => setEdit({ key: '', label: '', value: '', unit: '' })}>Add a spec</Button></div>
            {data.specs.length === 0 && <p className="mt-2 text-ink-3">Nothing verified yet. Price is never stored here; sellers set it per listing.</p>}
            <ul className="mt-2 divide-y divide-line">
              {data.specs.map((s: any) => (
                <li key={s.id} className="flex flex-col gap-1 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span><span className="font-medium text-ink">{s.label}</span>: <span className="text-ink">{s.value}</span> <Pill tone={SPEC_TONE[s.status] ?? 'neutral'}>{s.status}</Pill> <span className="text-caption text-ink-3">{pct(s.confidence)} · {s.source_count} source{s.source_count === 1 ? '' : 's'}{s.best_tier ? ` · best ${TIER_LABEL[s.best_tier]}` : ''}{s.locked_by_admin ? ' · set by admin' : ''}</span></span>
                    <span className="flex gap-1">
                      <Button size="sm" variant="tertiary" onClick={() => setEdit({ key: s.attribute_key, label: s.label, value: s.value, unit: s.unit ?? '' })}>Edit</Button>
                      {s.status !== 'rejected' && <Button size="sm" variant="tertiary" disabled={busy} onClick={() => run('Spec rejected', () => api.post(`/admin/knowledge/products/${id}/specs/${s.attribute_key}/reject`))}>Reject</Button>}
                      <Button size="sm" variant="tertiary" className="text-brand-red" disabled={busy} onClick={() => run('Spec removed', () => api.delete(`/admin/knowledge/products/${id}/specs/${s.attribute_key}`))}>Remove</Button>
                    </span>
                  </div>
                  {s.status === 'conflict' && data.alternatives[s.attribute_key] && (
                    <p className="text-caption text-ink-2">Sources disagree: {data.alternatives[s.attribute_key].map((a: any) => `${a.value} (${pct(a.confidence)}, ${a.count})`).join(' · ')}</p>
                  )}
                  <ul className="flex flex-col gap-0.5 text-caption text-ink-3">
                    {sourcesFor(s.attribute_key).slice(0, 6).map((src: any) => (
                      <li key={src.id} className="flex items-center gap-1.5">
                        <span className="rounded-full bg-surface-2 px-1.5">{src.source_type}</span><span>{src.value}</span>
                        {src.source_url && <a href={src.source_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-brand-green">{(() => { try { return new URL(src.source_url).hostname; } catch { return src.source_url; } })()} <ExternalLink size={10} /></a>}
                        <span>{formatDate(src.observed_at)}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          {edit && (
            <Card padding="md">
              <p className="font-semibold text-ink">{edit.key ? `Set ${edit.label}` : 'Add a specification'}</p>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                <Input label="Detail" value={edit.label} onChange={(e) => setEdit((x) => x && ({ ...x, label: e.target.value }))} disabled={!!edit.key} />
                <Input label="Value" value={edit.value} onChange={(e) => setEdit((x) => x && ({ ...x, value: e.target.value }))} autoFocus />
                <Input label="Unit (optional)" value={edit.unit} onChange={(e) => setEdit((x) => x && ({ ...x, unit: e.target.value }))} />
              </div>
              <p className="mt-2 text-caption text-ink-3">Admin values are verified at 100% and lock the field against automatic changes.</p>
              <div className="mt-2 flex justify-end gap-2"><Button size="sm" variant="tertiary" onClick={() => setEdit(null)}>Cancel</Button><Button size="sm" disabled={busy || !edit.label.trim() || !edit.value.trim()} onClick={() => run('Specification saved', () => api.put(`/admin/knowledge/products/${id}/specs`, { key: edit.key || undefined, label: edit.label, value: edit.value, unit: edit.unit || null }))}>Save</Button></div>
            </Card>
          )}

          {data.jobs.length > 0 && (
            <div>
              <p className="font-semibold text-ink">Research runs</p>
              <ul className="mt-1 text-caption text-ink-3">{data.jobs.map((j: any) => <li key={j.id}>{formatDate(j.created_at)} · {j.status}{j.status === 'done' ? ` · ${j.results_count} results, ${j.specs_found} specs` : ''}{j.error ? ` · ${j.error}` : ''}</li>)}</ul>
            </div>
          )}
          {data.listings.length > 0 && (
            <div>
              <p className="font-semibold text-ink">Listings using this product</p>
              <ul className="mt-1 text-caption text-ink-2">{data.listings.map((l: any) => <li key={l.id}>{l.name} <span className="text-ink-3">· {l.store_name} · {l.status}</span></li>)}</ul>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export function CorrectionsTab() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.get(`/admin/knowledge/corrections?status=${status}`).then((r) => setRows(r.data.corrections)).catch(() => setRows([])); }, [status]);
  useEffect(load, [load]);
  async function decide(id: string, action: 'approve' | 'reject') {
    setBusy(true);
    try { await api.post(`/admin/knowledge/corrections/${id}/${action}`); push(action === 'approve' ? 'Correction applied to the product' : 'Correction rejected', 'success'); load(); } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }
  return (
    <div>
      <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-48"><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="all">All</option></Select>
      <div className="mt-4">
        {!rows ? <SkeletonRegion label="Loading"><SkeletonTable rows={5} cols={4} /></SkeletonRegion> : rows.length === 0 ? <EmptyState icon={<Sparkles />} title="No corrections here" description="When a seller enters a different value from what Duka has, it shows up here for review." /> : (
          <AdminTable caption="Seller corrections" head={<><Th>Product</Th><Th>Detail</Th><Th>Duka has</Th><Th>Seller says</Th><Th>Sellers</Th><Th>Status</Th><Th>Actions</Th></>}>
            {rows.map((c) => (
              <Tr key={c.id}>
                <Td className="font-medium">{c.display_name}<span className="block text-caption font-normal text-ink-3">{categoryLabel(c.category)}</span></Td>
                <Td>{c.label}</Td><Td>{c.canonical_value ?? '—'}</Td><Td className="font-medium">{c.proposed_value}<span className="block text-caption font-normal text-ink-3">{c.seller_name ?? 'seller'} · {formatDate(c.created_at)}</span></Td>
                <Td>{c.agreeing_sellers}</Td>
                <Td><Pill tone={c.status === 'pending' ? 'warning' : c.status === 'approved' ? 'success' : 'neutral'}>{c.status}{c.status === 'approved' && !c.decided_by ? ' (auto)' : ''}</Pill></Td>
                <Td>{c.status === 'pending' && <span className="flex gap-1"><Button size="sm" disabled={busy} onClick={() => decide(c.id, 'approve')}>Approve</Button><Button size="sm" variant="tertiary" className="text-brand-red" disabled={busy} onClick={() => decide(c.id, 'reject')}>Reject</Button></span>}</Td>
              </Tr>
            ))}
          </AdminTable>
        )}
      </div>
    </div>
  );
}

export function DataQualityCard() {
  const [data, setData] = useState<any>(null);
  useEffect(() => { api.get('/admin/knowledge/quality').then((r) => setData(r.data)).catch(() => setData({ fields: [], categories: [], totals: null })); }, []);
  if (!data) return null;
  return (
    <Card padding="lg">
      <h2 className="font-display text-h3 font-medium text-brand-green-deep">Product data quality</h2>
      {data.totals && (
        <p className="mt-2 text-sm text-ink-2">{data.totals.products} known products · {data.totals.verified} verified specs · {data.totals.pending} pending · {data.totals.conflicts} in conflict · {data.totals.pending_corrections} corrections waiting · {data.totals.auto_promoted} promoted by seller agreement. Research: {data.totals.research_done} done, {data.totals.research_skipped} skipped, {data.totals.research_failed} failed{data.researchConfigured ? '' : ' (web research is off: no TAVILY_API_KEY)'}.</p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-caption font-semibold uppercase text-ink-3">Most corrected fields</p>
          {data.fields.length === 0 ? <p className="mt-1 text-sm text-ink-3">No corrections yet.</p> : <ul className="mt-1 flex flex-col gap-1 text-sm text-ink">{data.fields.map((f: any) => <li key={f.attribute_key}>{f.label} <span className="text-ink-3">· {f.corrections} corrections from {f.sellers} sellers, {f.approved} approved</span></li>)}</ul>}
        </div>
        <div>
          <p className="text-caption font-semibold uppercase text-ink-3">Most corrected categories</p>
          {data.categories.length === 0 ? <p className="mt-1 text-sm text-ink-3">No corrections yet.</p> : <ul className="mt-1 flex flex-col gap-1 text-sm text-ink">{data.categories.map((c: any) => <li key={c.category}>{categoryLabel(c.category)} <span className="text-ink-3">· {c.corrections} corrections on {c.products} products</span></li>)}</ul>}
        </div>
      </div>
      <p className="mt-3 text-caption text-ink-3">A signal about where product data is weakest, not a judgement of sellers.</p>
    </Card>
  );
}
