import { useCallback, useEffect, useState } from 'react';

export type PermissionState = 'granted' | 'denied' | 'prompt' | 'unsupported';

/**
 * The browser's own location permission, which is a different thing from the
 * `share_location` preference we store.
 *
 * The preference is the person's answer to us and follows their account to a
 * new device. This is whether *this browser* will actually hand over a
 * position, and it cannot be set from script — only asked for once, and never
 * re-asked after a denial. Both matter: wanting to share is useless if the
 * browser is blocking, and a granted browser is useless if they asked us not to.
 */
export function useLocationPermission() {
  const [state, setState] = useState<PermissionState>('prompt');
  const [busy, setBusy] = useState(false);

  const read = useCallback(async () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setState('unsupported');
      return;
    }
    // Safari lacked navigator.permissions for a long time; when it is missing
    // the honest answer is "we do not know until we ask".
    if (!navigator.permissions?.query) return;
    try {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      setState(status.state as PermissionState);
      status.onchange = () => setState(status.state as PermissionState);
    } catch {
      // Leave it at 'prompt' — asking is still allowed.
    }
  }, []);

  useEffect(() => { void read(); }, [read]);

  /**
   * Triggers the browser's prompt. Resolves with the outcome rather than a
   * bare boolean: "denied" and "could not get a fix" need different wording,
   * and reading `state` back after the await would see the stale value from
   * the render that started the call.
   */
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
