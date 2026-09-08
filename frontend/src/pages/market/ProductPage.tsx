import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Check, Mail, MapPin, MessageCircle, Minus, Package, Phone, Plus, ShoppingBag, ShoppingCart, Star, Store as StoreIcon, Truck, Users } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePageMeta } from '../../hooks/usePageMeta';
import { StructuredData } from '../../components/seo/StructuredData';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { RatingStars } from '../../components/ui/RatingStars';
import { Avatar } from '../../components/ui/Avatar';
import { ImageLightbox } from '../../components/ui/ImageLightbox';
import { Bone, SkeletonRegion } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { ProductCard } from '../../components/market/ProductCard';
import { FollowButton } from '../../components/market/FollowButton';
import { PhotoCarousel } from '../../components/market/PhotoCarousel';
import { VerifiedBadge } from '../../components/market/VerifiedBadge';
import { useCart } from '../../market/cart';
import { PublicProduct, PublicProductDetail } from '../../market/types';
import { categoryLabel, conditionLabel, formatUgx, timeAgo } from '../../market/format';

export function ProductPage() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const cart = useCart();
  const [data, setData] = useState<{ product: PublicProductDetail; following: boolean; related: PublicProduct[] } | null>(null);
  const [missing, setMissing] = useState(false);
  const [variationId, setVariationId] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [colour, setColour] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setData(null);
    setMissing(false);
    setVariationId(null);
    setQty(1);
    api.get(`/marketplace/products/${id}`).then((r) => setData(r.data)).catch(() => setMissing(true));
  }, [id]);

  const product = data?.product;

  const versions = useMemo(() => {
    const out: { value: string; priceUgx: number; available: number }[] = [];
    for (const v of product?.variations ?? []) {
      if (!v.value) continue;
      const found = out.find((o) => o.value === v.value);
      if (found) found.available += v.available;
      else out.push({ value: v.value, priceUgx: v.priceUgx, available: v.available });
    }
    return out;
  }, [product]);

  const colours = useMemo(() => {
    const out: { name: string; hex: string | null }[] = [];
    for (const v of product?.variations ?? []) {
      if (!v.colorName || out.some((o) => o.name === v.colorName)) continue;
      out.push({ name: v.colorName, hex: v.colorHex });
    }
    return out;
  }, [product]);

  const stockFor = (ver: string | null, col: string | null) =>
    (product?.variations ?? []).filter((v) => (ver === null || v.value === ver) && (col === null || v.colorName === col)).reduce((s, v) => s + v.available, 0);

  useEffect(() => {
    if (!product || product.variations.length === 0) return;
    if (versions.length > 0 && version === null) {
      const first = versions.find((v) => v.available > 0) ?? versions[0];
      setVersion(first.value);
      return;
    }
    if (colours.length > 0 && colour === null) {
      const first = colours.find((c) => stockFor(version, c.name) > 0) ?? colours[0];
      setColour(first.name);
    }
  }, [product, versions, colours, version, colour]);

  useEffect(() => {
    if (!product || product.variations.length === 0) return;
    const match = product.variations.find((v) => (versions.length === 0 || v.value === version) && (colours.length === 0 || v.colorName === colour));
    setVariationId(match?.id ?? null);
  }, [product, versions.length, colours.length, version, colour]);

  const variation = useMemo(() => product?.variations.find((v) => v.id === variationId) ?? null, [product, variationId]);
  const price = variation ? variation.priceUgx : product?.priceUgx ?? 0;
  const available = variation ? variation.available : product?.available ?? 0;
  const needsVariation = (product?.variations.length ?? 0) > 0 && !variation;

  usePageMeta({
    title: product ? `${product.name} · ${product.storeDetail.name}` : 'Product',
    description: product ? `${formatUgx(product.priceUgx)} from ${product.storeDetail.name} on Duka. ${product.description?.slice(0, 120) ?? ''}` : undefined,
    image: product?.images[0] || undefined,
  });

  if (missing) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <EmptyState icon={<Package />} title="This product is not available" description="It may have sold out or been removed by the store." action={<Link to="/marketplace"><Button>Back to the marketplace</Button></Link>} />
      </div>
    );
  }

  if (!product) {
    return (
      <SkeletonRegion label="Loading product" className="mx-auto max-w-6xl px-4 pb-16 pt-4 sm:px-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Bone className="aspect-square w-full rounded-3xl" />
          <div><Bone className="h-7 w-3/4" /><Bone className="mt-3 h-6 w-1/3" /><Bone className="mt-6 h-11 w-full" /></div>
        </div>
      </SkeletonRegion>
    );
  }

  const store = product.storeDetail;
  const fulfilment = store.fulfilment ?? 'delivery';
  const sellerOnly = user?.role === 'seller';

  function addToCart(): boolean {
    if (!product) return false;
    if (needsVariation) { push('Choose one of the options first', 'error'); return false; }
    if (available <= 0) return false;
    if (sellerOnly) { push('Switch to your customer account to buy', 'error'); return false; }
    cart.add({
      productId: product.id,
      variationId: variation?.id ?? null,
      name: product.name,
      variationLabel: variation ? variation.label : null,
      unitPriceUgx: price,
      imageUrl: product.images[0] ?? null,
      storeId: store.id,
      storeName: store.name,
      storeSlug: store.slug,
      deliveryFeeUgx: store.deliveryFeeUgx ?? 0,
      fulfilment,
      storeLocation: store.location ?? null,
      maxQuantity: available,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    return true;
  }

  function buyNow() {
    if (addToCart()) navigate('/cart');
  }

  function askShopper() {
    const params = new URLSearchParams({
      title: product!.name,
      description: `Please pick this up from ${store.name}${store.location ? ` (${store.location}, ${store.city})` : ` in ${store.city}`}. Listed at ${formatUgx(price)} on their Duka store: ${window.location.origin}/product/${product!.id}`,
      budget: String(price),
    });
    if (!user) {
      try { sessionStorage.setItem('duka_return_to', `/app/requests/new?${params.toString()}`); } catch { /* storage unavailable */ }
      navigate('/register?role=customer');
      return;
    }
    if (user.role !== 'customer') { push('Switch to your customer account to post a request', 'error'); return; }
    navigate(`/app/requests/new?${params.toString()}`);
  }

  const contacts = [
    store.contactPhone ? { href: `tel:${store.contactPhone}`, label: 'Call', icon: Phone } : null,
    store.whatsapp ? { href: `https://wa.me/${store.whatsapp.replace(/[^0-9]/g, '')}`, label: 'WhatsApp', icon: MessageCircle, external: true } : null,
    store.contactEmail ? { href: `mailto:${store.contactEmail}`, label: 'Email', icon: Mail } : null,
  ].filter(Boolean) as { href: string; label: string; icon: typeof Phone; external?: boolean }[];

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description ?? undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    category: categoryLabel(product.category),
    aggregateRating: product.ratingCount > 0 ? { '@type': 'AggregateRating', ratingValue: product.ratingAvg, reviewCount: product.ratingCount } : undefined,
    offers: {
      '@type': 'Offer',
      url: `https://www.dukashoppers.com/product/${product.id}`,
      priceCurrency: 'UGX',
      price: product.priceUgx,
      itemCondition: product.condition === 'new' ? 'https://schema.org/NewCondition' : product.condition === 'used' ? 'https://schema.org/UsedCondition' : 'https://schema.org/RefurbishedCondition',
      availability: product.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      seller: { '@type': 'Organization', name: store.name },
    },
  };

  const canBuy = available > 0 && !sellerOnly;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 sm:px-6 with-action-bar md:pb-16">
      <StructuredData id={`product-${product.id}`} data={schema} />
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-caption text-ink-3">
        <Link to="/marketplace" className="hover:text-brand-green">Marketplace</Link>
        <span>/</span>
        <Link to={`/marketplace?category=${product.category}`} className="hover:text-brand-green">{categoryLabel(product.category)}</Link>
        <span>/</span>
        <span className="truncate text-ink-2">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <PhotoCarousel images={product.images} alt={product.name} onOpen={(i) => setLightbox(i)} />

        <div>
          <p className="text-label font-semibold uppercase tracking-wide text-ink-3">{product.brand || categoryLabel(product.category)}{product.model ? ` · ${product.model}` : ''}</p>
          <h1 className="mt-1 font-display text-h2 font-medium text-brand-green-deep sm:text-h1">{product.name}</h1>
          {product.ratingCount > 0 && (
            <p className="mt-2 flex items-center gap-2 text-sm text-ink-2">
              <RatingStars value={product.ratingAvg} /> {product.ratingAvg.toFixed(1)} · {product.ratingCount} review{product.ratingCount === 1 ? '' : 's'}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-baseline gap-3">
            <span className="font-display text-3xl font-semibold text-brand-green-deep">{formatUgx(price)}</span>
            {product.discountPercent > 0 && !variation && (
              <>
                <span className="text-body text-ink-3 line-through">{formatUgx(product.listPriceUgx)}</span>
                <span className="rounded-full bg-brand-red px-2 py-0.5 text-caption font-semibold text-white">-{product.discountPercent}%{product.promotionName ? ` · ${product.promotionName}` : ''}</span>
              </>
            )}
          </div>
          <p className={`mt-2 text-sm font-medium ${available > 0 ? 'text-brand-green' : 'text-brand-red'}`}>
            {available > 0 ? (product.lowStock || available <= 5 ? `Only ${available} left` : 'In stock') : 'Out of stock'} · {conditionLabel(product.condition)}
          </p>

          {versions.length > 0 && (
            <fieldset className="mt-5 rounded-2xl border border-line bg-surface p-3">
              <legend className="px-1 text-sm font-semibold text-ink">Choose {product.variations[0].name.length <= 24 ? product.variations[0].name.toLowerCase() : 'a version'}</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {versions.map((v) => {
                  const selected = version === v.value;
                  const out = v.available <= 0;
                  return (
                    <button key={v.value} type="button" onClick={() => { if (!out) { setVersion(v.value); setColour(null); setQty(1); } }} aria-pressed={selected} aria-disabled={out}
                      className={`flex min-h-[48px] flex-col items-start rounded-xl border px-4 py-1.5 text-left text-sm font-medium transition-colors ${selected ? 'border-brand-green bg-brand-green-mist text-brand-green-deep ring-2 ring-brand-green/30' : out ? 'border-dashed border-line text-ink-3' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}>
                      <span className="flex items-center gap-1.5">{selected && <Check size={14} strokeWidth={2.5} />}{v.value}</span>
                      <span className="text-caption font-normal">{out ? 'Sold out' : formatUgx(v.priceUgx)}</span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          {colours.length > 0 && (
            <fieldset className="mt-4 rounded-2xl border border-line bg-surface p-3">
              <legend className="px-1 text-sm font-semibold text-ink">Choose a colour{colour ? <span className="font-normal text-ink-2">: {colour}</span> : ''}</legend>
              <div className="mt-1 flex flex-wrap gap-2">
                {colours.map((c) => {
                  const left = stockFor(versions.length ? version : null, c.name);
                  const selected = colour === c.name;
                  const out = left <= 0;
                  return (
                    <button key={c.name} type="button" onClick={() => { if (!out) { setColour(c.name); setQty(1); } }} aria-pressed={selected} aria-disabled={out} aria-label={`${c.name}, ${out ? 'sold out' : `${left} in stock`}`}
                      className={`flex min-h-[48px] items-center gap-2.5 rounded-xl border px-3 py-1.5 text-sm font-medium transition-colors ${selected ? 'border-brand-green bg-brand-green-mist text-brand-green-deep ring-2 ring-brand-green/30' : out ? 'border-dashed border-line text-ink-3' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}>
                      <span className={`relative h-7 w-7 shrink-0 rounded-full border border-black/10 ${out ? 'opacity-40' : ''}`} style={{ background: c.hex ?? '#9CA3AF' }} aria-hidden>
                        {selected && <Check size={14} strokeWidth={3} className="absolute inset-0 m-auto text-white drop-shadow" />}
                      </span>
                      <span className="flex flex-col items-start leading-tight"><span>{c.name}</span><span className="text-caption font-normal">{out ? 'Sold out' : `${left} in stock`}</span></span>
                    </button>
                  );
                })}
              </div>
            </fieldset>
          )}

          <div className="mt-5 flex items-center gap-3">
            <div className="flex items-center rounded-xl border border-line">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} className="flex h-11 w-11 items-center justify-center text-ink-2" aria-label="Decrease quantity"><Minus size={16} /></button>
              <span className="w-10 text-center text-sm font-semibold tabular-nums">{qty}</span>
              <button type="button" onClick={() => setQty((q) => Math.min(Math.max(1, available), q + 1))} className="flex h-11 w-11 items-center justify-center text-ink-2" aria-label="Increase quantity"><Plus size={16} /></button>
            </div>
            <span className="text-caption text-ink-3">{available > 0 ? `${available} available` : ''}</span>
          </div>

          <div className="mt-4 hidden gap-3 md:flex">
            <Button size="lg" onClick={addToCart} disabled={!canBuy} className="flex-1">
              {added ? <><Check size={18} /> Added</> : <><ShoppingCart size={18} /> Add to cart</>}
            </Button>
            {fulfilment === 'shopper'
              ? <Button size="lg" variant="secondary" onClick={askShopper} className="flex-1"><Users size={18} /> Ask a shopper</Button>
              : <Button size="lg" variant="secondary" onClick={buyNow} disabled={!canBuy} className="flex-1">Buy now</Button>}
          </div>

          <Card className="mt-6" padding="md">
            <div className="flex items-center gap-3">
              <Link to={`/store/${store.slug}`} className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-green-mist text-brand-green-deep">
                {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <StoreIcon size={22} />}
              </Link>
              <div className="min-w-0 flex-1">
                <p className="text-label font-semibold uppercase text-ink-3">Sold by</p>
                <Link to={`/store/${store.slug}`} className="block truncate font-medium text-ink hover:text-brand-green">{store.name}</Link>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-ink-3">
                  {store.isVerified && <VerifiedBadge size="sm" />}
                  {store.ratingCount > 0 && <span className="flex items-center gap-1"><Star size={11} className="fill-brand-yellow text-brand-yellow" /> {store.ratingAvg.toFixed(1)} ({store.ratingCount})</span>}
                  {typeof store.followerCount === 'number' && <span className="flex items-center gap-1"><Users size={11} /> {store.followerCount}</span>}
                </p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-1.5 text-sm text-ink-2"><MapPin size={14} className="shrink-0 text-brand-green" /> {store.location ? `${store.location}, ${store.city}` : store.city}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link to={`/store/${store.slug}`}><Button variant="secondary" size="sm">View store</Button></Link>
              {(!user || user.id !== store.id) && !sellerOnly && (
                <FollowButton slug={store.slug} size="sm" following={data!.following} followerCount={store.followerCount ?? 0} onChange={(next) => setData((d) => d && ({ ...d, following: next.following, product: { ...d.product, storeDetail: { ...d.product.storeDetail, followerCount: next.followerCount } } }))} />
              )}
              {contacts.map((c) => (
                <a key={c.label} href={c.href} target={c.external ? '_blank' : undefined} rel={c.external ? 'noreferrer' : undefined} className="inline-flex min-h-[36px] items-center gap-1.5 rounded-xl border border-line bg-surface px-3 text-sm font-medium text-ink hover:border-line-strong"><c.icon size={14} className="text-brand-green" /> {c.label}</a>
              ))}
            </div>
          </Card>

          <div className="mt-4 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
            {fulfilment === 'delivery' && (
              <p className="flex items-start gap-2"><Truck size={16} className="mt-0.5 shrink-0 text-brand-green" /><span>{product.deliveryInfo || 'Delivered by the store.'} Delivery {store.deliveryFeeUgx ? formatUgx(store.deliveryFeeUgx) : 'free'}, paid on delivery.</span></p>
            )}
            {fulfilment === 'pickup' && (
              <p className="flex items-start gap-2"><StoreIcon size={16} className="mt-0.5 shrink-0 text-brand-green" /><span><span className="font-medium text-ink">Find us at the shop.</span> {store.location ? `${store.location}, ${store.city}.` : `${store.city}.`} Order here and collect in person; no delivery fee.</span></p>
            )}
            {fulfilment === 'shopper' && (
              <div>
                <p className="flex items-start gap-2"><ShoppingBag size={16} className="mt-0.5 shrink-0 text-brand-green" /><span><span className="font-medium text-ink">This store does not deliver.</span> Ask a Duka shopper to pick it up from {store.location ? `${store.location}, ${store.city}` : store.city} and bring it to your door, or collect it yourself.</span></p>
                <Button size="sm" className="mt-3" onClick={askShopper}><Users size={15} /> Ask a shopper to bring it</Button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-3">
        <Card padding="lg" className="md:col-span-2">
          <h2 className="font-display text-h3 font-medium text-brand-green-deep">Description</h2>
          <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-2">{product.description || 'No description provided.'}</p>
        </Card>
        <Card padding="lg">
          <h2 className="font-display text-h3 font-medium text-brand-green-deep">Details</h2>
          <dl className="mt-3 flex flex-col gap-2 text-sm">
            <div className="flex justify-between gap-3"><dt className="text-ink-3">Condition</dt><dd className="text-ink">{conditionLabel(product.condition)}</dd></div>
            {product.brand && <div className="flex justify-between gap-3"><dt className="text-ink-3">Brand</dt><dd className="text-ink">{product.brand}</dd></div>}
            {product.model && <div className="flex justify-between gap-3"><dt className="text-ink-3">Model</dt><dd className="text-ink">{product.model}</dd></div>}
            {product.specifications.map((s) => (
              <div key={s.label} className="flex justify-between gap-3"><dt className="text-ink-3">{s.label}</dt><dd className="text-right text-ink">{s.value}</dd></div>
            ))}
          </dl>
        </Card>
      </div>

      <section className="mt-10">
        <h2 className="font-display text-h3 font-medium text-brand-green-deep">Reviews</h2>
        {product.reviews.length === 0 ? (
          <p className="mt-2 text-sm text-ink-3">No reviews yet. Buyers can review after their order is complete.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {product.reviews.map((r) => (
              <Card key={r.id} padding="md">
                <div className="flex items-start gap-3">
                  <Avatar name={r.author_name} src={r.author_avatar} size={32} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-ink">{r.author_name}</p><span className="text-caption text-ink-3">{timeAgo(r.created_at)}</span></div>
                    <RatingStars value={r.stars} />
                    {r.comment && <p className="mt-1 text-sm text-ink-2">{r.comment}</p>}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {data!.related.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-h3 font-medium text-brand-green-deep">More like this</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {data!.related.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <div className="fixed inset-x-0 bottom-[var(--duka-nav-height,0px)] z-30 border-t border-line bg-surface p-3 md:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-caption text-ink-3">{product.name}</p>
            <p className="font-display text-lg font-semibold text-brand-green-deep">{formatUgx(price * qty)}</p>
          </div>
          {fulfilment === 'shopper' && <Button size="lg" variant="secondary" onClick={askShopper} aria-label="Ask a shopper"><Users size={18} /></Button>}
          <Button size="lg" onClick={addToCart} disabled={!canBuy} className="ml-auto flex-1">
            {added ? <><Check size={18} /> Added</> : <><ShoppingCart size={18} /> Add to cart</>}
          </Button>
        </div>
      </div>

      {lightbox !== null && product.images[lightbox] && (
        <ImageLightbox src={product.images[lightbox]} alt={product.name} caption={`${product.name} · photo ${lightbox + 1} of ${product.images.length}`} onClose={() => setLightbox(null)} />
      )}
    </div>
  );
}
