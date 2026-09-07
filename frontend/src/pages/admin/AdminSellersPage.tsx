import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BadgeCheck, Package, Search, Store as StoreIcon, Users } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Select';
import { Tabs } from '../../components/ui/Tabs';
import { BarChart } from '../../components/ui/MiniChart';
import { SkeletonHeading, SkeletonRegion, SkeletonStats, SkeletonTable } from '../../components/ui/Skeleton';
import { AdminTable, Pill, StatTile, Td, Th, Tr, formatUgx } from './AdminDetailShell';
import { compactUgx } from '../../market/format';

type Filter = 'all' | 'active' | 'pending' | 'verified' | 'unverified' | 'suspended' | 'no_store';

export function AdminSellersPage() {
  usePageMeta({ title: 'Sellers · Admin', noindex: true });
  const navigate = useNavigate();
  const [stats, setStats] = useState<any | null>(null);
  const [rows, setRows] = useState<any[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState('newest');
  const [q, setQ] = useState('');

  useEffect(() => { api.get('/admin/sellers/stats').then((r) => setStats(r.data)).catch(() => setStats(null)); }, []);
  const load = useCallback(() => {
    const p = new URLSearchParams({ status: filter, sort });
    if (q.trim()) p.set('q', q.trim());
    api.get(`/admin/sellers?${p.toString()}`).then((r) => setRows(r.data.sellers)).catch(() => setRows([]));
  }, [filter, sort, q]);
  useEffect(load, [load]);

  if (!stats && !rows) {
    return <SkeletonRegion label="Loading sellers" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonStats /></div><div className="mt-6"><SkeletonTable rows={6} cols={6} /></div></SkeletonRegion>;
  }

  const growth = (stats?.growth ?? []).map((g: any) => ({ label: new Date(g.day).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' }), value: Number(g.sellers) }));

  return (
    <div className="pb-10">
      <PageHeader title="Sellers" subtitle="Everyone selling on the marketplace. Numbers come straight from the seller tables." actions={<div className="flex gap-2"><Link to="/admin/seller-products" className="text-sm font-medium text-brand-green">Products</Link></div>} />

      {stats && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Total sellers" value={String(stats.sellers.total)} />
            <StatTile label="Active" value={String(stats.sellers.active)} tone="success" />
            <StatTile label="Pending verification" value={String(stats.pendingVerifications)} tone={stats.pendingVerifications ? 'warning' : 'default'} />
            <StatTile label="Suspended" value={String(stats.sellers.suspended)} tone={stats.sellers.suspended ? 'danger' : 'default'} />
            <StatTile label="New (30 days)" value={String(stats.sellers.new30d)} />
            <StatTile label="Stores" value={String(stats.stores.active)} />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Products published" value={String(stats.products.published)} />
            <StatTile label="Drafts" value={String(stats.products.drafts)} />
            <StatTile label="Out of stock" value={String(stats.products.outOfStock)} tone={stats.products.outOfStock ? 'warning' : 'default'} />
            <StatTile label="Flagged" value={String(stats.products.flagged)} tone={stats.products.flagged ? 'danger' : 'default'} />
            <StatTile label="Marketplace orders" value={String(stats.orders.total)} />
            <StatTile label="Seller revenue" value={compactUgx(stats.orders.revenueUgx)} tone="success" />
          </div>

          {stats.pendingVerifications > 0 && (
            <Link to="/admin/sellers?filter=pending" onClick={() => setFilter('pending')} className="mt-4 block rounded-2xl focus-visible:outline-none focus-visible:shadow-focus">
              <Card tone="warning" padding="md" hover><p className="flex items-center gap-2 text-sm font-medium text-brand-green-deep"><BadgeCheck size={16} className="text-warning" /> {stats.pendingVerifications} seller verification{stats.pendingVerifications === 1 ? '' : 's'} waiting for review</p></Card>
            </Link>
          )}

          <Card padding="lg" className="mt-4">
            <SectionHeader title="Seller registrations, last 30 days" />
            <BarChart points={growth} ariaLabel="New sellers per day" height={110} emptyText="No sellers registered in the last 30 days." />
          </Card>
        </>
      )}

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <Tabs ariaLabel="Seller filter" value={filter} onChange={setFilter} className="flex-1" items={[{ value: 'all', label: 'All' }, { value: 'active', label: 'Active' }, { value: 'pending', label: 'Pending' }, { value: 'verified', label: 'Verified' }, { value: 'unverified', label: 'Unverified' }, { value: 'suspended', label: 'Suspended' }, { value: 'no_store', label: 'No store' }]} />
        <div className="flex gap-2">
          <label className="relative flex-1 lg:w-56"><span className="sr-only">Search sellers</span><Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" /><input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Name, phone, store" className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:shadow-focus" /></label>
          <Select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort"><option value="newest">Newest</option><option value="sales">Most sales</option><option value="followers">Most followed</option><option value="rating">Highest rated</option><option value="products">Most products</option></Select>
        </div>
      </div>

      <div className="mt-4">
        {!rows ? <SkeletonTable rows={6} cols={6} /> : rows.length === 0 ? (
          <EmptyState icon={<StoreIcon />} title="No sellers here" description={filter === 'all' && !q ? 'Sellers appear as soon as someone registers to sell.' : 'Try another filter.'} />
        ) : (
          <AdminTable caption="Sellers" head={<><Th>Seller</Th><Th>Store</Th><Th>Status</Th><Th align="right">Products</Th><Th align="right">Orders</Th><Th align="right">Revenue</Th><Th align="right">Followers</Th><Th>Joined</Th></>}>
            {rows.map((s) => (
              <Tr key={s.id} onClick={() => navigate(`/admin/sellers/${s.id}`)}>
                <Td className="font-medium">{s.full_name}<span className="block text-caption font-normal text-ink-3">{s.phone}</span></Td>
                <Td>{s.store_name ? <span className="flex items-center gap-1.5">{s.store_name}{s.verification_status === 'verified' && <BadgeCheck size={14} className="text-brand-green" />}</span> : <span className="text-ink-3">No store yet</span>}</Td>
                <Td>{s.is_suspended ? <Pill tone="danger">Suspended</Pill> : s.verification_status === 'verified' ? <Pill tone="success">Verified</Pill> : s.verification_status === 'pending' ? <Pill tone="warning">Pending</Pill> : <Pill tone="neutral">{s.store_status === 'hidden' ? 'Hidden' : 'Unverified'}</Pill>}</Td>
                <Td numeric>{s.product_count ?? 0}</Td>
                <Td numeric>{s.orders}</Td>
                <Td numeric>{formatUgx(Number(s.revenue_ugx))}</Td>
                <Td numeric>{s.follower_count ?? 0}</Td>
                <Td muted className="whitespace-nowrap">{new Date(s.created_at).toLocaleDateString('en-UG')}</Td>
              </Tr>
            ))}
          </AdminTable>
        )}
      </div>

      {stats && rows && rows.length > 0 && (
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <Card padding="lg"><SectionHeader title={<span className="flex items-center gap-2"><Users size={16} /> Most followed</span>} /><ul className="divide-y divide-line">{[...rows].sort((a, b) => (b.follower_count ?? 0) - (a.follower_count ?? 0)).slice(0, 5).map((s) => <li key={s.id} className="flex justify-between py-2 text-sm"><Link to={`/admin/sellers/${s.id}`} className="truncate text-ink hover:text-brand-green">{s.store_name ?? s.full_name}</Link><span className="text-ink-3">{s.follower_count ?? 0}</span></li>)}</ul></Card>
          <Card padding="lg"><SectionHeader title={<span className="flex items-center gap-2"><BadgeCheck size={16} /> Highest rated</span>} /><ul className="divide-y divide-line">{[...rows].filter((s) => Number(s.rating_count) > 0).sort((a, b) => Number(b.rating_avg) - Number(a.rating_avg)).slice(0, 5).map((s) => <li key={s.id} className="flex justify-between py-2 text-sm"><Link to={`/admin/sellers/${s.id}`} className="truncate text-ink hover:text-brand-green">{s.store_name ?? s.full_name}</Link><span className="text-ink-3">{Number(s.rating_avg).toFixed(1)} ({s.rating_count})</span></li>)}{rows.every((s) => !Number(s.rating_count)) && <li className="py-2 text-sm text-ink-3">No reviews yet.</li>}</ul></Card>
          <Card padding="lg"><SectionHeader title={<span className="flex items-center gap-2"><Package size={16} /> Most products</span>} /><ul className="divide-y divide-line">{[...rows].sort((a, b) => (b.product_count ?? 0) - (a.product_count ?? 0)).slice(0, 5).map((s) => <li key={s.id} className="flex justify-between py-2 text-sm"><Link to={`/admin/sellers/${s.id}`} className="truncate text-ink hover:text-brand-green">{s.store_name ?? s.full_name}</Link><span className="text-ink-3">{s.product_count ?? 0}</span></li>)}</ul></Card>
        </div>
      )}
    </div>
  );
}
