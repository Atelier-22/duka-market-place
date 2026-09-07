import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Store as StoreIcon } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { ProductCard } from './ProductCard';
import { StoreCard } from './StoreCard';
import { PublicProduct, PublicStore } from '../../market/types';

interface TeaserProps {
  variant?: 'landing' | 'dashboard';
  className?: string;
}

export function MarketplaceTeaser({ variant = 'landing', className = '' }: TeaserProps) {
  const { user } = useAuth();
  const [data, setData] = useState<{ newest: PublicProduct[]; featured: PublicProduct[]; stores: PublicStore[] } | null | undefined>(undefined);

  useEffect(() => {
    api.get('/marketplace/home').then((r) => setData(r.data)).catch(() => setData(null));
  }, []);

  if (data === undefined) return null;
  const products = (data?.featured?.length ? data.featured : data?.newest ?? []).slice(0, variant === 'dashboard' ? 4 : 8);
  const stores = (data?.stores ?? []).slice(0, 3);
  const sellCta = user?.role === 'seller' ? { to: '/seller', label: 'Your store' } : { to: '/sell', label: 'Sell on Duka' };

  if (products.length === 0) {
    if (variant === 'dashboard') return null;
    return (
      <div className={className}>
        <Card padding="lg" className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-label font-semibold uppercase tracking-wide text-brand-green">Marketplace</p>
            <h2 className="mt-1 font-display text-h2 font-medium text-brand-green-deep">Stores are opening on Duka</h2>
            <p className="mt-1 max-w-lg text-body text-ink-2">Soon you will be able to buy directly from local stores here. Have products to sell? Open your store today.</p>
          </div>
          <Link to={sellCta.to} className="shrink-0"><Button>{sellCta.label} <ArrowRight size={16} /></Button></Link>
        </Card>
      </div>
    );
  }

  if (variant === 'dashboard') {
    return (
      <section className={className}>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep"><StoreIcon size={18} /> Shop from local stores</h2>
          <Link to="/marketplace" className="text-sm font-medium text-brand-green">Marketplace</Link>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      </section>
    );
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-label font-semibold uppercase tracking-wide text-brand-green">Marketplace</p>
          <h2 className="mt-2 font-display text-h2 font-medium text-brand-green-deep sm:text-h1">Or buy straight from a store</h2>
          <p className="mt-2 max-w-xl text-body text-ink-2">Local stores publish what they have in stock. Order it, follow the store, pay on delivery.</p>
        </div>
        <Link to="/marketplace"><Button variant="secondary">Browse everything <ArrowRight size={16} /></Button></Link>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
      {stores.length > 0 && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {stores.map((s) => <StoreCard key={s.id} store={s} />)}
        </div>
      )}
      <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl bg-brand-green-mist p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-body text-brand-green-deep"><span className="font-medium">Have products to sell?</span> Open a store and reach everyone on Duka.</p>
        <Link to={sellCta.to} className="shrink-0"><Button size="sm">{sellCta.label} <ArrowRight size={14} /></Button></Link>
      </div>
    </div>
  );
}
