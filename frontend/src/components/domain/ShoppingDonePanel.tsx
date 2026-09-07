import { useState } from 'react';
import { Clock, MapPin, Truck } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

interface ShoppingDonePanelProps {
  orderId: string;
  shoppingDoneAt: string | null;
  deliveryStartedAt: string | null;
  deliveryDeferredTo: string | null;
  sharingLocation: boolean;
  locationError: string | null;
  onDone: () => void;
}

/** A sub-section at the foot of the route card, separated by a hairline rather than another card. */
const SECTION = 'mt-5 border-t border-line pt-4';
const HEADING = 'flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep';

export function ShoppingDonePanel({
  orderId, shoppingDoneAt, deliveryStartedAt, deliveryDeferredTo,
  sharingLocation, locationError, onDone,
}: ShoppingDonePanelProps) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<'idle' | 'defer'>('idle');
  const [eta, setEta] = useState('30');
  const [deferTo, setDeferTo] = useState('');

  async function submit(startNow: boolean) {
    if (!startNow && !deferTo) {
      push('Pick the time you agreed with the customer', 'error');
      return;
    }
    setBusy(true);
    try {
      await api.post(`/orders/${orderId}/shopping-done`, {
        startDeliveryNow: startNow,
        etaMinutes: startNow ? Number(eta) || 30 : undefined,
        deferredTo: startNow ? undefined : new Date(deferTo).toISOString(),
      });
      push(startNow ? 'Delivery started — the customer can see your ETA' : 'Delivery scheduled', 'success');
      onDone();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  if (deliveryStartedAt) {
    return (
      <section className={SECTION}>
        <h3 className={HEADING}>
          <Truck size={18} strokeWidth={1.75} className="shrink-0 text-brand-green" /> Delivering now
        </h3>
        <p className="mt-1 text-small text-ink-2">
          {sharingLocation
            ? 'The customer can see you moving on their map.'
            : locationError ?? 'Turn on location sharing so the customer can follow you.'}
        </p>
        {!sharingLocation && locationError && (
          <p role="alert" className="mt-2 flex items-center gap-1.5 text-caption font-medium text-brand-red">
            <MapPin size={13} strokeWidth={2} className="shrink-0" /> {locationError}
          </p>
        )}
      </section>
    );
  }

  if (deliveryDeferredTo) {
    return (
      <section className={SECTION}>
        <h3 className={HEADING}>
          <Clock size={18} strokeWidth={1.75} className="shrink-0 text-brand-green" /> Delivery scheduled
        </h3>
        <p className="mt-1 text-small text-ink-2">
          Agreed for {new Date(deliveryDeferredTo).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}.
          Come back and start the delivery when you set off.
        </p>
        <Button size="sm" className="mt-3" disabled={busy} onClick={() => submit(true)}>
          <Truck size={15} strokeWidth={2} /> Start delivering now
        </Button>
      </section>
    );
  }

  return (
    <section className={SECTION}>
      <h3 className={HEADING}>
        {shoppingDoneAt ? 'Shopping done — what next?' : 'Finished shopping?'}
      </h3>
      <p className="mt-1 text-small text-ink-2">
        Starting the delivery begins the countdown the customer sees. If you agreed to drop it off later, schedule it instead.
      </p>

      {mode === 'idle' ? (
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label="Estimated minutes to arrive"
            type="number"
            value={eta}
            onChange={(e) => setEta(e.target.value)}
          />
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              fullWidth
              disabled={busy}
              onClick={() => submit(true)}
              className="!h-auto min-h-[44px] py-2.5 sm:w-auto"
            >
              <Truck size={16} strokeWidth={2} className="shrink-0" />
              <span className="whitespace-normal">Set off now — start the customer's countdown</span>
            </Button>
            <Button fullWidth variant="secondary" disabled={busy} onClick={() => setMode('defer')} className="sm:w-auto">
              <Clock size={16} strokeWidth={2} /> Deliver later
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex flex-col gap-3">
          <Input
            label="Agreed delivery time"
            type="datetime-local"
            value={deferTo}
            onChange={(e) => setDeferTo(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button disabled={busy} onClick={() => submit(false)}>
              Save scheduled time
            </Button>
            <Button variant="tertiary" disabled={busy} onClick={() => setMode('idle')}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}
