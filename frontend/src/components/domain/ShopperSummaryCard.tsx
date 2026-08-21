import { useState } from 'react';
import { BadgeCheck, MessageCircle, Phone } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { RatingStars } from '../ui/RatingStars';
import { ShopperProfileModal } from './ShopperProfileModal';

export interface OrderShopper {
  id: string;
  full_name: string;
  avatar_url: string | null;
  phone: string | null;
  verification_status: string | null;
  rating_avg: number | string | null;
  rating_count: number | null;
  completed_jobs: number | null;
  operating_area: string | null;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

/**
 * The "who is bringing my things" card on a customer's order.
 *
 * Until now the order page named a status and drew a map, and never said whose
 * dot that was. Name, face, rating and whether their ID was checked, with the
 * two things a customer actually wants to do next — message or call — right
 * there rather than a page away.
 */
export function ShopperSummaryCard({ shopper, onMessage }: { shopper: OrderShopper; onMessage: () => void }) {
  const [showProfile, setShowProfile] = useState(false);
  const verified = shopper.verification_status === 'approved';

  return (
    <GlassCard hover={false}>
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Your shopper</p>

      <div className="flex items-center gap-3">
        <button type="button" onClick={() => setShowProfile(true)} aria-label="View shopper profile" className="shrink-0">
          {shopper.avatar_url ? (
            <img src={shopper.avatar_url} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh text-base font-semibold text-white">
              {initials(shopper.full_name)}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => setShowProfile(true)} className="flex items-center gap-1.5 text-left">
            <span className="truncate font-display text-base font-medium text-brand-green-deep">
              {shopper.full_name}
            </span>
            {verified && <BadgeCheck size={15} strokeWidth={2} className="shrink-0 text-brand-green-fresh" />}
          </button>
          <RatingStars value={Number(shopper.rating_avg ?? 0)} count={shopper.rating_count ?? 0} />
          <p className="mt-0.5 text-xs text-brand-ink/45">
            {shopper.completed_jobs ?? 0} jobs done
            {shopper.operating_area ? ` · ${shopper.operating_area}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          className="rounded-full border border-brand-green/15 px-3 py-1.5 text-xs font-medium text-brand-green-deep transition-colors hover:bg-brand-green-mist"
        >
          View profile
        </button>
        <button
          type="button"
          onClick={onMessage}
          className="flex items-center gap-1.5 rounded-full border border-brand-green/15 px-3 py-1.5 text-xs font-medium text-brand-green-deep transition-colors hover:bg-brand-green-mist"
        >
          <MessageCircle size={13} strokeWidth={2} /> Message
        </button>
        {shopper.phone && (
          <a
            href={`tel:${shopper.phone}`}
            className="flex items-center gap-1.5 rounded-full border border-brand-green/15 px-3 py-1.5 text-xs font-medium text-brand-green-deep transition-colors hover:bg-brand-green-mist"
          >
            <Phone size={13} strokeWidth={2} /> Call
          </a>
        )}
      </div>

      {showProfile && <ShopperProfileModal shopperId={shopper.id} onClose={() => setShowProfile(false)} />}
    </GlassCard>
  );
}
