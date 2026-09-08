import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ImageOff, Star } from 'lucide-react';
import { PublicProduct } from '../../market/types';
import { formatUgx } from '../../market/format';

const SLIDE_MS = 5000;
const MAX_SLIDES = 4;

export function ProductCard({ product, showStore = true }: { product: PublicProduct; showStore?: boolean }) {
  const images = useMemo(() => {
    const list = product.images && product.images.length > 0 ? product.images : product.imageUrl ? [product.imageUrl] : [];
    return list.slice(0, MAX_SLIDES);
  }, [product.images, product.imageUrl]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    const offset = Math.floor(Math.random() * SLIDE_MS);
    let timer: ReturnType<typeof setInterval> | null = null;
    const start = setTimeout(() => {
      timer = setInterval(() => {
        if (document.hidden) return;
        setIndex((i) => (i + 1) % images.length);
      }, SLIDE_MS);
    }, offset);
    return () => { clearTimeout(start); if (timer) clearInterval(timer); };
  }, [images.length]);

  return (
    <Link
      to={`/product/${product.id}`}
      className="surface group flex h-full flex-col overflow-hidden rounded-2xl shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.99]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        {images.length === 0 ? (
          <div className="flex h-full w-full items-center justify-center text-ink-3">
            <ImageOff size={28} strokeWidth={1.5} />
          </div>
        ) : (
          images.map((src, i) => (
            <img
              key={src + i}
              src={src}
              alt={i === 0 ? product.name : ''}
              loading={i === 0 ? 'lazy' : 'lazy'}
              decoding="async"
              aria-hidden={i !== index}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out ${i === index ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.03] motion-safe:transition-[opacity,transform] motion-safe:duration-700`}
            />
          ))
        )}
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-1.5 flex items-center justify-center gap-1">
            {images.map((_, i) => <span key={i} className={`h-1 rounded-full bg-white transition-all duration-300 ${i === index ? 'w-3 opacity-100' : 'w-1 opacity-60'}`} />)}
          </div>
        )}
        {product.discountPercent > 0 && (
          <span className="absolute left-2 top-2 rounded-full bg-brand-red px-2 py-0.5 text-caption font-semibold text-white">
            -{product.discountPercent}%
          </span>
        )}
        {!product.inStock && (
          <span className="absolute inset-x-0 bottom-0 bg-ink/70 py-1 text-center text-caption font-semibold text-white">Out of stock</span>
        )}
        {product.inStock && product.lowStock && (
          <span className="absolute right-2 top-2 rounded-full bg-warning-soft px-2 py-0.5 text-caption font-semibold text-warning">Few left</span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-medium leading-snug text-ink">{product.name}</p>
        <div className="mt-2 flex items-baseline gap-2">
          <span className="font-display text-base font-semibold text-brand-green-deep">{formatUgx(product.priceUgx)}</span>
          {product.discountPercent > 0 && (
            <span className="text-caption text-ink-3 line-through">{formatUgx(product.listPriceUgx)}</span>
          )}
        </div>
        {product.ratingCount > 0 && (
          <p className="mt-1 flex items-center gap-1 text-caption text-ink-2">
            <Star size={12} strokeWidth={2} className="fill-brand-yellow text-brand-yellow" />
            {product.ratingAvg.toFixed(1)} <span className="text-ink-3">({product.ratingCount})</span>
          </p>
        )}
        {showStore && product.store && (
          <p className="mt-auto flex items-center gap-1 pt-2 text-caption text-ink-3">
            <span className="truncate">{product.store.name}</span>
            {product.store.isVerified && <BadgeCheck size={12} strokeWidth={2} className="shrink-0 text-brand-green" />}
          </p>
        )}
      </div>
    </Link>
  );
}
