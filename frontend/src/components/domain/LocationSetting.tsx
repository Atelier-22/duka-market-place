import { CircleAlert, MapPin } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { useToast } from '../ui/Toast';

export function LocationSetting({ compact = false }: { compact?: boolean }) {
  const { preferences, update } = usePreferences();
  const { state, busy, request } = useLocationPermission();
  const { push } = useToast();

  const on = preferences.share_location;
  const blocked = state === 'denied';
  const unsupported = state === 'unsupported';

  async function toggle(next: boolean) {
    if (!next) {

      await update({ shareLocation: false });
      return;
    }
    const outcome = state === 'granted' ? 'granted' : await request();
    if (outcome !== 'granted') {
      push(
        outcome === 'denied'
          ? 'Location is blocked for this site. Allow it in your browser settings, then try again.'
          : 'Could not read your location. Try again outdoors or with GPS on.',
        'error'
      );
      return;
    }
    await update({ shareLocation: true });
    push('Location on — your shopper can find you.', 'success');
  }

  return (
    <div className={compact ? '' : 'flex flex-col gap-3'}>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        disabled={busy || unsupported}
        onClick={() => toggle(!on)}
        className={[
          'flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-surface px-4 py-3.5 text-left',
          'transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-none focus-visible:shadow-focus',
          'disabled:opacity-60',
        ].join(' ')}
      >
        <span className="flex min-w-0 items-start gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green">
            <MapPin size={17} strokeWidth={1.8} />
          </span>
          <span className="min-w-0">
            <span className="block text-body font-medium text-ink">Share my location</span>
            <span className="mt-0.5 block text-caption text-ink-3">
              {unsupported
                ? 'This device cannot share its location.'
                : on
                ? 'Your shopper can see where to bring your order, and you can watch them arrive.'
                : 'A written address is not a point on a map. Turning this on is what lets a shopper actually find you.'}
            </span>
          </span>
        </span>
        <span
          aria-hidden
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors duration-200 ${
            on ? 'bg-brand-green' : 'bg-line-strong'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-card transition-[left] duration-200 ${
              on ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>

      {on && blocked && (
        <p role="alert" className={`flex items-start gap-2 text-small text-brand-red ${compact ? 'mt-3' : ''}`}>
          <CircleAlert size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
          <span>
            You have this on, but your browser is blocking location for this site. Allow it in your
            browser's site settings for Duka, or nothing will be shared.
          </span>
        </p>
      )}
    </div>
  );
}
