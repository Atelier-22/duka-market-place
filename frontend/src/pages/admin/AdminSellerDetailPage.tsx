import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, ExternalLink, FileText, ShieldOff, ShieldCheck } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../components/ui/Button';
import { Modal } from '../../components/ui/Modal';
import { Textarea } from '../../components/ui/Textarea';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { RatingStars } from '../../components/ui/RatingStars';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { AdminDetailShell, Empty, Field, Panel, Pill, StatTile, formatDate, formatUgx } from './AdminDetailShell';
import { categoryLabel, timeAgo } from '../../market/format';

export function AdminSellerDetailPage() {
  const { id = '' } = useParams();
  const { push } = useToast();
  const [data, setData] = useState<any | null | undefined>(undefined);
  const [modal, setModal] = useState<'suspend' | 'reject' | 'unpublish' | 'flag' | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  usePageMeta({ title: data?.seller ? `${data.seller.full_name} · Sellers` : 'Seller', noindex: true });

  const load = useCallback(() => { api.get(`/admin/sellers/${id}`).then((r) => setData(r.data)).catch(() => setData(null)); }, [id]);
  useEffect(load, [load]);

  async function run(fn: () => Promise<unknown>, success: string) {
    setBusy(true);
    try { await fn(); push(success, 'success'); setModal(null); setReason(''); load(); } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setBusy(false); }
  }

  if (data === undefined) return <SkeletonRegion label="Loading seller" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={4} /></div></SkeletonRegion>;
  if (data === null) return <EmptyState title="Seller not found" action={<Link to="/admin/sellers"><Button size="sm">Back to sellers</Button></Link>} />;

  const { seller, store, products, orders, reviews, verifications, followers, linkedAccounts, totals } = data;
  const pendingVer = verifications.find((v: any) => v.status === 'pending');

  return (
    <AdminDetailShell
      title={seller.full_name}
      subtitle={<span className="flex flex-wrap items-center gap-2">{seller.phone}{seller.email ? ` · ${seller.email}` : ''} · joined {formatDate(seller.created_at)}{seller.last_seen_at ? ` · seen ${timeAgo(seller.last_seen_at)}` : ''}</span>}
      badges={<>
        {seller.is_suspended ? <Pill tone="danger">Suspended</Pill> : <Pill tone="success">Active</Pill>}
        {seller.verification_status === 'verified' ? <Pill tone="success">Verified</Pill> : seller.verification_status === 'pending' ? <Pill tone="warning">Verification pending</Pill> : <Pill tone="neutral">{seller.verification_status}</Pill>}
        {store && <Link to={`/store/${store.slug}`} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><ExternalLink size={14} /> Public store</Button></Link>}
        {seller.is_suspended
          ? <Button size="sm" onClick={() => run(() => api.post(`/admin/sellers/${id}/reactivate`), 'Seller reinstated')} disabled={busy}><ShieldCheck size={14} /> Reinstate</Button>
          : <Button size="sm" variant="secondary" className="text-brand-red" onClick={() => setModal('suspend')}><ShieldOff size={14} /> Suspend</Button>}
      </>}
    >
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Orders" value={String(totals.orders)} />
        <StatTile label="Delivered" value={String(totals.completed)} tone="success" />
        <StatTile label="Revenue" value={formatUgx(Number(totals.revenue_ugx))} />
        <StatTile label="Followers" value={String(followers)} />
      </div>

      {pendingVer && (
        <Panel title="Verification request" tone="warning">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Business name" value={pendingVer.business_name} />
            <Field label="Registration number" value={pendingVer.registration_number || '—'} />
            <Field label="Note from seller" value={pendingVer.note || '—'} className="sm:col-span-2" />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {pendingVer.has_document && <a href={`${(import.meta.env.VITE_API_URL ?? '/api').replace(/\/+$/, '')}/admin/sellers/verifications/${pendingVer.id}/document`} target="_blank" rel="noreferrer" onClick={(e) => { e.preventDefault(); api.get(`/admin/sellers/verifications/${pendingVer.id}/document`, { responseType: 'blob' }).then((r) => window.open(URL.createObjectURL(r.data), '_blank', 'noopener')).catch(() => push('Could not open the document', 'error')); }}><Button size="sm" variant="secondary"><FileText size={14} /> View document</Button></a>}
            <Button size="sm" onClick={() => run(() => api.post(`/admin/sellers/verifications/${pendingVer.id}/decision`, { approve: true }), 'Seller verified')} disabled={busy}><BadgeCheck size={14} /> Approve</Button>
            <Button size="sm" variant="secondary" className="text-brand-red" onClick={() => { setTarget(pendingVer.id); setModal('reject'); }}>Reject</Button>
          </div>
        </Panel>
      )}

      <Panel title="Store">
        {!store ? <Empty title="This seller has not opened a store yet." /> : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Name" value={<span className="flex items-center gap-1.5">{store.name}{seller.verification_status === 'verified' && <BadgeCheck size={14} className="text-brand-green" />}</span>} />
            <Field label="Address" value={`/store/${store.slug}`} />
            <Field label="Category · city" value={`${categoryLabel(store.category)} · ${store.city}`} />
            <Field label="Status" value={<StatusBadge status={store.status} />} />
            <Field label="Rating" value={store.rating_count ? `${Number(store.rating_avg).toFixed(1)} (${store.rating_count})` : 'No reviews'} />
            <Field label="Products" value={String(store.product_count)} />
            <Field label="Delivery fee" value={formatUgx(Number(store.delivery_fee_ugx))} />
            <Field label="Opened" value={formatDate(store.created_at)} />
            {store.tagline && <Field label="Tagline" value={store.tagline} className="sm:col-span-2" />}
            {store.description && <Field label="About" value={store.description} className="sm:col-span-2 lg:col-span-4" />}
          </div>
        )}
      </Panel>

      <Panel title={`Products (${products.length})`}>
        {products.length === 0 ? <Empty title="No products yet." /> : (
          <ul className="divide-y divide-line">
            {products.map((p: any) => (
              <li key={p.id} className="flex items-center gap-3 py-2.5">
                <span className="h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-surface-2">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center gap-2 text-sm font-medium text-ink"><span className="truncate">{p.name}</span>{p.flagged_at && <Pill tone="danger">Flagged</Pill>}</span><span className="block text-caption text-ink-3">{categoryLabel(p.category)} · {formatUgx(Number(p.sale_price_ugx ?? p.price_ugx))} · {p.available} in stock · {p.sales_count} sold · {p.view_count} views</span></span>
                <StatusBadge status={p.status} />
                {p.status === 'published' && <Link to={`/product/${p.id}`} target="_blank" rel="noreferrer" className="text-ink-3 hover:text-brand-green" aria-label="View product"><ExternalLink size={15} /></Link>}
                {p.status === 'published' && <Button size="sm" variant="tertiary" onClick={() => { setTarget(p.id); setModal('unpublish'); }}>Unpublish</Button>}
                {p.flagged_at ? <Button size="sm" variant="tertiary" onClick={() => run(() => api.post(`/admin/sellers/products/${p.id}/unflag`), 'Flag cleared')}>Clear flag</Button> : <Button size="sm" variant="tertiary" className="text-brand-red" onClick={() => { setTarget(p.id); setModal('flag'); }}>Flag</Button>}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={`Orders (${orders.length})`}>
          {orders.length === 0 ? <Empty title="No marketplace orders yet." /> : (
            <ul className="divide-y divide-line">
              {orders.map((o: any) => <li key={o.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0 truncate text-ink">#{o.order_number} · {o.customer_name}<span className="block text-caption text-ink-3">{formatDate(o.created_at)}</span></span><span className="tabular-nums text-ink">{formatUgx(Number(o.total_ugx))}</span><StatusBadge status={o.status} /></li>)}
            </ul>
          )}
        </Panel>
        <Panel title={`Reviews (${reviews.length})`}>
          {reviews.length === 0 ? <Empty title="No reviews yet." /> : (
            <ul className="divide-y divide-line">
              {reviews.map((r: any) => <li key={r.id} className="py-2 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium text-ink">{r.author_name}</span><span className="text-caption text-ink-3">{timeAgo(r.created_at)}</span></div><RatingStars value={r.stars} />{r.comment && <p className="mt-0.5 text-ink-2">{r.comment}</p>}{r.reply && <p className="mt-1 text-caption text-ink-3">Reply: {r.reply}</p>}</li>)}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Verification history">
          {verifications.length === 0 ? <Empty title="Never submitted." /> : (
            <ul className="divide-y divide-line">{verifications.map((v: any) => <li key={v.id} className="flex items-center justify-between gap-3 py-2 text-sm"><span className="min-w-0"><span className="block text-ink">{v.business_name}</span><span className="block text-caption text-ink-3">{formatDate(v.created_at)}{v.review_note ? ` · ${v.review_note}` : ''}</span></span><StatusBadge status={v.status} /></li>)}</ul>
          )}
        </Panel>
        <Panel title="Linked accounts">
          {linkedAccounts.length === 0 ? <Empty title="No customer or shopper account on this number." /> : (
            <ul className="flex flex-col gap-2 text-sm">{linkedAccounts.map((a: any) => <li key={a.id}><Link to={a.role === 'customer' ? `/admin/customers/${a.id}` : a.role === 'shopper' ? `/admin/shoppers/${a.id}` : `/admin/sellers/${a.id}`} className="text-brand-green hover:underline">{a.full_name}</Link> <span className="text-ink-3">· {a.role}</span></li>)}</ul>
          )}
          {seller.is_suspended && seller.suspended_reason && <p className="mt-3 text-caption text-brand-red">Suspended {timeAgo(seller.suspended_at)}: {seller.suspended_reason}</p>}
        </Panel>
      </div>

      <Modal open={modal !== null} onClose={() => setModal(null)} title={modal === 'suspend' ? 'Suspend this seller' : modal === 'reject' ? 'Reject verification' : modal === 'unpublish' ? 'Unpublish this product' : 'Flag this product'}>
        <p className="text-sm text-ink-2">{modal === 'suspend' ? 'Their store and products disappear from the marketplace and they cannot make changes. They are told the reason.' : modal === 'reject' ? 'The seller sees this reason and can submit again.' : modal === 'unpublish' ? 'The product goes back to draft. The seller is told why and can republish after fixing it.' : 'Flagged products are hidden and cannot be republished until the flag is cleared.'}</p>
        <Textarea className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={500} placeholder="Reason" autoFocus />
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="tertiary" onClick={() => setModal(null)}>Cancel</Button>
          <Button className="!bg-brand-red" disabled={busy || reason.trim().length < 3} onClick={() => {
            if (modal === 'suspend') run(() => api.post(`/admin/sellers/${id}/suspend`, { reason: reason.trim() }), 'Seller suspended');
            else if (modal === 'reject') run(() => api.post(`/admin/sellers/verifications/${target}/decision`, { approve: false, note: reason.trim() }), 'Verification rejected');
            else if (modal === 'unpublish') run(() => api.post(`/admin/sellers/products/${target}/unpublish`, { reason: reason.trim() }), 'Product unpublished');
            else run(() => api.post(`/admin/sellers/products/${target}/flag`, { reason: reason.trim() }), 'Product flagged');
          }}>Confirm</Button>
        </div>
      </Modal>
    </AdminDetailShell>
  );
}
