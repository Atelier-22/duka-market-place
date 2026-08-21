import { useState } from 'react';
import { Clock, MapPin, Truck } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
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

/**
 * The shopper's "done shopping" tick.
 *
 * Two outcomes: set off now, which starts the customer's ETA countdown, or
 * defer to a time already agreed with the customer by phone — which records
 * the arrangement without starting any clock. Deferring is a normal choice
 * here, not an exception.
 */
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
      <GlassCard hover={false} className="mt-4">
        <p className="flex items-center gap-2 font-medium text-brand-green-deep">
          <Truck size={17} strokeWidth={1.75} /> Delivering now
        </p>
        <p className="mt-1 text-sm text-brand-ink/60">
          {sharingLocation
            ? 'The customer can see you moving on their map.'
            : locationError ?? 'Turn on location sharing so the customer can follow you.'}
        </p>
        {!sharingLocation && locationError && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-brand-red">
            <MapPin size={13} strokeWidth={2} /> {locationError}
          </p>
        )}
      </GlassCard>
    );
  }

  if (deliveryDeferredTo) {
    return (
      <GlassCard hover={false} className="mt-4">
        <p className="flex items-center gap-2 font-medium text-brand-green-deep">
          <Clock size={17} strokeWidth={1.75} /> Delivery scheduled
        </p>
        <p className="mt-1 text-sm text-brand-ink/60">
          Agreed for {new Date(deliveryDeferredTo).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}.
          Come back and start the delivery when you set off.
        </p>
        <GlassButton size="sm" className="mt-3" disabled={busy} onClick={() => submit(true)}>
          <Truck size={15} strokeWidth={2} /> Start delivering now
        </GlassButton>
      </GlassCard>
    );
  }

  return (
    <GlassCard glow="green" hover={false} className="mt-4">
      <p className="font-medium text-brand-green-deep">
        {shoppingDoneAt ? 'Shopping done — what next?' : 'Finished shopping?'}
      </p>
      <p className="mt-1 text-sm text-brand-ink/60">
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
          <div className="flex flex-wrap gap-2">
            <GlassButton disabled={busy} onClick={() => submit(true)}>
              <Truck size={16} strokeWidth={2} /> Done shopping — deliver now
            </GlassButton>
            <GlassButton variant="secondary" disabled={busy} onClick={() => setMode('defer')}>
              <Clock size={16} strokeWidth={2} /> Deliver later
            </GlassButton>
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
            <GlassButton disabled={busy} onClick={() => submit(false)}>
              Save scheduled time
            </GlassButton>
            <GlassButton variant="ghost" disabled={busy} onClick={() => setMode('idle')}>
              Cancel
            </GlassButton>
          </div>
        </div>
      )}
    </GlassCard>
  );
}
