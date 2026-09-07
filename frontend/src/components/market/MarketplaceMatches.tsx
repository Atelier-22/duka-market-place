import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Store as StoreIcon } from 'lucide-react';
import { api } from '../../services/api';
import { Card } from '../ui/Card';
import { PublicProduct } from '../../market/types';
import { formatUgx } from '../../market/format';

interface MatchesProps {
  requestId?: string | null;
  query?: string | null;
  className?: string;
}

export function MarketplaceMatches({ requestId, query, className = '' }: MatchesProps) {
  const [term, setTerm] = useState<string | null>(query ?? null);
  const [products, setProducts] = useState<PublicProduct[] | null>(null);

  useEffect(() => {
    if (query) { setTerm(query); return; }
    if (!requestId) return;
    api.get(`/requests/${requestId}`).then((r) => setTerm(r.data.request?.title ?? null)).catch(() => setTerm(null));
  }, [requestId, query]);

  useEffect(() => {
    if (!term || term.trim().length < 2) { setProducts([]); return; }
    const words = term.trim().split(/\s+/).slice(0, 4).join(' ');
    api.get(`/marketplace/search?q=${encodeURIComponent(words)}&limit=4`)
      .then((r) => setProducts(r.data.products))
      .catch(() => setProducts([]));
  }, [term]);

  if (!products || products.length === 0) return null;

  return (
    <Card padding="md" className={className}>
      <p className="flex items-center gap-2 text-label font-semibold uppercase text-ink-3"><StoreIcon size={14} /> Sold on the Duka marketplace</p>
      <p className="mt-1 text-caption text-ink-3">Stores that stock something like “{term}”. Prices are what the store charges; check before you commit.</p>
      <ul className="mt-3 flex flex-col gap-2">
        {products.map((p) => (
          <li key={p.id}>
            <Link to={`/product/${p.id}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl p-1.5 hover:bg-surface-2">
              <span className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-surface-2">{p.imageUrl && <img src={p.imageUrl} alt="" className="h-full w-full object-cover" />}</span>
              <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-ink">{p.name}</span><span className="block truncate text-caption text-ink-3">{p.store?.name}{p.store?.isVerified ? ' · verified' : ''} · {p.store?.city}</span></span>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-brand-green-deep">{formatUgx(p.priceUgx)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}
