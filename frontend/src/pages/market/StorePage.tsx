import { FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BadgeCheck, MapPin, MessageCircle, Phone, Search, Share2, Star, Store as StoreIcon, Users } from 'lucide-react';
import { api } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { StructuredData } from '../../components/seo/StructuredData';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Tabs } from '../../components/ui/Tabs';
import { RatingStars } from '../../components/ui/RatingStars';
import { Avatar } from '../../components/ui/Avatar';
import { Bone, SkeletonRegion } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { ProductCard } from '../../components/market/ProductCard';
import { FollowButton } from '../../components/market/FollowButton';
import { PublicProduct, PublicStore } from '../../market/types';
import { categoryLabel, timeAgo } from '../../market/format';

type Tab = 'products' | 'reviews' | 'about';

interface StoreData {
  store: PublicStore;
  products: PublicProduct[];
  total: number;
  featured: PublicProduct[];
  reviews: { id: string; stars: number; comment: string | null; reply: string | null; replied_at: string | null; created_at: string; author_name: string; author_avatar: string | null }[];
  following: boolean;
  categories: { category: string; n: number }[];
}

export function StorePage() {
  const { slug = '' } = useParams();
  const { push } = useToast();
  const [data, setData] = useState<StoreData | null>(null);
  const [missing, setMissing] = useState(false);
  const [tab, setTab] = useState<Tab>('products');
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [sort, setSort] = useState('newest');
  const [products, setProducts] = useState<PublicProduct[] | null>(null);

  useEffect(() => {
    setData(null);
    setMissing(false);
    api.get(`/marketplace/stores/${slug}`)
      .then((r) => { setData(r.data); setProducts(r.data.products); })
      .catch(() => setMissing(true));
  }, [slug]);

  useEffect(() => {
    if (!data) return;
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    params.set('sort', sort);
    params.set('limit', '60');
    api.get(`/marketplace/stores/${slug}?${params.toString()}`).then((r) => setProducts(r.data.products)).catch(() => undefined);
  }, [q, category, sort, slug, data]);

  usePageMeta({
    title: data ? `${data.store.name}` : 'Store',
    description: data?.store.tagline || data?.store.description?.slice(0, 150) || 'A store on the Duka marketplace.',
    image: data?.store.logo_url || undefined,
  });

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={<StoreIcon />} title="This store is not available" description="It may have closed, or the link is wrong." action={<Link to="/marketplace"><Button>Back to the marketplace</Button></Link>} />
      </div>
    );
  }

  if (!data) {
    return (
      <SkeletonRegion label="Loading store" className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <Bone className="mt-4 h-36 w-full rounded-3xl sm:h-48" />
        <div className="mt-4 flex gap-4"><Bone className="h-20 w-20 rounded-2xl" /><div className="flex-1"><Bone className="h-6 w-1/2" /><Bone className="mt-2 h-4 w-1/3" /></div></div>
      </SkeletonRegion>
    );
  }

  const { store } = data;
  const rating = Number(store.rating_avg);

  function share(e: FormEvent) {
    e.preventDefault();
    const url = `${window.location.origin}/store/${store.slug}`;
    if (navigator.share) navigator.share({ title: store.name, url }).catch(() => undefined);
    else navigator.clipboard?.writeText(url).then(() => push('Link copied', 'success')).catch(() => undefined);
  }

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    url: `https://www.dukashoppers.com/store/${store.slug}`,
    image: store.logo_url ?? undefined,
    description: store.tagline ?? store.description ?? undefined,
    address: { '@type': 'PostalAddress', addressLocality: store.city, addressCountry: 'UG' },
    telephone: store.contact_phone ?? undefined,
    aggregateRating: store.rating_count > 0 ? { '@type': 'AggregateRating', ratingValue: rating, reviewCount: store.rating_count } : undefined,
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
      <StructuredData id={`store-${store.id}`} data={schema} />

      <div className="relative mt-4 h-36 overflow-hidden rounded-3xl bg-brand-green-deep sm:h-52">
        {store.cover_url && <img src={store.cover_url} alt="" className="h-full w-full object-cover" />}
      </div>

      <div className="-mt-10 flex flex-col gap-4 px-2 sm:flex-row sm:items-end sm:justify-between sm:px-4">
        <div className="flex items-end gap-4">
          <span className="surface flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-page bg-brand-green-mist text-brand-green-deep shadow-card">
            {store.logo_url ? <img src={store.logo_url} alt={`${store.name} logo`} className="h-full w-full object-cover" /> : <StoreIcon size={34} strokeWidth={1.6} />}
          </span>
          <div className="min-w-0 pb-1">
            <h1 className="flex items-center gap-2 font-display text-h2 font-medium text-brand-green-deep">
              <span className="truncate">{store.name}</span>
              {store.is_verified && <BadgeCheck size={22} strokeWidth={2} className="shrink-0 text-brand-green" aria-label="Verified store" />}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-ink-2">
              <span>{categoryLabel(store.category)}</span>
              <span className="flex items-center gap-1"><MapPin size={13} /> {store.city}</span>
              {store.rating_count > 0 ? (
                <span className="flex items-center gap-1"><Star size={13} className="fill-brand-yellow text-brand-yellow" /> {rating.toFixed(1)} ({store.rating_count})</span>
              ) : <span className="text-ink-3">No reviews yet</span>}
              <span className="flex items-center gap-1"><Users size={13} /> {store.follower_count} follower{store.follower_count === 1 ? '' : 's'}</span>
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <FollowButton
            slug={store.slug}
            following={data.following}
            followerCount={store.follower_count}
            onChange={(next) => setData((d) => d && ({ ...d, following: next.following, store: { ...d.store, follower_count: next.followerCount } }))}
          />
          <Button variant="secondary" onClick={share} aria-label="Share store"><Share2 size={16} /></Button>
        </div>
      </div>

      {store.tagline && <p className="mt-4 px-2 text-body text-ink-2 sm:px-4">{store.tagline}</p>}

      <Tabs
        className="mt-5"
        ariaLabel="Store sections"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'products', label: 'Products', count: store.product_count },
          { value: 'reviews', label: 'Reviews', count: store.rating_count },
          { value: 'about', label: 'About' },
        ]}
      />

      {tab === 'products' && (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <label className="relative flex-1">
              <span className="sr-only">Search in this store</span>
              <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3" />
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search in ${store.name}`} className="h-11 w-full rounded-xl border border-line bg-surface pl-10 pr-3 text-sm outline-none focus:border-brand-green focus:shadow-focus" />
            </label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products" className="h-11 rounded-xl border border-line bg-surface px-3 text-sm">
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="price_asc">Price: low to high</option>
              <option value="price_desc">Price: high to low</option>
              <option value="rating">Best rated</option>
            </select>
          </div>
          {data.categories.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button type="button" onClick={() => setCategory('')} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${!category ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line text-ink-2'}`}>All</button>
              {data.categories.map((c) => (
                <button key={c.category} type="button" onClick={() => setCategory(c.category === category ? '' : c.category)} className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${category === c.category ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line text-ink-2'}`}>
                  {categoryLabel(c.category)} <span className="text-ink-3">{c.n}</span>
                </button>
              ))}
            </div>
          )}

          {!q && !category && data.featured.length > 0 && (
            <section className="mt-5">
              <h2 className="mb-2 text-label font-semibold uppercase text-ink-3">Featured</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {data.featured.map((p) => <ProductCard key={p.id} product={p} showStore={false} />)}
              </div>
            </section>
          )}

          <section className="mt-5">
            {(!q && !category && data.featured.length > 0) && <h2 className="mb-2 text-label font-semibold uppercase text-ink-3">All products</h2>}
            {products && products.length === 0 ? (
              <EmptyState icon={<StoreIcon />} title={q ? 'Nothing matches' : 'No products yet'} description={q ? 'Try a different word.' : 'This store has not published anything yet. Follow it to hear when they do.'} size="sm" />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {(products ?? []).map((p) => <ProductCard key={p.id} product={p} showStore={false} />)}
              </div>
            )}
          </section>
        </div>
      )}

      {tab === 'reviews' && (
        <div className="mt-4">
          {data.reviews.length === 0 ? (
            <EmptyState icon={<Star />} title="No reviews yet" description="Reviews come from buyers after a completed order." size="sm" />
          ) : (
            <div className="flex flex-col gap-3">
              {data.reviews.map((r) => (
                <Card key={r.id} padding="md">
                  <div className="flex items-start gap-3">
                    <Avatar name={r.author_name} src={r.author_avatar} size={36} />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-ink">{r.author_name}</p>
                        <span className="text-caption text-ink-3">{timeAgo(r.created_at)}</span>
                      </div>
                      <RatingStars value={r.stars} />
                      {r.comment && <p className="mt-1.5 text-sm text-ink-2">{r.comment}</p>}
                      {r.reply && (
                        <div className="mt-2 rounded-xl bg-surface-2 p-3 text-sm">
                          <p className="text-caption font-semibold uppercase text-ink-3">Reply from {store.name}</p>
                          <p className="mt-0.5 text-ink-2">{r.reply}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'about' && (
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">About {store.name}</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{store.description || 'This store has not written a description yet.'}</p>
            <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-caption uppercase text-ink-3">Category</dt><dd className="text-ink">{categoryLabel(store.category)}</dd></div>
              <div><dt className="text-caption uppercase text-ink-3">Location</dt><dd className="text-ink">{store.location || store.city}</dd></div>
              <div><dt className="text-caption uppercase text-ink-3">Delivery fee</dt><dd className="text-ink">{new Intl.NumberFormat('en-UG').format(Number(store.delivery_fee_ugx))} UGX</dd></div>
              <div><dt className="text-caption uppercase text-ink-3">On Duka since</dt><dd className="text-ink">{new Date(store.created_at).toLocaleDateString('en-UG', { month: 'short', year: 'numeric' })}</dd></div>
            </dl>
          </Card>
          <div className="flex flex-col gap-4">
            <Card padding="lg">
              <h2 className="font-display text-h3 font-medium text-brand-green-deep">Contact</h2>
              <div className="mt-3 flex flex-col gap-2">
                {store.contact_phone && <a href={`tel:${store.contact_phone}`} className="flex min-h-[44px] items-center gap-2 text-sm text-ink hover:text-brand-green"><Phone size={16} /> {store.contact_phone}</a>}
                {store.whatsapp && <a href={`https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="flex min-h-[44px] items-center gap-2 text-sm text-ink hover:text-brand-green"><MessageCircle size={16} /> WhatsApp</a>}
                {!store.contact_phone && !store.whatsapp && <p className="text-sm text-ink-3">Order through Duka and the store will reach you on your number.</p>}
              </div>
            </Card>
            {store.policies && (
              <Card padding="lg">
                <h2 className="font-display text-h3 font-medium text-brand-green-deep">Store policies</h2>
                <p className="mt-2 whitespace-pre-line text-sm text-ink-2">{store.policies}</p>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
