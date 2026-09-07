import { useCallback, useEffect, useState } from 'react';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

export function useLocationPermission() {
  const [state, setState] = useState<PermissionState>('prompt');
  const [busy, setBusy] = useState(false);

  const read = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }

    if (!navigator.permissions?.query) return;
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setState(status.state as PermissionState);
      status.onchange = () => setState(status.state as PermissionState);
    } catch {
    }
  }, []);

  useEffect(() => { void read(); }, [read]);

  const request = useCallback(async (): Promise<'granted' | 'denied' | 'failed'> => {
    if (!('geolocation' in navigator)) {
      setState('unsupported');
      return 'failed';
    }
    setBusy(true);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        () => { setState('granted'); setBusy(false); resolve('granted'); },
        (err) => {
          const denied = err.code === err.PERMISSION_DENIED;
          setState(denied ? 'denied' : 'prompt');
          setBusy(false);
          resolve(denied ? 'denied' : 'failed');
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
      );
    });
  }, []);

  return { state, busy, request, refresh: read };
}
