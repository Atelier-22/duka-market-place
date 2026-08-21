import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { ShopperOffer } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { RatingStars } from '../ui/RatingStars';
import { ShopperProfileModal } from './ShopperProfileModal';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

interface ShopperOfferCardProps {
  offer: ShopperOffer;
  onAccept?: () => void;
  accepting?: boolean;
}

/** Lets a customer compare shoppers on rating, fee, and estimated time — per the brief. */
export function ShopperOfferCard({ offer, onAccept, accepting }: ShopperOfferCardProps) {
  const [showProfile, setShowProfile] = useState(false);
  const totalFee = Number(offer.shopping_fee_ugx) + Number(offer.delivery_fee_ugx);
  const verified = offer.verification_status === 'approved';
  const name = offer.shopper_name ?? 'Shopper';

  return (
    <GlassCard hover={false} className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        {/* A face, not just a name — this is the person coming to your door. */}
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          aria-label={`View ${name}'s profile`}
          className="shrink-0"
        >
          {offer.shopper_avatar ? (
            <img src={offer.shopper_avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
          ) : (
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh text-sm font-semibold text-white">
              {initials(name)}
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="flex items-center gap-1.5 text-left"
          >
            <span className="truncate font-display text-base font-medium text-brand-green-deep">{name}</span>
            {verified && <BadgeCheck size={15} strokeWidth={2} className="shrink-0 text-brand-green-fresh" />}
          </button>
          <RatingStars value={Number(offer.rating_avg ?? 0)} count={offer.rating_count ?? 0} />
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="mt-1 text-xs font-medium text-brand-green-deep hover:underline"
          >
            View profile
          </button>
        </div>

        <span className="shrink-0 rounded-full bg-brand-yellow/15 px-2.5 py-1 text-xs font-semibold text-yellow-800">
          {offer.completed_jobs ?? 0} jobs done
        </span>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-brand-ink/60">Shopping + delivery fee</span>
        <span className="font-semibold text-brand-ink">{formatUgx(totalFee)}</span>
      </div>
      {offer.estimated_minutes && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-brand-ink/60">Estimated time</span>
          <span className="font-medium text-brand-ink">~{offer.estimated_minutes} min</span>
        </div>
      )}
      {offer.message && <p className="rounded-lg bg-brand-green-mist/60 p-3 text-sm text-brand-ink/70">{offer.message}</p>}
      {onAccept && (
        <GlassButton onClick={onAccept} disabled={accepting} size="sm" fullWidth>
          {accepting ? 'Accepting…' : 'Choose this shopper'}
        </GlassButton>
      )}

      {showProfile && (
        <ShopperProfileModal shopperId={offer.shopper_id} onClose={() => setShowProfile(false)} />
      )}
    </GlassCard>
  );
}
