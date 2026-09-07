import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ExternalLink, Package, Search } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { Tabs } from '../../components/ui/Tabs';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { AdminTable, Pill, Td, Th, Tr, formatUgx } from './AdminDetailShell';
import { categoryLabel } from '../../market/format';

type Filter = 'all' | 'published' | 'draft' | 'flagged' | 'out_of_stock' | 'archived';

export function AdminSellerProductsPage() {
  usePageMeta({ title: 'Seller products · Admin', noindex: true });
  const { push } = useToast();
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState<{ kind: 'unpublish' | 'flag'; product: any } | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    const p = new URLSearchParams({ status: filter });
    if (q.trim()) p.set('q', q.trim());
    api.get(`/admin/sellers/products?${p.toString()}`).then((r) => setRows(r.data.products)).catch(() => setRows([]));
  }, [filter, q]);
  useEffect(load, [load]);

  async function act(kind: 'unpublish' | 'flag' | 'unflag', product: any) {
    setBusy(true);
    try {
      if (kind === 'unflag') await api.post(`/admin/sellers/products/${product.id}/unflag`);
      else await api.post(`/admin/sellers/products/${product.id}/${kind}`, { reason: reason.trim() });
      push(kind === 'unflag' ? 'Flag cleared' : kind === 'flag' ? 'Product flagged and hidden' : 'Product unpublished', 'success');
      setModal(null); setReason(''); load();
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  return (
    <div className="pb-10">
      <PageHeader title="Seller products" subtitle="Every product on the marketplace, published or not. Flag or unpublish anything that breaks the rules." actions={<Link to="/admin/sellers" className="text-sm font-medium text-brand-green">Sellers</Link>} />
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs ariaLabel="Product filter" value={filter} onChange={setFilter} className="flex-1" items={[{ value: 'all', label: 'All' }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }, { value: 'out_of_stock', label: 'Out of stock' }, { value: 'flagged', label: 'Flagged' }, { value: 'archived', label: 'Archived' }]} />
        <label className="relative lg:w-64"><span className="sr-only">Search products</span><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Product, store, brand" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:shadow-focus" /></label>
      </div>
      <div className="mt-4">
        {!rows ? <SkeletonRegion label="Loading"><SkeletonHeading subtitle={false} /><div className="mt-4"><SkeletonTable rows={6} cols={6} /></div></SkeletonRegion> : rows.length === 0 ? (
          <EmptyState icon={<Package />} title="No products here" />
        ) : (
          <AdminTable caption="Seller products" head={<><Th>Product</Th><Th>Store</Th><Th>Status</Th><Th align="right">Price</Th><Th align="right">Stock</Th><Th align="right">Sold</Th><Th>Actions</Th></>}>
            {rows.map((p) => (
              <Tr key={p.id}>
                <Td className="font-medium"><span className="flex items-center gap-2"><span className="h-9 w-9 shrink-0 overflow-hidden rounded-lg bg-surface-2">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</span><span className="min-w-0"><span className="block truncate">{p.name}</span><span className="block text-caption font-normal text-ink-3">{categoryLabel(p.category)} · {p.condition}</span></span></span></Td>
                <Td><Link to={`/admin/sellers/${p.seller_id}`} className="hover:text-brand-green">{p.store_name}</Link></Td>
                <Td><span className="flex items-center gap-1.5"><StatusBadge status={p.status} />{p.flagged_at && <Pill tone="danger">Flagged</Pill>}</span></Td>
                <Td numeric>{formatUgx(Number(p.sale_price_ugx ?? p.price_ugx))}</Td>
                <Td numeric>{p.available}</Td>
                <Td numeric>{p.sales_count}</Td>
                <Td><span className="flex items-center gap-1">
                  {p.status === 'published' && <Link to={`/product/${p.id}`} target="_blank" rel="noreferrer" className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-brand-green" aria-label="View"><ExternalLink size={14} /></Link>}
                  {p.status === 'published' && <Button size="sm" variant="tertiary" onClick={() => setModal({ kind: 'unpublish', product: p })}>Unpublish</Button>}
                  {p.flagged_at ? <Button size="sm" variant="tertiary" onClick={() => act('unflag', p)} disabled={busy}>Clear flag</Button> : <Button size="sm" variant="tertiary" className="text-brand-red" onClick={() => setModal({ kind: 'flag', product: p })}>Flag</Button>}
                </span></Td>
              </Tr>
            ))}
          </AdminTable>
        )}
      </div>
      <Modal open={!!modal} onClose={() => setModal(null)} title={modal?.kind === 'flag' ? `Flag ${modal.product.name}` : `Unpublish ${modal?.product.name ?? ''}`}>
        <p className="text-sm text-ink-2">{modal?.kind === 'flag' ? 'Hidden from the marketplace until the flag is cleared. The seller is told why.' : 'Back to draft. The seller is told why and can republish once fixed.'}</p>
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="Reason" autoFocus />
        <div className="mt-4 flex justify-end gap-2"><Button variant="tertiary" onClick={() => setModal(null)}>Cancel</Button><Button className="!bg-brand-red" disabled={busy || reason.trim().length < 3} onClick={() => modal && act(modal.kind, modal.product)}>Confirm</Button></div>
      </Modal>
    </div>
  );
}
