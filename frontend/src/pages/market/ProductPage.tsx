import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { BadgeCheck, Check, ImageOff, Minus, Package, Plus, ShoppingCart, Star, Store as StoreIcon, Truck } from 'lucide-react';
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
  const [image, setImage] = useState(0);
  const [variationId, setVariationId] = useState<string | null>(null);
  const [qty, setQty] = useState(1);
  const [lightbox, setLightbox] = useState(false);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    setData(null);
    setMissing(false);
    setImage(0);
    setVariationId(null);
    setQty(1);
    api.get(`/marketplace/products/${id}`).then((r) => setData(r.data)).catch(() => setMissing(true));
  }, [id]);

  const product = data?.product;
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

  function addToCart() {
    if (!product) return;
    if (needsVariation) { push(`Choose a ${product.variations[0].name.toLowerCase()} first`, 'error'); return; }
    if (available <= 0) return;
    if (user && user.role === 'seller') { push('Switch to your customer account to buy', 'error'); return; }
    cart.add({
      productId: product.id,
      variationId: variation?.id ?? null,
      name: product.name,
      variationLabel: variation ? `${variation.name}: ${variation.value}` : null,
      unitPriceUgx: price,
      imageUrl: product.images[0] ?? null,
      storeId: product.storeDetail.id,
      storeName: product.storeDetail.name,
      storeSlug: product.storeDetail.slug,
      deliveryFeeUgx: 0,
      maxQuantity: available,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  }

  function buyNow() {
    addToCart();
    if (!needsVariation && available > 0) navigate('/cart');
  }

  const store = product.storeDetail;
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    image: product.images,
    description: product.description ?? undefined,
    brand: product.brand ? { '@type': 'Brand', name: product.brand } : undefined,
    sku: undefined,
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

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6 md:pb-16">
      <StructuredData id={`product-${product.id}`} data={schema} />
      <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1.5 text-caption text-ink-3">
        <Link to="/marketplace" className="hover:text-brand-green">Marketplace</Link>
        <span>/</span>
        <Link to={`/marketplace?category=${product.category}`} className="hover:text-brand-green">{categoryLabel(product.category)}</Link>
        <span>/</span>
        <span className="truncate text-ink-2">{product.name}</span>
      </nav>

      <div className="grid gap-6 md:grid-cols-2 lg:gap-10">
        <div>
          <button
            type="button"
            onClick={() => product.images.length && setLightbox(true)}
            className="surface block aspect-square w-full overflow-hidden rounded-3xl shadow-card"
            aria-label="Open photo full screen"
          >
            {product.images[image] ? (
              <img src={product.images[image]} alt={product.name} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-ink-3"><ImageOff size={40} strokeWidth={1.4} /></div>
            )}
          </button>
          {product.images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {product.images.map((src, i) => (
                <button key={src + i} type="button" onClick={() => setImage(i)} className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 ${i === image ? 'border-brand-green' : 'border-transparent'}`} aria-label={`Photo ${i + 1}`}>
                  <img src={src} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

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

          {product.variations.length > 0 && (
            <fieldset className="mt-5">
              <legend className="text-sm font-medium text-ink">{product.variations[0].name}</legend>
              <div className="mt-2 flex flex-wrap gap-2">
                {product.variations.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { setVariationId(v.id); setQty(1); }}
                    disabled={v.available <= 0}
                    aria-pressed={variationId === v.id}
                    className={`min-h-[44px] rounded-xl border px-4 text-sm font-medium transition-colors disabled:opacity-40 ${variationId === v.id ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}
                  >
                    {v.value}{v.priceUgx !== product.priceUgx ? ` · ${formatUgx(v.priceUgx)}` : ''}
                  </button>
                ))}
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
            <Button size="lg" onClick={addToCart} disabled={available <= 0} className="flex-1">
              {added ? <><Check size={18} /> Added</> : <><ShoppingCart size={18} /> Add to cart</>}
            </Button>
            <Button size="lg" variant="secondary" onClick={buyNow} disabled={available <= 0} className="flex-1">Buy now</Button>
          </div>

          <Card className="mt-6" padding="md">
            <p className="text-label font-semibold uppercase text-ink-3">Sold by</p>
            <div className="mt-2 flex items-center gap-3">
              <Link to={`/store/${store.slug}`} className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-green-mist text-brand-green-deep">
                {store.logoUrl ? <img src={store.logoUrl} alt="" className="h-full w-full object-cover" /> : <StoreIcon size={20} />}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to={`/store/${store.slug}`} className="flex items-center gap-1.5 font-medium text-ink hover:text-brand-green">
                  <span className="truncate">{store.name}</span>
                  {store.isVerified && <BadgeCheck size={16} className="shrink-0 text-brand-green" aria-label="Verified" />}
                </Link>
                <p className="text-caption text-ink-3">
                  {store.ratingCount > 0 ? <><Star size={11} className="inline fill-brand-yellow text-brand-yellow" /> {store.ratingAvg.toFixed(1)} · </> : null}{store.city}
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Link to={`/store/${store.slug}`} className="flex-1"><Button variant="secondary" size="sm" fullWidth>View store</Button></Link>
              {(!user || user.id !== store.id) && (
                <FollowButton
                  slug={store.slug}
                  size="sm"
                  following={data!.following}
                  followerCount={0}
                  onChange={(next) => setData((d) => d && ({ ...d, following: next.following }))}
                />
              )}
            </div>
          </Card>

          <div className="mt-4 flex items-start gap-2 rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
            <Truck size={16} className="mt-0.5 shrink-0 text-brand-green" />
            <span>{product.deliveryInfo || 'Delivered by the store. Pay on delivery.'}</span>
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
          <p className="mt-2 text-sm text-ink-3">No reviews yet. Buyers can review after delivery.</p>
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

      <div className="fixed inset-x-0 bottom-[calc(var(--duka-nav-height,0px))] z-30 border-t border-line bg-surface p-3 md:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-caption text-ink-3">{product.name}</p>
            <p className="font-display text-lg font-semibold text-brand-green-deep">{formatUgx(price * qty)}</p>
          </div>
          <Button size="lg" onClick={addToCart} disabled={available <= 0} className="ml-auto flex-1">
            {added ? <><Check size={18} /> Added</> : <><ShoppingCart size={18} /> Add to cart</>}
          </Button>
        </div>
      </div>

      {lightbox && product.images[image] && (
        <ImageLightbox src={product.images[image]} alt={product.name} caption={product.name} onClose={() => setLightbox(false)} />
      )}
    </div>
  );
}
