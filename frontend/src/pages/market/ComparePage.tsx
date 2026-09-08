import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Scale, X } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { PublicProduct } from '../../market/types';
import { formatUgx } from '../../market/format';

interface CompareData {
  products: (PublicProduct & { attributes: { key: string; name: string; value: string; unit: string | null }[] })[];
  rows: { key: string; name: string; unit: string | null; values: (string | null)[] }[];
}

export function ComparePage() {
  usePageMeta({ title: 'Compare products', noindex: true });
  const [params, setParams] = useSearchParams();
  const ids = (params.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  const [data, setData] = useState<CompareData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ids.length === 0) { setData({ products: [], rows: [] }); setLoading(false); return; }
    let cancelled = false;
    setLoading(true);
    api.get(`/marketplace/compare?ids=${encodeURIComponent(ids.join(','))}`)
      .then((r) => { if (!cancelled) setData(r.data); })
      .catch(() => { if (!cancelled) setData({ products: [], rows: [] }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [params.get('ids')]);

  function remove(id: string) {
    const next = ids.filter((x) => x !== id);
    setParams(next.length ? { ids: next.join(',') } : {});
  }

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <Link to="/marketplace" className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-green"><ArrowLeft size={16} /> Marketplace</Link>
      <h1 className="mt-2 font-display text-h1 font-medium text-brand-green-deep">Compare</h1>
      <p className="mt-1 text-sm text-ink-3">Side by side, on the details the stores filled in.</p>
      {loading || !data ? (
        <SkeletonRegion label="Loading comparison" className="mt-6"><SkeletonTable rows={6} cols={3} /></SkeletonRegion>
      ) : data.products.length === 0 ? (
        <div className="mt-6"><EmptyState icon={<Scale />} title="Nothing to compare yet" description="Open a product and tap Compare with similar to start." action={<Link to="/marketplace"><Button size="sm">Browse the marketplace</Button></Link>} /></div>
      ) : (
        <Card padding="none" className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-line align-top">
                <th className="w-40 p-3 text-left text-label font-semibold uppercase text-ink-3">Product</th>
                {data.products.map((p) => (
                  <th key={p.id} className="p-3 text-left">
                    <div className="relative">
                      <button type="button" onClick={() => remove(p.id)} className="absolute -right-1 -top-1 flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-ink-3 hover:text-brand-red" aria-label={`Remove ${p.name}`}><X size={14} /></button>
                      <Link to={`/product/${p.id}`} className="block">
                        <span className="block aspect-square w-full max-w-[160px] overflow-hidden rounded-xl bg-surface-2">{p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}</span>
                        <span className="mt-2 block font-medium text-ink">{p.name}</span>
                        <span className="block font-display text-base font-semibold text-brand-green-deep">{formatUgx(p.priceUgx)}</span>
                        {p.store && <span className="block text-caption text-ink-3">{p.store.name}</span>}
                      </Link>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-line"><td className="p-3 text-ink-3">In stock</td>{data.products.map((p) => <td key={p.id} className="p-3 text-ink">{p.inStock ? `${p.available} available` : 'Sold out'}</td>)}</tr>
              <tr className="border-b border-line"><td className="p-3 text-ink-3">Condition</td>{data.products.map((p) => <td key={p.id} className="p-3 text-ink">{p.condition}</td>)}</tr>
              {data.rows.map((row) => (
                <tr key={row.key} className="border-b border-line last:border-0">
                  <td className="p-3 text-ink-3">{row.name}{row.unit ? <span className="text-caption"> ({row.unit})</span> : null}</td>
                  {row.values.map((v, i) => <td key={i} className={`p-3 ${v ? 'text-ink' : 'text-ink-3'}`}>{v ?? '—'}</td>)}
                </tr>
              ))}
              {data.rows.length === 0 && <tr><td colSpan={data.products.length + 1} className="p-4 text-center text-ink-3">These stores have not filled in comparable details yet.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}
