import { useEffect, useState } from 'react';
import { BadgeCheck, Briefcase, CalendarDays, MapPin, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { api } from '../../services/api';
import { RatingStars } from '../ui/RatingStars';
import { LoadingState } from '../ui/LoadingState';
import { ZoomableImage } from '../ui/ZoomableImage';
import { PresenceDot } from './PresenceDot';

interface ShopperProfileModalProps {
  shopperId: string;
  onClose: () => void;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-xl bg-brand-green-mist/50 px-3 py-2.5 text-center">
      <p className="font-display text-lg font-medium text-brand-green-deep">{value}</p>
      <p className="mt-0.5 text-[11px] uppercase tracking-wide text-brand-ink/45">{label}</p>
    </div>
  );
}

/**
 * Who is doing your shopping.
 *
 * A customer is about to hand a stranger money and their home address, so the
 * things that answer "can I trust this person" lead: their face, whether their
 * ID has been checked, their rating, and what other customers said. Presented
 * as a sheet rather than a page so it can be opened from an offer, an order, or
 * a chat without losing where you were.
 */
export function ShopperProfileModal({ shopperId, onClose }: ShopperProfileModalProps) {
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get(`/shoppers/${shopperId}/public-profile`)
      .then((res) => setData(res.data))
      .catch(() => setError("Could not load this shopper's profile."));
  }, [shopperId]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  const profile = data?.profile;
  const reviews: any[] = data?.reviews ?? [];
  const verified = profile?.verification_status === 'approved';

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Shopper profile"
      onClick={onClose}
      className="fixed inset-0 z-[90] flex items-end justify-center bg-brand-ink/40 backdrop-blur-sm sm:items-center"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-t-2xl border border-brand-green/15 p-6 shadow-xl sm:rounded-2xl"
      >
        <div className="flex justify-end">
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-brand-ink/40 hover:bg-brand-green-mist hover:text-brand-green-deep"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>

        {error ? (
          <p className="py-10 text-center text-sm text-brand-red">{error}</p>
        ) : !profile ? (
          <LoadingState label="Loading profile…" />
        ) : (
          <>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                {profile.avatar_url ? (
                  // Tappable: a photo you cannot enlarge is not much use for
                  // recognising someone at a gate.
                  <ZoomableImage
                    src={profile.avatar_url}
                    alt={profile.full_name}
                    caption={profile.full_name}
                    wrapperClassName="h-24 w-24 rounded-full"
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh text-2xl font-semibold text-white">
                    {initials(profile.full_name)}
                  </span>
                )}
                <PresenceDot online={!!profile.is_active_now} variant="avatar" className="h-4 w-4" />
              </div>

              <h2 className="mt-3 flex items-center gap-1.5 font-display text-xl font-medium text-brand-green-deep">
                {profile.full_name}
                {verified && <BadgeCheck size={18} strokeWidth={2} className="text-brand-green-fresh" />}
              </h2>

              <div className="mt-1.5">
                <RatingStars value={Number(profile.rating_avg ?? 0)} count={profile.rating_count ?? 0} />
              </div>

              <span
                className={`mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  verified
                    ? 'bg-brand-green-mist text-brand-green-deep'
                    : 'bg-brand-yellow-soft text-yellow-800'
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
              <p className="mt-5 rounded-xl bg-brand-green-mist/40 p-4 text-sm text-brand-ink/75">
                {profile.bio}
              </p>
            )}

            <div className="mt-4 flex flex-col gap-2 text-sm text-brand-ink/60">
              {profile.operating_area && (
                <p className="flex items-center gap-2">
                  <MapPin size={14} strokeWidth={1.75} className="shrink-0 text-brand-ink/40" />
                  Works around {profile.operating_area}
                </p>
              )}
              {profile.specialties?.length > 0 && (
                <p className="flex items-start gap-2">
                  <Briefcase size={14} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-ink/40" />
                  <span className="capitalize">{profile.specialties.join(', ').replace(/_/g, ' ')}</span>
                </p>
              )}
              {profile.joined_at && (
                <p className="flex items-center gap-2">
                  <CalendarDays size={14} strokeWidth={1.75} className="shrink-0 text-brand-ink/40" />
                  On Duka since{' '}
                  {new Date(profile.joined_at).toLocaleDateString('en-UG', { month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>

            <div className="mt-6 border-t border-brand-green/10 pt-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
                What customers said
              </p>
              {reviews.length === 0 ? (
                <p className="mt-3 text-sm text-brand-ink/45">
                  No reviews yet — this shopper is new, or hasn't been rated.
                </p>
              ) : (
                <div className="mt-3 flex flex-col">
                  {reviews.map((r, i) => (
                    <div key={i} className="flex items-center justify-between border-b border-brand-green/5 py-2.5 last:border-0">
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-brand-ink/75">{r.rated_by_name}</span>
                        <span className="block text-[11px] text-brand-ink/40">
                          {new Date(r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                      </span>
                      <RatingStars value={r.stars} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
