import { useCallback, useEffect, useState } from 'react';
import { Lightbulb, RefreshCw, Search } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { AdminTable, Pill, PillTone, StatTile, Td, Th, Tr, formatDate } from './AdminDetailShell';
import { categoryLabel } from '../../market/format';

type Tab = 'overview' | 'suggestions' | 'kinds' | 'attributes' | 'options' | 'colours' | 'brands' | 'observations' | 'audit';
type Entity = 'kind' | 'attribute' | 'option' | 'brand' | 'kind_attribute';

const TABS: { value: Tab; label: string }[] = [
  { value: 'overview', label: 'Overview' }, { value: 'suggestions', label: 'Suggestions' }, { value: 'kinds', label: 'Product kinds' }, { value: 'attributes', label: 'Attributes' },
  { value: 'options', label: 'Options' }, { value: 'colours', label: 'Colours' }, { value: 'brands', label: 'Brands' }, { value: 'observations', label: 'Observations' }, { value: 'audit', label: 'Audit' },
];

const STATUS_TONE: Record<string, PillTone> = { active: 'success', candidate: 'warning', rejected: 'danger', deprecated: 'neutral' };
const SOURCE_LABEL: Record<string, string> = { bootstrap: 'Built in', admin: 'Admin', seller_structured: 'Seller input', seller_description: 'Seller text', system_inference: 'Inferred' };

function pct(n: number | string | null | undefined) { return `${Math.round(Number(n ?? 0) * 100)}%`; }

