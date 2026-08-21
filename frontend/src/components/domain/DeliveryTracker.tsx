import { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, CircleAlert } from 'lucide-react';
import { LazyLiveMap } from './LazyLiveMap';
import { PinLocationButton } from './PinLocationButton';
import { TrackingState } from '../../hooks/useOrderTracking';
import { GlassCard } from '../ui/GlassCard';

function formatDistance(metres: number): string {
  return metres < 1000 ? `${metres} m away` : `${(metres / 1000).toFixed(1)} km away`;
}

/** Counts down from the ETA recorded when delivery started. */
function useCountdown(startedAt: string | null, etaMinutes: number | null) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!startedAt || !etaMinutes) return;
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, [startedAt, etaMinutes]);

  if (!startedAt || !etaMinutes) return null;
  const elapsedMin = (now - new Date(startedAt).getTime()) / 60_000;
  return Math.round(etaMinutes - elapsedMin);
}

/**
 * The customer's live view of a delivery: where the shopper is, how far away,
 * and how long the countdown has left. Shown only while the order is actually
 * in flight.
 */
export function DeliveryTracker({
  tracking,
  sharingLocation = false,
  locationError = null,
  onPinned,
}: {
  tracking: TrackingState | null;
  /** Whether this browser is currently publishing the customer's position. */
  sharingLocation?: boolean;
  /** Why it isn't, when it isn't — permission, or a rejected write. */
  locationError?: string | null;
  /** Refresh tracking after the address gains coordinates. */
  onPinned?: () => void;
}) {
  const remaining = useCountdown(tracking?.deliveryStartedAt ?? null, tracking?.deliveryEtaMinutes ?? null);

  if (!tracking || !tracking.trackable) return null;

  const deferred = tracking.deliveryDeferredTo;

  return (
    <GlassCard padding="lg" hover={false} className="mt-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Live tracking</p>
          <p className="mt-1 font-display text-lg font-medium text-brand-green-deep">
            {tracking.isNearby
              ? 'Your shopper is almost there'
              : tracking.shopper
              ? 'Your shopper is on the move'
              : 'Waiting for your shopper to share their location'}
          </p>
        </div>
        {tracking.distanceMetres !== null && (
          <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-green-mist px-3 py-1.5 text-sm font-semibold text-brand-green-deep">
            <Navigation size={14} strokeWidth={2} />
            {formatDistance(tracking.distanceMetres)}
          </span>
        )}
      </div>

      {deferred && (
        <div className="mt-4 flex items-start gap-2 rounded-xl bg-yellow-50 px-4 py-3 text-sm text-yellow-800">
          <Clock size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>
            Delivery was scheduled for later, at{' '}
            <strong>{new Date(deferred).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}</strong>.
            The countdown starts when your shopper sets off.
          </span>
        </div>
      )}

      {remaining !== null && !deferred && (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-green-mist px-4 py-3 text-sm text-brand-green-deep">
          <Clock size={16} strokeWidth={2} className="shrink-0" />
          {remaining > 0
            ? <span>Arriving in about <strong>{remaining} min</strong></span>
            : <span>Should have arrived — check with your shopper if not.</span>}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl2 border border-brand-green/10">
        <LazyLiveMap
          you={tracking.customer ? { lat: tracking.customer.lat, lng: tracking.customer.lng, label: 'You' } : null}
          them={tracking.shopper ? { lat: tracking.shopper.lat, lng: tracking.shopper.lng, label: 'Your shopper' } : null}
          destination={tracking.destination}
        />
      </div>

      {!tracking.shopper && (
        <p className="mt-3 flex items-center gap-2 text-xs text-brand-ink/45">
          <CircleAlert size={13} strokeWidth={2} />
          Your shopper hasn't shared their location yet. The map updates as soon as they do.
        </p>
      )}
      {tracking.deliveryAddressLabel && (
        <p className="mt-3 flex items-center gap-2 text-xs text-brand-ink/45">
          <MapPin size={13} strokeWidth={2} />
          Delivering to {tracking.deliveryAddressLabel}
        </p>
      )}

      {/* An unpinned address is the single reason a shopper's map comes up
          empty, so it gets a prompt rather than a quiet status line. */}
      {!tracking.destinationPinned && tracking.deliveryAddressId && (
        <div className="mt-3 rounded-xl bg-brand-yellow-soft/60 px-4 py-3">
          <p className="text-sm text-yellow-900">
            Your shopper can't see where to bring this. "{tracking.deliveryAddressLabel}" is
            written down, but it isn't a point on the map — pin it while you're at the address.
          </p>
          <div className="mt-3">
            <PinLocationButton
              addressId={tracking.deliveryAddressId}
              pinned={false}
              onPinned={onPinned}
            />
          </div>
        </div>
      )}

      {/* Say plainly whether the shopper can see them right now. */}
      {tracking.destinationPinned && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-xs">
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${sharingLocation ? 'bg-brand-green-fresh' : 'bg-brand-ink/25'}`} />
            <span className="text-brand-ink/45">
              {sharingLocation
                ? 'Your shopper can also see you moving in real time.'
                : 'Your delivery point is pinned. Allow location to also share where you are right now.'}
            </span>
          </p>
          {tracking.deliveryAddressId && (
            <PinLocationButton addressId={tracking.deliveryAddressId} pinned onPinned={onPinned} />
          )}
        </div>
      )}

      {locationError && (
        <p className="mt-2 flex items-start gap-2 text-xs font-medium text-brand-red">
          <CircleAlert size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
          {locationError}
        </p>
      )}
    </GlassCard>
  );
}
