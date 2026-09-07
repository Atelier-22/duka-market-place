import { useEffect, useState } from 'react';
import { MapPin, Navigation, Clock, CircleAlert } from 'lucide-react';
import { LazyLiveMap } from './LazyLiveMap';
import { PinLocationButton } from './PinLocationButton';
import { TrackingState } from '../../hooks/useOrderTracking';
import { Card } from '../ui/Card';

function formatDistance(metres: number): string {
  return metres < 1000 ? `${metres} m away` : `${(metres / 1000).toFixed(1)} km away`;
}

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

const NOTE = 'rounded-lg border border-brand-yellow/40 bg-warning-soft/50 px-4 py-3';

export function DeliveryTracker({
  tracking,
  sharingLocation = false,
  locationError = null,
  onPinned,
}: {
  tracking: TrackingState | null;

  sharingLocation?: boolean;

  locationError?: string | null;

  onPinned?: () => void;
}) {
  const remaining = useCountdown(tracking?.deliveryStartedAt ?? null, tracking?.deliveryEtaMinutes ?? null);

  if (!tracking || !tracking.trackable) return null;

  const deferred = tracking.deliveryDeferredTo;

  return (
    <Card padding="lg" hover={false} className="mt-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-label font-semibold uppercase text-ink-3">Live tracking</p>
          <h3 className="mt-1 font-display text-h3 font-medium text-brand-green-deep">
            {tracking.isNearby
              ? 'Your shopper is almost there'
              : tracking.shopper
              ? 'Your shopper is on the move'
              : 'Waiting for your shopper to share their location'}
          </h3>
        </div>
        {tracking.distanceMetres !== null && (
          <span className="surface-2 inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-small font-semibold tabular-nums text-ink">
            <Navigation size={14} strokeWidth={2} className="text-brand-green" />
            {formatDistance(tracking.distanceMetres)}
          </span>
        )}
      </div>

      {deferred && (
        <div className={`mt-4 flex items-start gap-2.5 text-small text-ink ${NOTE}`}>
          <Clock size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-warning" />
          <span>
            Delivery was scheduled for later, at{' '}
            <strong className="font-semibold">
              {new Date(deferred).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}
            </strong>.
            The countdown starts when your shopper sets off.
          </span>
        </div>
      )}

      {remaining !== null && !deferred && (
        <div className="surface-2 mt-4 flex items-center gap-3 rounded-lg px-4 py-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green">
            <Clock size={18} strokeWidth={2} />
          </span>
          {remaining > 0 ? (
            <div className="min-w-0">
              <p className="text-caption text-ink-3">Arriving in about</p>
              <p className="font-display text-h2 font-medium tabular-nums text-brand-green-deep">
                {remaining} <span className="text-body font-medium text-ink-2">min</span>
              </p>
            </div>
          ) : (
            <p className="text-small text-ink-2">Should have arrived — check with your shopper if not.</p>
          )}
        </div>
      )}

      <div className="mt-4 overflow-hidden rounded-xl border border-line">
        <LazyLiveMap
          you={tracking.customer ? { lat: tracking.customer.lat, lng: tracking.customer.lng, label: 'You' } : null}
          them={tracking.shopper ? { lat: tracking.shopper.lat, lng: tracking.shopper.lng, label: 'Your shopper' } : null}
          destination={tracking.destination}
        />
      </div>

      {!tracking.shopper && (
        <p className="mt-3 flex items-start gap-2 text-caption text-ink-3">
          <CircleAlert size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
          Your shopper hasn't shared their location yet. The map updates as soon as they do.
        </p>
      )}
      {tracking.deliveryAddressLabel && (
        <p className="mt-3 flex items-start gap-2 text-caption text-ink-3">
          <MapPin size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
          Delivering to {tracking.deliveryAddressLabel}
        </p>
      )}

      {!tracking.destinationPinned && tracking.deliveryAddressId && (
        <div className={`mt-3 ${NOTE}`}>
          <p className="flex items-start gap-2.5 text-small text-ink">
            <CircleAlert size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-warning" />
            <span>
              Your shopper can't see where to bring this. "{tracking.deliveryAddressLabel}" is
              written down, but it isn't a point on the map — pin it while you're at the address.
            </span>
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

      {tracking.destinationPinned && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-caption text-ink-3">
            <span
              aria-hidden
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${sharingLocation ? 'bg-brand-green-fresh' : 'bg-line-strong'}`}
            />
            <span>
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
        <p role="alert" className="mt-3 flex items-start gap-2 text-caption font-medium text-brand-red">
          <CircleAlert size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
          {locationError}
        </p>
      )}
    </Card>
  );
}
