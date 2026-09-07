import { useState } from 'react';
import { BadgeCheck, MessageCircle, Phone, User } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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

export function ShopperSummaryCard({ shopper, onMessage }: { shopper: OrderShopper; onMessage: () => void }) {
  const [showProfile, setShowProfile] = useState(false);
  const verified = shopper.verification_status === 'approved';

  return (
    <Card hover={false}>
      <p className="text-label font-semibold uppercase text-ink-3">Your shopper</p>

      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={() => setShowProfile(true)}
          aria-label="View shopper profile"
          className="shrink-0 rounded-full focus-visible:outline-none focus-visible:shadow-focus"
        >
          <Avatar name={shopper.full_name} src={shopper.avatar_url} size={56} />
        </button>

        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => setShowProfile(true)}
            className="flex max-w-full items-center gap-1.5 rounded-sm text-left focus-visible:outline-none focus-visible:shadow-focus"
          >
            <span className="truncate font-display text-h3 font-medium text-brand-green-deep">
              {shopper.full_name}
            </span>
            {verified && (
              <>
                <BadgeCheck size={16} strokeWidth={2} className="shrink-0 text-brand-green-fresh" aria-hidden />
                <span className="sr-only">Verified</span>
              </>
            )}
          </button>
          <div className="mt-0.5">
            <RatingStars value={Number(shopper.rating_avg ?? 0)} count={shopper.rating_count ?? 0} />
          </div>
          <p className="mt-0.5 text-caption text-ink-3">
            {shopper.completed_jobs ?? 0} jobs done
            {shopper.operating_area ? ` · ${shopper.operating_area}` : ''}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="secondary" onClick={() => setShowProfile(true)}>
          <User size={15} strokeWidth={2} /> View profile
        </Button>
        <Button size="sm" variant="secondary" onClick={onMessage}>
          <MessageCircle size={15} strokeWidth={2} /> Message
        </Button>
        {shopper.phone && (
          <a href={`tel:${shopper.phone}`} className="inline-flex">
            <Button size="sm" variant="secondary" tabIndex={-1}>
              <Phone size={15} strokeWidth={2} /> Call
            </Button>
          </a>
        )}
      </div>

      {showProfile && <ShopperProfileModal shopperId={shopper.id} onClose={() => setShowProfile(false)} />}
    </Card>
  );
}
