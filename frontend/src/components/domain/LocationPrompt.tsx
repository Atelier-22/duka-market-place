import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { usePreferences } from '../../context/PreferencesContext';
import { useLocationPermission } from '../../hooks/useLocationPermission';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { useToast } from '../ui/Toast';

const SNOOZE_DAYS = 7;

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

    const t = setTimeout(() => setVisible(true), 1200);
    return () => clearTimeout(t);
  }, [user, loaded, preferences.share_location, preferences.location_prompt_dismissed_at, state]);

  const snooze = useCallback(async () => {
    setVisible(false);
    await update({ locationPromptDismissedAt: new Date().toISOString() });
  }, [update]);

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

  return (
    <Modal
      open={visible}
      onClose={snooze}
      title="Turn on location?"
      description={
        user?.role === 'shopper'
          ? 'It lets your customer watch you arrive, and shows you where you are taking each order. Without it you only get a written address.'
          : 'It lets your shopper find you and lets you watch your order arrive. A written address alone is not a point on a map.'
      }
      maxWidth="max-w-md"
    >
      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button onClick={enable} loading={busy} fullWidth>
          {busy ? 'Asking…' : 'Turn on location'}
        </Button>
        <Button variant="secondary" onClick={snooze} fullWidth>
          Not now
        </Button>
      </div>
      <p className="mt-3 text-center text-caption text-ink-3">
        You can change this any time in Settings.
      </p>
    </Modal>
  );
}
