import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MapPin, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { GlassButton } from '../ui/GlassButton';
import { useToast } from '../ui/Toast';

/** How long a "not now" lasts before we may ask again. */
const SNOOZE_DAYS = 7;

/**
 * Asks once, on sign-in or refresh, if location has never been turned on.
 *
 * Occasional by construction: dismissing it records the time on the account, so
 * the next ask is a week away and follows the person to another device rather
 * than resetting every time they clear a browser. It never appears for someone
 * who has already said yes, and never for someone whose browser has denied it —
 * we cannot re-ask there, so a prompt would just be noise they cannot act on.
 */
export function LocationPrompt() {
  const { user } = useAuth();
  const { preferences, loaded, update } = usePreferences();
  const { state, busy, request } = useLocationPermission();
  const { push } = useToast();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!user || !loaded) return;
    if (preferences.share_location) return;
    if (state === 'granted' || state === 'denied' || state === 'unsupported') return;

    const dismissed = preferences.location_prompt_dismissed_at;
    if (dismissed) {
      const days = (Date.now() - new Date(dismissed).getTime()) / 86_400_000;
      if (days < SNOOZE_DAYS) return;
    }
    // A beat after load, so it does not fight the page painting itself.
    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [user, loaded, preferences.share_location, preferences.location_prompt_dismissed_at, state]);

  async function snooze() {
    setVisible(false);
    await update({ locationPromptDismissedAt: new Date().toISOString() });
  }

  async function enable() {
    const outcome = await request();
    if (outcome !== 'granted') {
      push('Could not turn on location. You can enable it any time in Settings.', 'error');
      await snooze();
      return;
    }
    setVisible(false);
    await update({ shareLocation: true, locationPromptDismissedAt: null });
    push('Location on — your shopper can find you.', 'success');
  }

  if (!visible) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-brand-ink/40 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-prompt-title"
    >
      <div
        className="glass w-full max-w-md rounded-t-2xl p-6 sm:rounded-2xl"
        style={{ paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-start justify-between gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green-deep">
            <MapPin size={20} strokeWidth={1.9} />
          </span>
          <button
            type="button"
            onClick={snooze}
            aria-label="Not now"
            className="flex h-8 w-8 items-center justify-center rounded-full text-brand-ink/40 hover:bg-brand-green-mist"
          >
            <X size={17} strokeWidth={2} />
          </button>
        </div>

        <h2 id="location-prompt-title" className="mt-3 font-display text-lg font-medium text-brand-green-deep">
          Turn on location?
        </h2>
        <p className="mt-1.5 text-sm text-brand-ink/60">
          {user?.role === 'shopper'
            ? 'It lets your customer watch you arrive, and shows you where you are taking each order. Without it you only get a written address.'
            : 'It lets your shopper find you and lets you watch your order arrive. A written address alone is not a point on a map.'}
        </p>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
          <GlassButton onClick={enable} disabled={busy} fullWidth>
            {busy ? 'Asking…' : 'Turn on location'}
          </GlassButton>
          <GlassButton variant="secondary" onClick={snooze} fullWidth>
            Not now
          </GlassButton>
        </div>
        <p className="mt-3 text-center text-xs text-brand-ink/40">
          You can change this any time in Settings.
        </p>
      </div>
    </div>,
    document.body
  );
}
