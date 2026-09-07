import { Link } from 'react-router-dom';
import { BadgeCheck, MapPin, Star, Store as StoreIcon, Users } from 'lucide-react';
import { PublicStore } from '../../market/types';
import { categoryLabel } from '../../market/format';

export function StoreCard({ store }: { store: PublicStore }) {
  return (
    <Link
      to={`/store/${store.slug}`}
      className="surface flex items-center gap-3 rounded-2xl p-3 shadow-card transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-raised focus-visible:outline-none focus-visible:shadow-focus active:scale-[0.99]"
    >
      <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-brand-green-mist text-brand-green-deep">
        {store.logo_url ? <img src={store.logo_url} alt="" className="h-full w-full object-cover" loading="lazy" /> : <StoreIcon size={22} strokeWidth={1.7} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5">
          <span className="truncate font-medium text-ink">{store.name}</span>
          {store.is_verified && <BadgeCheck size={15} strokeWidth={2} className="shrink-0 text-brand-green" />}
        </span>
        <span className="mt-0.5 block truncate text-caption text-ink-3">
          {categoryLabel(store.category)} · <MapPin size={11} className="inline" /> {store.city}
        </span>
        <span className="mt-1 flex items-center gap-3 text-caption text-ink-2">
          {Number(store.rating_count) > 0 && (
            <span className="flex items-center gap-1"><Star size={11} className="fill-brand-yellow text-brand-yellow" /> {Number(store.rating_avg).toFixed(1)}</span>
          )}
          <span className="flex items-center gap-1"><Users size={11} /> {store.follower_count}</span>
          <span>{store.product_count} product{store.product_count === 1 ? '' : 's'}</span>
        </span>
      </span>
    </Link>
  );
}
