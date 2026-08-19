import { ShopperOffer } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { RatingStars } from '../ui/RatingStars';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

interface ShopperOfferCardProps {
  offer: ShopperOffer;
  onAccept?: () => void;
  accepting?: boolean;
}

/** Lets a customer compare shoppers on rating, fee, and estimated time — per the brief. */
export function ShopperOfferCard({ offer, onAccept, accepting }: ShopperOfferCardProps) {
  const totalFee = offer.shopping_fee_ugx + offer.delivery_fee_ugx;
  return (
    <GlassCard hover={false} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-display text-base font-medium text-brand-green-deep">{offer.shopper_name}</p>
          <RatingStars value={offer.rating_avg ?? 0} count={offer.rating_count ?? 0} />
        </div>
        <span className="rounded-full bg-brand-yellow/15 px-2.5 py-1 text-xs font-semibold text-yellow-800">
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
    </GlassCard>
  );
}
