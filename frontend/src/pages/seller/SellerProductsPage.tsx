import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Copy, Eye, EyeOff, MoreHorizontal, Package, PackagePlus, Search, Trash2, Archive, Flag } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { Tabs } from '../../components/ui/Tabs';
import { Modal } from '../../components/ui/Modal';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { SellerProduct } from '../../market/types';
import { categoryLabel, formatUgx } from '../../market/format';

type Status = 'all' | 'published' | 'draft' | 'archived';

export function SellerProductsPage() {
  usePageMeta({ title: 'Products', noindex: true });
  const navigate = useNavigate();
  const { push } = useToast();
  const [params, setParams] = useSearchParams();
  const status = (params.get('status') as Status) || 'all';
  const [q, setQ] = useState('');
  const [data, setData] = useState<{ products: SellerProduct[]; total: number } | null>(null);
  const [menuFor, setMenuFor] = useState<SellerProduct | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<SellerProduct | null>(null);

  const load = useCallback(() => {
    const query = new URLSearchParams({ status, limit: '200' });
    if (q.trim()) query.set('q', q.trim());
    api.get(`/seller/products?${query.toString()}`).then((r) => setData(r.data)).catch(() => setData({ products: [], total: 0 }));
  }, [status, q]);
  useEffect(load, [load]);

  async function act(product: SellerProduct, action: 'publish' | 'unpublish' | 'archive' | 'duplicate' | 'delete') {
    setMenuFor(null);
    try {
      if (action === 'delete') {
        const res = await api.delete(`/seller/products/${product.id}`);
        push(res.data.deleted ? 'Product deleted' : 'This product has sales, so it was archived instead', 'success');
      } else {
        const res = await api.post(`/seller/products/${product.id}/${action}`);
        if (action === 'publish') push(res.data.followersNotified ? `Published. ${res.data.followersNotified} follower${res.data.followersNotified === 1 ? '' : 's'} notified.` : 'Published', 'success');
        else if (action === 'duplicate') { push('Copy created as a draft', 'success'); navigate(`/seller/products/${res.data.product.id}/edit`); return; }
        else push(action === 'unpublish' ? 'Moved to drafts' : 'Archived', 'success');
      }
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  const counts = data ? {
    all: data.total,
  } : null;

  return (
    <div className="pb-10">
      <PageHeader title="Products" subtitle="Everything in your store: drafts, published and archived." actions={<Link to="/seller/products/new"><Button size="sm"><PackagePlus size={15} /> Add product</Button></Link>} />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Tabs
          ariaLabel="Product status"
          value={status}
          onChange={(v) => setParams(v === 'all' ? {} : { status: v })}
          items={[{ value: 'all', label: 'All', count: counts?.all }, { value: 'published', label: 'Published' }, { value: 'draft', label: 'Drafts' }, { value: 'archived', label: 'Archived' }]}
          className="flex-1"
        />
        <label className="relative sm:w-64">
          <span className="sr-only">Search your products</span>
          <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, SKU, brand" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:shadow-focus" />
        </label>
      </div>

      <div className="mt-4">
        {!data ? (
          <SkeletonRegion label="Loading products"><SkeletonHeading subtitle={false} /><div className="mt-4"><SkeletonRows count={5} /></div></SkeletonRegion>
        ) : data.products.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title={q ? 'No products match' : status === 'all' ? 'No products yet' : `No ${status} products`}
            description={q ? 'Try a different word.' : status === 'all' ? 'Add your first product to start selling on Duka.' : undefined}
            action={!q && status === 'all' ? <Link to="/seller/products/new"><Button size="sm"><PackagePlus size={15} /> Add your first product</Button></Link> : undefined}
          />
        ) : (
          <Card padding="none">
            <ul className="divide-y divide-line">
              {data.products.map((p) => {
                const available = p.available ?? Math.max(0, Number(p.stock_quantity) - Number(p.reserved_quantity));
                const low = available <= Number(p.low_stock_threshold);
                return (
                  <li key={p.id} className="flex items-center gap-3 p-3 sm:p-4">
                    <Link to={`/seller/products/${p.id}/edit`} className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                      {p.images?.[0] ? <img src={p.images[0].url} alt="" className="h-full w-full object-cover" /> : <span className="flex h-full w-full items-center justify-center text-ink-3"><Package size={18} /></span>}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <Link to={`/seller/products/${p.id}/edit`} className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-ink">{p.name}</span>
                        {p.flagged_at && <Flag size={13} className="shrink-0 text-brand-red" aria-label="Flagged by Duka" />}
                      </Link>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-ink-3">
                        <span>{categoryLabel(p.category)}</span>
                        {p.sku && <span>SKU {p.sku}</span>}
                        <span className={low ? 'font-medium text-brand-red' : ''}>{available === 0 ? 'Out of stock' : `${available} in stock`}</span>
                        {Number(p.sales_count) > 0 && <span>{p.sales_count} sold</span>}
                      </p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-sm font-semibold tabular-nums text-ink">{formatUgx(p.sale_price_ugx ?? p.price_ugx)}</p>
                      {p.sale_price_ugx && <p className="text-caption text-ink-3 line-through">{formatUgx(p.price_ugx)}</p>}
                    </div>
                    <StatusBadge status={p.status} className="hidden sm:inline-flex" />
                    <button type="button" onClick={() => setMenuFor(p)} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-ink-2 hover:bg-surface-2" aria-label={`Actions for ${p.name}`}><MoreHorizontal size={18} /></button>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </div>

      <Modal open={!!menuFor} onClose={() => setMenuFor(null)} title={menuFor?.name}>
        {menuFor && (
          <div className="flex flex-col gap-1">
            <p className="mb-2 flex items-center gap-2 text-sm text-ink-2"><StatusBadge status={menuFor.status} /> {formatUgx(menuFor.sale_price_ugx ?? menuFor.price_ugx)}</p>
            <Link to={`/seller/products/${menuFor.id}/edit`} className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink hover:bg-surface-2"><Package size={17} /> Edit product</Link>
            {menuFor.status !== 'published' ? (
              <button type="button" onClick={() => act(menuFor, 'publish')} className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-surface-2"><Eye size={17} /> Publish to the marketplace</button>
            ) : (
              <>
                <Link to={`/product/${menuFor.id}`} target="_blank" rel="noreferrer" className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-sm font-medium text-ink hover:bg-surface-2"><Eye size={17} /> View on the marketplace</Link>
                <button type="button" onClick={() => act(menuFor, 'unpublish')} className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-surface-2"><EyeOff size={17} /> Unpublish (back to draft)</button>
              </>
            )}
            <button type="button" onClick={() => act(menuFor, 'duplicate')} className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-surface-2"><Copy size={17} /> Duplicate</button>
            {menuFor.status !== 'archived' && <button type="button" onClick={() => act(menuFor, 'archive')} className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-ink hover:bg-surface-2"><Archive size={17} /> Archive</button>}
            <button type="button" onClick={() => { setMenuFor(null); setConfirmDelete(menuFor); }} className="flex min-h-[48px] items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-brand-red hover:bg-danger-soft/40"><Trash2 size={17} /> Delete</button>
          </div>
        )}
      </Modal>

      <Modal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} title="Delete this product?">
        <p className="text-sm text-ink-2">{confirmDelete?.name} will be removed. If it has ever been sold, it is archived instead so order history stays intact.</p>
        <div className="mt-4 flex justify-end gap-2"><Button variant="tertiary" onClick={() => setConfirmDelete(null)}>Keep it</Button><Button className="!bg-brand-red" onClick={() => { if (confirmDelete) act(confirmDelete, 'delete'); setConfirmDelete(null); }}>Delete</Button></div>
      </Modal>
    </div>
  );
}
