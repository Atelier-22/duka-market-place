import { CircleAlert, MapPin } from 'lucide-react';
import { usePreferences } from '../../context/PreferencesContext';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { useToast } from '../ui/Toast';

/**
 * The location switch, shared by Settings and the sign-in prompt so both agree
 * on what "on" means.
 *
 * Turning it on has to do two things in order: get the person's consent stored
 * on their account, and get the browser to actually hand over a position. Doing
 * only the first leaves a switch that says yes while nothing works.
 */
export function LocationSetting({ compact = false }: { compact?: boolean }) {
  const { preferences, update } = usePreferences();
  const { state, busy, request } = useLocationPermission();
  const { push } = useToast();

  const on = preferences.share_location;
  const blocked = state === 'denied';
  const unsupported = state === 'unsupported';

  async function toggle(next: boolean) {
    if (!next) {
      // We can stop using it, but we cannot revoke the browser's permission —
      // only the person can, in their site settings.
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
        className="flex w-full items-center justify-between gap-4 rounded-xl2 border border-brand-green/15 px-4 py-3.5 text-left transition-colors hover:bg-brand-green-mist/50 disabled:opacity-60"
      >
        <span className="flex min-w-0 items-start gap-3">
          <MapPin size={18} strokeWidth={1.75} className="mt-0.5 shrink-0 text-brand-green" />
          <span className="min-w-0">
            <span className="block text-sm font-medium text-brand-ink">Share my location</span>
            <span className="mt-0.5 block text-xs text-brand-ink/50">
              {unsupported
                ? 'This device cannot share its location.'
                : on
                ? 'Your shopper can see where to bring your order, and you can watch them arrive.'
                : 'A written address is not a point on a map. Turning this on is what lets a shopper actually find you.'}
            </span>
          </span>
        </span>
        <span
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            on ? 'bg-brand-green-fresh' : 'bg-brand-ink/20'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              on ? 'left-[22px]' : 'left-0.5'
            }`}
          />
        </span>
      </button>

      {/* A switch that is on while the browser is blocking is a lie — say so. */}
      {on && blocked && (
        <p className="flex items-start gap-2 text-xs font-medium text-brand-red">
          <CircleAlert size={13} strokeWidth={2} className="mt-0.5 shrink-0" />
          You have this on, but your browser is blocking location for this site. Allow it in your
          browser's site settings for Duka, or nothing will be shared.
        </p>
      )}
    </div>
  );
}
