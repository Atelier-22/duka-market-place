import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../services/api';

export interface TrackingState {
  trackable: boolean;
  status: string;
  shopper: { lat: number; lng: number; accuracyM: number | null; recordedAt: string } | null;
  /** The customer's live position, when they are sharing it. */
  customer: { lat: number; lng: number; accuracyM: number | null; recordedAt: string } | null;
  destination: { lat: number; lng: number; label: string } | null;
  /** Present even when the address has no coordinates on it. */
  deliveryAddressId: string | null;
  deliveryAddressLabel: string | null;
  destinationPinned: boolean;
  distanceMetres: number | null;
  etaMinutes: number | null;
  isNearby: boolean;
  shoppingDoneAt: string | null;
  deliveryStartedAt: string | null;
  deliveryEtaMinutes: number | null;
  deliveryDeferredTo: string | null;
}

/** How often the customer's map asks for a fresh position. */
const POLL_MS = 15_000;

/** Reads the shopper's live position for an order. */
export function useOrderTracking(orderId: string | undefined, enabled: boolean) {
  const [tracking, setTracking] = useState<TrackingState | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await api.get(`/orders/${orderId}/tracking`);
      setTracking(res.data);
    } catch {
      // Tracking is supplementary; a failed poll must not break the order page.
    }
  }, [orderId]);

  useEffect(() => {
    if (!enabled || !orderId) return;
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [enabled, orderId, load]);

  return { tracking, refresh: load };
}

/** How often the shopper's browser reports where it is. */
const BROADCAST_MS = 20_000;

/**
 * Publishes the shopper's position for an order while `active` is true.
 *
 * Location is only ever read with the browser's permission, only while a job
 * is genuinely in flight, and the watch is torn down the moment it isn't —
 * this must never become a background tracker.
 */
export function useBroadcastPosition(orderId: string | undefined, active: boolean) {
  const [error, setError] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!active || !orderId) {
      setSharing(false);
      return;
    }
    if (!('geolocation' in navigator)) {
      setError('This device cannot share its location.');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setError(null);
        setSharing(true);
        // watchPosition can fire far more often than we want to write rows.
        const now = Date.now();
        if (now - lastSent.current < BROADCAST_MS) return;
        lastSent.current = now;

        api.post(`/orders/${orderId}/location`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracyM: pos.coords.accuracy,
        }).catch((err) => {
          // Swallowing this is how a broken broadcast stayed invisible: the
          // browser said "sharing", the server refused every write, and nobody
          // found out until someone asked why the map was empty.
          setSharing(false);
          setError(apiErrorMessage(err));
          // Let the next fix retry rather than waiting out the throttle.
          lastSent.current = 0;
        });
      },
      (err) => {
        setSharing(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? 'Location sharing is off — the customer cannot see you on the map.'
            : 'Could not read your location.'
        );
      },
      { enableHighAccuracy: true, maximumAge: 10_000, timeout: 20_000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      setSharing(false);
    };
  }, [active, orderId]);

  return { sharing, error };
}
