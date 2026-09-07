import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ArrowRight, Search, SlidersHorizontal, Store as StoreIcon, Tag } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Select } from '../../components/ui/Select';
import { SectionHeader } from '../../components/ui/PageHeader';
import { Bone, SkeletonRegion } from '../../components/ui/Skeleton';
import { ProductCard } from '../../components/market/ProductCard';
import { StoreCard } from '../../components/market/StoreCard';
import { PublicProduct, PublicStore } from '../../market/types';
import { categoryLabel } from '../../market/format';

interface HomeData {
  featured: PublicProduct[];
  newest: PublicProduct[];
  stores: PublicStore[];
  categories: { category: string; products: number; stores: number }[];
}

const SORTS = [
  { value: 'popular', label: 'Most popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price: low to high' },
  { value: 'price_desc', label: 'Price: high to low' },
  { value: 'rating', label: 'Best rated' },
];

function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="surface overflow-hidden rounded-2xl">
          <Bone className="aspect-square w-full rounded-none" />
          <div className="p-3"><Bone className="h-4 w-3/4" /><Bone className="mt-2 h-4 w-1/2" /></div>
        </div>
      ))}
    </div>
  );
}

export function MarketplacePage() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const category = params.get('category') ?? '';
  const sort = params.get('sort') ?? 'popular';
  const inStock = params.get('inStock') === '1';
  const browsing = Boolean(q || category);

  usePageMeta({
    title: browsing ? `${q || categoryLabel(category)} on the Duka marketplace` : 'Duka Marketplace',
    description: 'Shop products from verified local stores in Uganda. Follow the stores you like, buy with cash on delivery.',
  });

  const [home, setHome] = useState<HomeData | null>(null);
  const [results, setResults] = useState<{ products: PublicProduct[]; total: number; stores: PublicStore[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState(q);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => { setDraft(q); }, [q]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    if (!browsing) {
      api.get('/marketplace/home').then((r) => { if (!cancelled) setHome(r.data); }).finally(() => { if (!cancelled) setLoading(false); });
    } else {
      const query = new URLSearchParams();
      if (q) query.set('q', q);
      if (category) query.set('category', category);
      query.set('sort', sort);
      if (inStock) query.set('inStock', '1');
      query.set('limit', '48');
      Promise.all([
        api.get(`/marketplace/products?${query.toString()}`),
        q ? api.get(`/marketplace/stores?q=${encodeURIComponent(q)}&limit=6`) : Promise.resolve({ data: { stores: [] } }),
      ]).then(([p, s]) => { if (!cancelled) setResults({ products: p.data.products, total: p.data.total, stores: s.data.stores }); })
        .finally(() => { if (!cancelled) setLoading(false); });
    }
    return () => { cancelled = true; };
  }, [browsing, q, category, sort, inStock]);

  const categories = useMemo(() => home?.categories ?? [], [home]);

  function update(next: Record<string, string | null>) {
    const merged = new URLSearchParams(params);
    for (const [k, v] of Object.entries(next)) {
      if (v === null || v === '') merged.delete(k);
      else merged.set(k, v);
    }
    setParams(merged, { replace: false });
  }

  function submit(e: FormEvent) {
    e.preventDefault();
    update({ q: draft.trim() || null });
  }

  const sellerCta = user?.role === 'seller'
    ? { to: '/seller', label: 'Go to your store' }
    : { to: '/sell', label: 'Sell on Duka' };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
      <div className="rounded-3xl bg-brand-green-deep px-5 py-6 text-white sm:px-8 sm:py-8">
        <p className="text-label font-semibold uppercase tracking-wide text-brand-green-fresh">Marketplace</p>
        <h1 className="mt-1 font-display text-h1 font-medium sm:text-display">Shop from local stores</h1>
        <p className="mt-2 max-w-xl text-body text-white/80">Real stores, real stock, delivered to your door. Pay on delivery.</p>
        <form onSubmit={submit} className="mt-5 flex gap-2">
          <label className="relative flex-1">
            <span className="sr-only">Search products and stores</span>
            <Search size={18} strokeWidth={1.9} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
            <input
              type="search"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Search phones, shoes, stores…"
              className="h-12 w-full rounded-xl border-0 bg-white pl-11 pr-3 text-base text-ink shadow-card outline-none placeholder:text-ink-3 focus:ring-2 focus:ring-brand-green-fresh"
            />
          </label>
          <Button type="submit" size="lg" className="shrink-0 !bg-brand-green-fresh !text-brand-green-deep">Search</Button>
        </form>
      </div>

      <div className="mt-5 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <button
          type="button"
          onClick={() => update({ category: null, q: null })}
          className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${!browsing ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}
        >
          Everything
        </button>
        {(categories.length ? categories : []).map((c) => (
          <button
            key={c.category}
            type="button"
            onClick={() => update({ category: c.category === category ? null : c.category })}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-sm font-medium transition-colors ${category === c.category ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}
          >
            {categoryLabel(c.category)} <span className="text-ink-3">{c.products}</span>
          </button>
        ))}
      </div>

      {browsing ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-h3 font-medium text-brand-green-deep">
                {q ? `Results for “${q}”` : categoryLabel(category)}
              </h2>
              {results && <p className="text-small text-ink-3">{results.total} product{results.total === 1 ? '' : 's'}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowFilters((v) => !v)}>
                <SlidersHorizontal size={15} strokeWidth={2} /> Filters
              </Button>
            </div>
          </div>
          {showFilters && (
            <Card className="mt-3 grid gap-3 sm:grid-cols-3" padding="md">
              <Select label="Sort" value={sort} onChange={(e) => update({ sort: e.target.value })}>
                {SORTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </Select>
              <Select label="Category" value={category} onChange={(e) => update({ category: e.target.value || null })}>
                <option value="">All categories</option>
                {categories.map((c) => <option key={c.category} value={c.category}>{categoryLabel(c.category)}</option>)}
              </Select>
              <label className="flex min-h-[44px] items-center gap-2.5 self-end text-sm text-ink">
                <input type="checkbox" checked={inStock} onChange={(e) => update({ inStock: e.target.checked ? '1' : null })} className="h-4 w-4 rounded border-line-strong accent-brand-green" />
                In stock only
              </label>
            </Card>
          )}

          {loading || !results ? (
            <div className="mt-5"><ProductGridSkeleton /></div>
          ) : (
            <>
              {results.stores.length > 0 && (
                <section className="mt-5">
                  <SectionHeader title="Stores" />
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {results.stores.map((s) => <StoreCard key={s.id} store={s} />)}
                  </div>
                </section>
              )}
              <section className="mt-5">
                {results.stores.length > 0 && <SectionHeader title="Products" />}
                {results.products.length === 0 ? (
                  <EmptyState
                    icon={<Search />}
                    title="Nothing matches yet"
                    description="Try another word, or post a request and a shopper will find it for you."
                    action={<Link to={user ? '/app/requests/new' : '/register?role=customer'}><Button size="sm">Post a request</Button></Link>}
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {results.products.map((p) => <ProductCard key={p.id} product={p} />)}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      ) : loading || !home ? (
        <SkeletonRegion label="Loading marketplace" className="mt-6">
          <ProductGridSkeleton />
        </SkeletonRegion>
      ) : home.newest.length === 0 && home.stores.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={<StoreIcon />}
            title="The marketplace is opening"
            description="Stores are setting up. Be one of the first to sell on Duka."
            action={<Link to={sellerCta.to}><Button>{sellerCta.label}</Button></Link>}
          />
        </div>
      ) : (
        <>
          {home.featured.length > 0 && (
            <section className="mt-7">
              <SectionHeader title="Popular right now" action={<Link to="/marketplace?sort=popular&category=" className="text-sm font-medium text-brand-green">See all</Link>} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {home.featured.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}

          {home.stores.length > 0 && (
            <section className="mt-9">
              <SectionHeader title="Stores to follow" />
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {home.stores.map((s) => <StoreCard key={s.id} store={s} />)}
              </div>
            </section>
          )}

          {home.newest.length > 0 && (
            <section className="mt-9">
              <SectionHeader title="Just added" action={<Link to="/marketplace?sort=newest&category=" className="text-sm font-medium text-brand-green">See all</Link>} />
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {home.newest.map((p) => <ProductCard key={p.id} product={p} />)}
              </div>
            </section>
          )}

          <section className="mt-10 rounded-3xl bg-brand-green-mist p-5 sm:p-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-label font-semibold uppercase tracking-wide text-brand-green"><Tag size={14} /> For businesses</p>
                <h2 className="mt-1 font-display text-h2 font-medium text-brand-green-deep">Have products to sell?</h2>
                <p className="mt-1 max-w-lg text-body text-ink-2">Open a store, publish your stock and reach customers and shoppers across Duka. It takes about five minutes.</p>
              </div>
              <Link to={sellerCta.to} className="shrink-0"><Button size="lg">{sellerCta.label} <ArrowRight size={16} /></Button></Link>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