export function AdminKnowledgePage() {
  usePageMeta({ title: 'Product intelligence · Admin', noindex: true });
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('overview');
  const [status, setStatus] = useState<'all' | 'active' | 'candidate' | 'rejected' | 'deprecated'>('all');
  const [q, setQ] = useState('');
  const [data, setData] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [explain, setExplain] = useState<any>(null);
  const [dialog, setDialog] = useState<{ entity: Entity; row: any; action: 'rename' | 'merge' | 'reject' | 'edit' } | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(() => {
    setData(null);
    const p = new URLSearchParams();
    if (status !== 'all') p.set('status', status);
    if (q.trim()) p.set('q', q.trim());
    const path = tab === 'colours' ? `/admin/knowledge/options?colours=1&${p}` : tab === 'overview' ? '/admin/knowledge/overview' : `/admin/knowledge/${tab}?${p}`;
    api.get(path).then((r) => setData(r.data)).catch((err) => { push(apiErrorMessage(err), 'error'); setData({}); });
  }, [tab, status, q, push, refreshKey]);
  useEffect(load, [load]);

  async function act(entity: Entity, id: string, action: string, body: Record<string, unknown> = {}) {
    setBusy(true);
    try {
      await api.post(`/admin/knowledge/${entity}/${id}/${action}`, body);
      push(action === 'approve' ? 'Approved and now suggested to sellers' : action === 'reject' ? 'Rejected. It will not be suggested.' : action === 'merge' ? 'Merged' : action === 'deprecate' ? 'Deprecated' : 'Saved', 'success');
      setDialog(null); setText(''); setReason(''); setExplain(null);
      setRefreshKey((k) => k + 1);
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  async function openExplain(entity: Entity, id: string) {
    try {
      const r = await api.get(`/admin/knowledge/explain?entity=${entity}&id=${id}`);
      setExplain(r.data);
    } catch (err) { push(apiErrorMessage(err), 'error'); }
  }

  function actions(entity: Entity, row: any) {
    return (
      <span className="flex flex-wrap items-center gap-1">
        <Button size="sm" variant="tertiary" onClick={() => openExplain(entity, row.id)}>Why</Button>
        {row.status === 'candidate' && <Button size="sm" onClick={() => act(entity, row.id, 'approve')} disabled={busy}>Approve</Button>}
        {row.status === 'candidate' && <Button size="sm" variant="tertiary" className="text-brand-red" onClick={() => setDialog({ entity, row, action: 'reject' })}>Reject</Button>}
        {row.status === 'active' && <Button size="sm" variant="tertiary" onClick={() => act(entity, row.id, 'deprecate')} disabled={busy}>Disable</Button>}
        {(row.status === 'deprecated' || row.status === 'rejected') && <Button size="sm" variant="tertiary" onClick={() => act(entity, row.id, 'reactivate')} disabled={busy}>Enable</Button>}
        {entity !== 'kind_attribute' && <Button size="sm" variant="tertiary" onClick={() => { setText(row.name ?? row.value ?? ''); setDialog({ entity, row, action: 'rename' }); }}>Rename</Button>}
        {entity !== 'kind_attribute' && <Button size="sm" variant="tertiary" onClick={() => { setText(''); setDialog({ entity, row, action: 'merge' }); }}>Merge</Button>}
      </span>
    );
  }

  const statusPill = (s: string) => <Pill tone={STATUS_TONE[s] ?? 'neutral'}>{s}</Pill>;
  const evidence = (row: any) => <span className="block text-caption text-ink-3">{row.observation_count ?? 0} seen · {row.seller_count ?? 0} sellers · {pct(row.confidence)} · {SOURCE_LABEL[row.source] ?? row.source}{row.last_observed_at ? ` · ${formatDate(row.last_observed_at)}` : ''}</span>;

  const listTabs: Tab[] = ['kinds', 'attributes', 'options', 'colours', 'brands', 'observations'];

  return (
    <div className="pb-10">
      <PageHeader title="Product intelligence" subtitle="What Duka knows about products, where it learned it, and what it is waiting for you to confirm." actions={<Button size="sm" variant="secondary" onClick={() => setRefreshKey((k) => k + 1)}><RefreshCw size={14} /> Refresh</Button>} />
      <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><Tabs ariaLabel="Knowledge sections" value={tab} onChange={(t) => { setTab(t); setData(null); }} items={TABS} /></div>
      {listTabs.includes(tab) && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
          {tab !== 'observations' && (
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} className="sm:w-44"><option value="all">All statuses</option><option value="active">Active</option><option value="candidate">Candidates</option><option value="rejected">Rejected</option><option value="deprecated">Disabled</option></Select>
          )}
          <label className="relative flex-1"><span className="sr-only">Search</span><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:shadow-focus" /></label>
        </div>
      )}

      <div className="mt-4">
        {!data ? <SkeletonRegion label="Loading"><SkeletonHeading subtitle={false} /><div className="mt-4"><SkeletonTable rows={6} cols={4} /></div></SkeletonRegion> : (
          <>
            {tab === 'overview' && data.observations && (
              <div className="flex flex-col gap-4">
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <StatTile label="Observations" value={String(data.observations.total)} sub={`${data.observations.week} this week · ${data.observations.products} products`} />
                  <StatTile label="Sellers teaching Duka" value={String(data.sellersObserved)} />
                  <StatTile label="Waiting for review" value={String((data.kinds?.candidate ?? 0) + (data.attributes?.candidate ?? 0) + (data.options?.candidate ?? 0) + (data.brands?.candidate ?? 0))} sub="Candidates across kinds, attributes, options and brands" tone={((data.kinds?.candidate ?? 0) + (data.options?.candidate ?? 0)) > 0 ? 'warning' : 'default'} />
                  <StatTile label="Promoted automatically" value={String(data.auditLast30Days?.promote ?? 0)} sub="Last 30 days" tone="success" />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <Card padding="lg">
                    <h2 className="font-display text-h3 font-medium text-brand-green-deep">Knowledge base</h2>
                    <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      {(['kinds', 'attributes', 'options', 'brands', 'kindAttributes'] as const).map((k) => (
                        <div key={k} className="rounded-xl bg-surface-2 p-3"><dt className="text-caption uppercase text-ink-3">{k === 'kindAttributes' ? 'Kind rules' : k}</dt><dd className="mt-1 text-ink">{data[k]?.active ?? 0} active · {data[k]?.candidate ?? 0} candidates{data[k]?.rejected ? ` · ${data[k].rejected} rejected` : ''}</dd></div>
                      ))}
                    </dl>
                  </Card>
                  <Card padding="lg">
                    <h2 className="font-display text-h3 font-medium text-brand-green-deep">How promotion works</h2>
                    <ul className="mt-3 flex flex-col gap-2 text-sm text-ink-2">
                      <li>A value (a size, a colour, a material) becomes a standard suggestion once <span className="font-medium text-ink">{data.rules.option.lowRisk.sellers} sellers</span> have used it in <span className="font-medium text-ink">{data.rules.option.lowRisk.observations} products</span> with confidence of at least {pct(data.rules.option.minConfidence)}. Less common attributes need {data.rules.option.other.sellers} sellers.</li>
                      <li>A new product kind is promoted after {data.rules.kind.sellers} sellers and {data.rules.kind.observations} products. A new attribute waits for {data.rules.attribute.sellers} sellers or your approval.</li>
                      <li>Only what sellers typed into structured fields counts fully. Values read out of descriptions carry lower confidence and never promote on their own.</li>
                      <li>Anything you reject stays rejected. Anything built in or approved by you keeps full confidence.</li>
                    </ul>
                  </Card>
                </div>
              </div>
            )}

            {tab === 'suggestions' && data.kinds && (
              <div className="flex flex-col gap-4">
                {[
                  { title: 'New product kinds', entity: 'kind' as Entity, rows: data.kinds, sub: (r: any) => `${categoryLabel(r.category)}${r.examples ? ` · e.g. ${r.examples}` : ''}${r.candidate_attributes ? ` · details seen: ${r.candidate_attributes}` : ''}` },
                  { title: 'New attributes', entity: 'attribute' as Entity, rows: data.attributes, sub: (r: any) => `${r.type}${r.examples ? ` · values: ${r.examples}` : ''}` },
                  { title: 'Attributes on a kind', entity: 'kind_attribute' as Entity, rows: data.kindAttributes, sub: (r: any) => `${r.kind_name} (${categoryLabel(r.category)})${r.examples ? ` · values: ${r.examples}` : ''}` },
                  { title: 'New values', entity: 'option' as Entity, rows: data.options, sub: (r: any) => `${r.attribute_name}${r.kind_name ? ` on ${r.kind_name}` : r.brand_slug ? ` for ${r.brand_slug}` : ''}` },
                  { title: 'New brands', entity: 'brand' as Entity, rows: data.brands, sub: (r: any) => r.categories ? `Seen in ${r.categories}` : '' },
                ].map((section) => (
                  <Card key={section.title} padding="none">
                    <div className="border-b border-line px-4 py-3"><h2 className="font-display text-h3 font-medium text-brand-green-deep">{section.title} <span className="text-sm font-normal text-ink-3">{section.rows.length}</span></h2></div>
                    {section.rows.length === 0 ? <p className="p-4 text-sm text-ink-3">Nothing waiting.</p> : (
                      <ul className="divide-y divide-line">
                        {section.rows.map((r: any) => (
                          <li key={r.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <span className="min-w-0"><span className="flex items-center gap-2 text-sm font-medium text-ink">{r.display_hex && <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: r.display_hex }} />}{r.name}</span><span className="block text-caption text-ink-2">{section.sub(r)}</span>{evidence(r)}</span>
                            {actions(section.entity, r)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            )}

            {tab === 'kinds' && (data.kinds?.length === 0 ? <EmptyState icon={<Lightbulb />} title="No product kinds match" /> : data.kinds && (
              <AdminTable caption="Product kinds" head={<><Th>Kind</Th><Th>Category</Th><Th>Status</Th><Th align="right">Rules</Th><Th align="right">Values</Th><Th>Actions</Th></>}>
                {data.kinds.map((k: any) => (
                  <Tr key={k.id}><Td className="font-medium"><span className="block">{k.name}</span><span className="block text-caption font-normal text-ink-3">Versions called {k.version_type ?? '—'}{k.examples ? ` · e.g. ${k.examples}` : ''}</span>{evidence(k)}</Td><Td>{categoryLabel(k.category)}</Td><Td>{statusPill(k.status)}</Td><Td numeric>{k.attribute_count}</Td><Td numeric>{k.option_count}</Td><Td>{actions('kind', k)}</Td></Tr>
                ))}
              </AdminTable>
            ))}

            {tab === 'attributes' && data.attributes && (
              <AdminTable caption="Attributes" head={<><Th>Attribute</Th><Th>Type</Th><Th>Status</Th><Th align="right">Kinds</Th><Th align="right">Values</Th><Th align="right">Products</Th><Th>Actions</Th></>}>
                {data.attributes.map((a: any) => (
                  <Tr key={a.id}><Td className="font-medium"><span className="block">{a.name} <span className="font-normal text-ink-3">· {a.key}</span></span>{evidence(a)}</Td><Td>{a.type}{a.unit ? ` (${a.unit})` : ''}</Td><Td>{statusPill(a.status)}</Td><Td numeric>{a.kind_count}</Td><Td numeric>{a.option_count}</Td><Td numeric>{a.product_count}</Td><Td>{actions('attribute', a)}</Td></Tr>
                ))}
              </AdminTable>
            )}

            {(tab === 'options' || tab === 'colours') && data.options && (
              <AdminTable caption={tab === 'colours' ? 'Colours' : 'Attribute values'} head={<><Th>Value</Th><Th>Attribute</Th><Th>Scope</Th><Th>Status</Th><Th>Actions</Th></>}>
                {data.options.map((o: any) => (
                  <Tr key={o.id}><Td className="font-medium"><span className="flex items-center gap-2">{o.display_hex && <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: o.display_hex }} />}{o.value}</span>{evidence(o)}</Td><Td>{o.attribute_name}</Td><Td>{o.kind_name ? `${o.kind_name} · ${categoryLabel(o.kind_category)}` : o.brand_slug ? `Brand: ${o.brand_slug}` : o.category ? categoryLabel(o.category) : 'Everywhere'}</Td><Td>{statusPill(o.status)}</Td><Td>{actions('option', o)}</Td></Tr>
                ))}
              </AdminTable>
            )}

            {tab === 'brands' && data.brands && (
              <AdminTable caption="Brands" head={<><Th>Brand</Th><Th>Categories</Th><Th>Status</Th><Th align="right">Colours</Th><Th>Actions</Th></>}>
                {data.brands.map((b: any) => (
                  <Tr key={b.id}><Td className="font-medium"><span className="block">{b.name}</span>{evidence(b)}</Td><Td>{(b.categories ?? []).map((c: any) => `${categoryLabel(c.category)}${c.observations ? ` (${c.observations})` : ''}`).join(', ') || '—'}</Td><Td>{statusPill(b.status)}</Td><Td numeric>{b.colour_count}</Td><Td>{actions('brand', b)}</Td></Tr>
                ))}
              </AdminTable>
            )}

            {tab === 'observations' && data.observations && (
              <AdminTable caption="Observations" head={<><Th>Seen</Th><Th>From product</Th><Th>Source</Th><Th>When</Th></>}>
                {data.observations.map((o: any) => (
                  <Tr key={o.id}><Td className="font-medium"><span className="flex items-center gap-2">{o.display_hex && <span className="h-4 w-4 rounded-full border border-black/10" style={{ background: o.display_hex }} />}{o.entity_type === 'option' ? `${o.attribute_key}: ${o.value}` : o.entity_type === 'attribute' ? `attribute ${o.value}` : `${o.entity_type} ${o.value}`}</span><span className="block text-caption font-normal text-ink-3">{categoryLabel(o.category)}{o.kind_name ? ` · ${o.kind_name}` : ''}{o.brand_slug ? ` · ${o.brand_slug}` : ''}</span></Td><Td><span className="block">{o.product_name}</span><span className="block text-caption text-ink-3">{o.store_name} · {o.product_status}</span></Td><Td>{SOURCE_LABEL[o.source] ?? o.source} · {pct(o.confidence)}</Td><Td>{formatDate(o.created_at)}</Td></Tr>
                ))}
              </AdminTable>
            )}

            {tab === 'audit' && data.audit && (
              <AdminTable caption="Knowledge audit" head={<><Th>Change</Th><Th>By</Th><Th>Detail</Th><Th>When</Th></>}>
                {data.audit.map((a: any) => (
                  <Tr key={a.id}><Td className="font-medium">{a.action} {a.entity_type}</Td><Td>{a.actor_type === 'system' ? 'Duka (rules)' : a.actor_name ?? 'Admin'}</Td><Td><span className="block text-caption text-ink-2">{a.reason ?? ''}</span><span className="block text-caption text-ink-3">{a.next?.name ?? a.next?.value ?? ''}{a.previous?.status && a.next?.status ? ` · ${a.previous.status} → ${a.next.status}` : ''}</span></Td><Td>{formatDate(a.created_at)}</Td></Tr>
                ))}
              </AdminTable>
            )}
          </>
        )}
      </div>

      <Modal open={!!explain} onClose={() => setExplain(null)} title={explain ? `Why Duka knows "${explain.row?.name ?? explain.row?.value ?? ''}"` : ''}>
        {explain && (
          <div className="flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-caption uppercase text-ink-3">Confidence</p><p className="text-lg font-semibold text-ink">{pct(explain.row.confidence)}</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-caption uppercase text-ink-3">Status</p><p className="text-lg font-semibold text-ink">{explain.row.status}</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-caption uppercase text-ink-3">Observed in</p><p className="text-lg font-semibold text-ink">{explain.summary?.products ?? 0} products</p></div>
              <div className="rounded-xl bg-surface-2 p-3"><p className="text-caption uppercase text-ink-3">Sources</p><p className="text-lg font-semibold text-ink">{explain.summary?.sellers ?? 0} sellers</p></div>
            </div>
            <p className="text-ink-2">Origin: {SOURCE_LABEL[explain.row.source] ?? explain.row.source}. {explain.summary?.first_observed_at ? `First seen ${formatDate(explain.summary.first_observed_at)}, last ${formatDate(explain.summary.last_observed_at)}.` : 'Not observed in any seller product yet.'}</p>
            {explain.sources?.length > 0 && <p className="text-ink-2">By source: {explain.sources.map((s: any) => `${SOURCE_LABEL[s.source] ?? s.source} ${s.n}`).join(' · ')}</p>}
            {explain.values?.length > 0 && <div><p className="text-caption uppercase text-ink-3">Common values</p><p className="text-ink">{explain.values.map((v: any) => `${v.value} (${v.n})`).join(' · ')}</p></div>}
            {explain.products?.length > 0 && <div><p className="text-caption uppercase text-ink-3">Example products</p><ul className="mt-1 flex flex-col gap-1">{explain.products.map((p: any) => <li key={p.id} className="text-ink">{p.name} <span className="text-ink-3">· {p.store_name} · {p.status}</span></li>)}</ul></div>}
            {explain.history?.length > 0 && <div><p className="text-caption uppercase text-ink-3">History</p><ul className="mt-1 flex flex-col gap-1">{explain.history.map((h: any) => <li key={h.id} className="text-ink-2">{formatDate(h.created_at)} · {h.action} by {h.actor_type === 'system' ? 'rules' : 'admin'}{h.reason ? ` · ${h.reason}` : ''}</li>)}</ul></div>}
          </div>
        )}
      </Modal>

      <Modal open={!!dialog} onClose={() => setDialog(null)} title={dialog ? `${dialog.action === 'rename' ? 'Rename' : dialog.action === 'merge' ? 'Merge' : 'Reject'} ${dialog.row.name ?? dialog.row.value ?? ''}` : ''}>
        {dialog && (
          <div className="flex flex-col gap-3">
            {dialog.action === 'rename' && <Input label="New name" value={text} onChange={(e) => setText(e.target.value)} maxLength={80} autoFocus />}
            {dialog.action === 'merge' && <Input label="Merge into (paste the id of the entry to keep)" value={text} onChange={(e) => setText(e.target.value)} hint="Everything learned about this entry moves to the one you keep, and the old name becomes a synonym." autoFocus />}
            {dialog.action === 'reject' && <p className="text-sm text-ink-2">It stays recorded, but Duka will never suggest it to sellers or promote it on its own.</p>}
            <Input label="Reason (optional)" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} />
            <div className="flex justify-end gap-2"><Button variant="tertiary" onClick={() => setDialog(null)}>Cancel</Button><Button disabled={busy || (dialog.action !== 'reject' && !text.trim())} onClick={() => act(dialog.entity, dialog.row.id, dialog.action, dialog.action === 'rename' ? { name: text.trim(), reason } : dialog.action === 'merge' ? { targetId: text.trim(), reason } : { reason })}>Confirm</Button></div>
          </div>
        )}
      </Modal>
    </div>
  );
}
