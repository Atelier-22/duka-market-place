import { useState } from 'react';
import { Crosshair } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

interface PinLocationButtonProps {
  addressId: string;

  pinned: boolean;
  onPinned?: () => void;
}

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
    <Button size="sm" variant="secondary" loading={working} onClick={pinHere}>
      {!working && <Crosshair size={15} strokeWidth={2} />}
      {working ? 'Finding you…' : pinned ? 'Update pinned location' : 'Pin my exact location'}
    </Button>
  );
}
