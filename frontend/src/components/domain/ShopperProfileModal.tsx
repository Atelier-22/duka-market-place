import { ReactNode, useEffect, useState } from 'react';
import { BadgeCheck, Briefcase, CalendarDays, MapPin } from 'lucide-react';
import { api } from '../../services/api';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { RatingStars } from '../ui/RatingStars';
import { Bone, BoneCircle, BoneText, SkeletonRegion } from '../ui/Skeleton';
import { ZoomableImage } from '../ui/ZoomableImage';
import { PresenceDot } from './PresenceDot';

interface ShopperProfileModalProps {
  shopperId: string;
  onClose: () => void;
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2 px-3 py-3 text-center">
      <p className="font-display text-h3 font-medium text-brand-green-deep">{value}</p>
      <p className="mt-0.5 text-label font-semibold uppercase text-ink-3">{label}</p>
    </div>
  );
}

export function ShopperProfileModal({ shopperId, onClose }: ShopperProfileModalProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/shoppers/${shopperId}/public-profile`)
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load this shopper's profile."));
  }, [shopperId]);

  const profile = data?.profile;
  const reviews: any[] = data?.reviews ?? [];
  const verified = profile?.verification_status === 'approved';

  return (
    <Modal open onClose={onClose} title="Shopper profile" maxWidth="max-w-md">
      {error ? (
        <p role="alert" className="py-8 text-center text-small text-brand-red">{error}</p>
      ) : !profile ? (
        <SkeletonRegion label="Loading profile" className="flex flex-col items-center py-2">
          <BoneCircle size={96} />
          <Bone className="mt-3 h-6 w-40" />
          <BoneText w="w-24" className="mt-2.5" />
          <div className="mt-6 grid w-full grid-cols-3 gap-2">
            <Bone className="h-16 w-full rounded-xl" />
            <Bone className="h-16 w-full rounded-xl" />
            <Bone className="h-16 w-full rounded-xl" />
          </div>
          <BoneText w="w-full" className="mt-6" />
          <BoneText w="w-4/5" className="mt-2" />
        </SkeletonRegion>
      ) : (
        <>
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              {profile.avatar_url ? (
                <ZoomableImage
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  caption={profile.full_name}
                  wrapperClassName="h-24 w-24 rounded-full"
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <Avatar name={profile.full_name} size={96} />
              )}
              <PresenceDot online={!!profile.is_active_now} variant="avatar" className="h-4 w-4" />
            </div>

            <p className="mt-3 flex items-center gap-1.5 font-display text-h2 font-medium text-brand-green-deep">
              {profile.full_name}
              {verified && (
                <BadgeCheck size={20} strokeWidth={2} className="shrink-0 text-brand-green-fresh" aria-label="Verified" />
              )}
            </p>

            <div className="mt-1.5">
              <RatingStars value={Number(profile.rating_avg ?? 0)} count={profile.rating_count ?? 0} />
            </div>

            <span
              className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-caption font-semibold ${
                verified
                  ? 'border-brand-green-fresh/30 bg-brand-green-mist text-brand-green-deep'
                  : 'border-brand-yellow/40 bg-warning-soft text-warning'
              }`}
            >
              <BadgeCheck size={13} strokeWidth={2} />
              {verified ? 'ID verified by Duka' : 'Not yet verified'}
            </span>
          </div>

          <div className="mt-5 grid grid-cols-3 gap-2">
            <Stat label="Jobs done" value={profile.completed_jobs ?? 0} />
            <Stat label="Completed" value={`${Math.round(Number(profile.completion_rate ?? 0))}%`} />
            <Stat label="Reviews" value={profile.rating_count ?? 0} />
          </div>

          {profile.bio && (
            <p className="mt-5 rounded-xl border border-line bg-surface-2 p-4 text-small leading-relaxed text-ink-2">
              {profile.bio}
            </p>
          )}

          <div className="mt-4 flex flex-col gap-2 text-small text-ink-2">
            {profile.operating_area && (
              <p className="flex items-center gap-2">
                <MapPin size={15} strokeWidth={1.75} className="shrink-0 text-ink-3" aria-hidden />
                Works around {profile.operating_area}
              </p>
            )}
            {profile.specialties?.length > 0 && (
              <p className="flex items-start gap-2">
                <Briefcase size={15} strokeWidth={1.75} className="mt-0.5 shrink-0 text-ink-3" aria-hidden />
                <span className="capitalize">{profile.specialties.join(', ').replace(/_/g, ' ')}</span>
              </p>
            )}
            {profile.joined_at && (
              <p className="flex items-center gap-2">
                <CalendarDays size={15} strokeWidth={1.75} className="shrink-0 text-ink-3" aria-hidden />
                On Duka since{' '}
                {new Date(profile.joined_at).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>

          <div className="mt-6 border-t border-line pt-4">
            <p className="text-label font-semibold uppercase text-ink-3">What customers said</p>
            {reviews.length === 0 ? (
              <p className="mt-3 text-small text-ink-3">
                No reviews yet — this shopper is new, or hasn't been rated.
              </p>
            ) : (
              <ul className="mt-2 flex flex-col">
                {reviews.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-b border-line py-2.5 last:border-0">
                    <span className="min-w-0">
                      <span className="block truncate text-small font-medium text-ink">{r.rated_by_name}</span>
                      <span className="block text-caption text-ink-3">
                        {new Date(r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </span>
                    <RatingStars value={r.stars} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </Modal>
  );
}
