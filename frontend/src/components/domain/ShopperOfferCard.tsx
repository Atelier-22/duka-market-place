import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { ShopperOffer } from '../../types';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { RatingStars } from '../ui/RatingStars';
import { ShopperProfileModal } from './ShopperProfileModal';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

interface ShopperOfferCardProps {
  offer: ShopperOffer;
  onAccept?: () => void;
  accepting?: boolean;
}

export function ShopperOfferCard({ offer, onAccept, accepting }: ShopperOfferCardProps) {
  const [showProfile, setShowProfile] = useState(false);
  const totalFee = Number(offer.shopping_fee_ugx) + Number(offer.delivery_fee_ugx);
  const verified = offer.verification_status === 'approved';
  const name = offer.shopper_name ?? 'Shopper';

  return (
    <Card hover={false} className="flex flex-col gap-4">
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          aria-label={`View ${name}'s profile`}
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Avatar name={name} src={offer.shopper_avatar} size={48} />
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="flex max-w-full items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:shadow-focus"
          >
            <span className="truncate font-display text-h3 font-medium text-brand-green-deep">{name}</span>
            {verified && (
              <>
                <BadgeCheck size={16} strokeWidth={2} className="shrink-0 text-brand-green-fresh" aria-hidden />
                <span className="sr-only">Verified</span>
              </>
            )}
          </button>
          <div className="mt-0.5">
            <RatingStars value={Number(offer.rating_avg ?? 0)} count={offer.rating_count ?? 0} />
          </div>
          <Button variant="link" onClick={() => setShowProfile(true)} className="mt-1">
            View profile
          </Button>
        </div>

        <span className="surface-2 shrink-0 rounded-full px-2.5 py-1 text-caption font-semibold tabular-nums text-ink-2">
          {offer.completed_jobs ?? 0} jobs done
        </span>
      </div>

      <dl className="flex flex-col gap-2 text-small">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-ink-2">Shopping + delivery fee</dt>
          <dd className="shrink-0 font-semibold tabular-nums text-ink">{formatUgx(totalFee)}</dd>
        </div>
        {offer.estimated_minutes && (
          <div className="flex items-center justify-between gap-3">
            <dt className="text-ink-2">Estimated time</dt>
            <dd className="shrink-0 font-medium tabular-nums text-ink">~{offer.estimated_minutes} min</dd>
          </div>
        )}
      </dl>

      {offer.message && (
        <p className="surface-2 rounded-lg px-3.5 py-3 text-small text-ink-2">{offer.message}</p>
      )}

      {onAccept && (
        <Button onClick={onAccept} loading={accepting} fullWidth>
          {accepting ? 'Accepting…' : 'Choose this shopper'}
        </Button>
      )}

      {showProfile && (
        <ShopperProfileModal shopperId={offer.shopper_id} onClose={() => setShowProfile(false)} />
      )}
    </Card>
  );
}
