import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassButton } from '../ui/GlassButton';
import { useToast } from '../ui/Toast';

interface PinLocationButtonProps {
  addressId: string;
  /** Already has coordinates — the wording changes from "set" to "update". */
  pinned: boolean;
  onPinned?: () => void;
}

/**
 * Saves the customer's current position onto the delivery address.
 *
 * Live position sharing only works while the customer happens to have the order
 * page open, which is not most of the time. A pinned address is permanent: the
 * shopper gets somewhere to navigate to whether or not the customer is looking
 * at their phone. This is the thing that actually makes the shopper's map
 * useful, so it is a deliberate button rather than a silent background attempt.
 */
export function PinLocationButton({ addressId, pinned, onPinned }: PinLocationButtonProps) {
  const { push } = useToast();
  const [working, setWorking] = useState(false);

  async function pinHere() {
    if (!('geolocation' in navigator)) {
      push('This device cannot share its location.', 'error');
      return;
    }
    setWorking(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await api.patch(`/addresses/${addressId}/pin`, {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          });
          push('Location pinned — your shopper can now find you.', 'success');
          onPinned?.();
        } catch (err) {
          push(apiErrorMessage(err), 'error');
        } finally {
          setWorking(false);
        }
      },
      (err) => {
        setWorking(false);
        push(
          err.code === err.PERMISSION_DENIED
            ? 'Location is blocked. Allow location access for this site, then try again.'
            : 'Could not read your location. Try again outdoors or with GPS on.',
          'error'
        );
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }

  return (
    <GlassButton size="sm" variant={pinned ? 'secondary' : 'primary'} disabled={working} onClick={pinHere}>
      <Crosshair size={15} strokeWidth={2} />
      {working ? 'Finding you…' : pinned ? 'Update pinned location' : 'Pin my exact location'}
    </GlassButton>
  );
}
