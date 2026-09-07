import { Link } from 'react-router-dom';
import { BadgeCheck, ImageOff, Star } from 'lucide-react';
import { PublicProduct } from '../../market/types';
import { formatUgx } from '../../market/format';

export function ProductCard({ product, showStore = true }: { product: PublicProduct; showStore?: boolean }) {
  return (
    <Link
      to={`/product/${product.id}`}
      className="surface group flex h-full flex-col overflow-hidden rounded-2xl shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.99]"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-surface-2">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-ink-3">
            <ImageOff size={28} strokeWidth={1.5} />
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
