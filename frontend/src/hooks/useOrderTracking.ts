import { useCallback, useEffect, useRef, useState } from 'react';
import { api, apiErrorMessage } from '../services/api';

export interface TrackingState {
  trackable: boolean;
  status: string;
  shopper: { lat: number; lng: number; recordedAt: string } | null;

  customer: { lat: number; lng: number; recordedAt: string } | null;
  destination: { lat: number; lng: number; label: string } | null;

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

const POLL_MS = 15_000;

export function useOrderTracking(orderId: string | undefined, enabled: boolean) {
  const [tracking, setTracking] = useState<TrackingState | null>(null);

  const load = useCallback(async () => {
    if (!orderId) return;
    try {
      const res = await api.get(`/orders/${orderId}/tracking`);
      setTracking(res.data);
    } catch {
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

const BROADCAST_MS = 20_000;

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

        const now = Date.now();
        if (now - lastSent.current < BROADCAST_MS) return;
        lastSent.current = now;

        api.post(`/orders/${orderId}/location`, {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }).catch((err) => {
          setSharing(false);
          setError(apiErrorMessage(err));

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
