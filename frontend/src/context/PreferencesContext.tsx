import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export type Theme = 'system' | 'light' | 'dark';
export type Accent =
  | 'green' | 'ocean' | 'sunset' | 'grape' | 'charcoal'
  | 'rose' | 'amber' | 'teal' | 'indigo' | 'crimson'
  | 'lime' | 'plum' | 'sky' | 'copper' | 'forest' | 'slate';
export type Language = 'en' | 'sw' | 'lg';
export type Tone = 'professional' | 'friendly' | 'candid' | 'efficient' | 'encouraging';

export interface Preferences {
  theme: Theme;
  accent: Accent;
  language: Language;
  tone: Tone;
  traits: string[];
  notify_messages: boolean;
  notify_orders: boolean;
  notify_offers: boolean;
  notify_marketing: boolean;
  notify_new_requests: boolean;
  share_location: boolean;
  location_prompt_dismissed_at: string | null;
}

const DEFAULTS: Preferences = {
  theme: 'system',
  accent: 'green',
  language: 'en',
  tone: 'friendly',
  traits: [],
  notify_messages: true,
  notify_orders: true,
  notify_offers: true,
  notify_marketing: false,
  notify_new_requests: true,
  share_location: false,
  location_prompt_dismissed_at: null,
};

interface PreferencesContextValue {
  preferences: Preferences;
  /** True once the server's copy has arrived; defaults are not an answer. */
  loaded: boolean;
  /** Applies immediately, then persists. Reverts if the server rejects it. */
  update: (patch: Partial<Record<string, unknown>>) => Promise<void>;
  saving: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const LOCAL_KEY = 'duka_preferences';

/**
 * Appearance must survive a reload before /me returns, so it is mirrored.
 *
 * Per tab, for the same reason the session is: two tabs can be two different
 * accounts with two different themes, and a shared mirror meant whichever tab
 * changed last decided what the others painted for the first moment after a
 * reload. localStorage is still written, but only as the seed a brand-new tab
 * paints from — a tab with its own copy never reads it.
 */
function readLocal(): Preferences {
  try {
    const own = sessionStorage.getItem(LOCAL_KEY);
    const raw = own ?? localStorage.getItem(LOCAL_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function writeLocal(prefs: Preferences) {
  const json = JSON.stringify(prefs);
  try { sessionStorage.setItem(LOCAL_KEY, json); } catch { /* blocked storage */ }
  try { localStorage.setItem(LOCAL_KEY, json); } catch {
    // Private windows and blocked storage — the server copy still holds.
  }
}

/**
 * Paints the theme onto <html> as data attributes. All colour comes from CSS
 * variables keyed off these, so one attribute swap reskins the whole app.
 */
function applyToDocument(prefs: Preferences) {
  const root = document.documentElement;
  const systemDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
  const dark = prefs.theme === 'dark' || (prefs.theme === 'system' && systemDark);

  root.setAttribute('data-theme', dark ? 'dark' : 'light');
  root.setAttribute('data-accent', prefs.accent);
  root.setAttribute('lang', prefs.language);
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = useState<Preferences>(readLocal);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    applyToDocument(preferences);
    writeLocal(preferences);
  }, [preferences]);

  // Follow the OS while the user is on "system".
  useEffect(() => {
    if (preferences.theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyToDocument(preferences);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preferences]);

  // Server copy wins once we know who is logged in.
  useEffect(() => {
    if (!user) return;
    api.get('/settings/preferences')
      .then((res) => setPreferences({ ...DEFAULTS, ...res.data.preferences }))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [user]);

  const update = useCallback(async (patch: Partial<Record<string, unknown>>) => {
    const previous = preferences;
    // Optimistic: a theme switch that waits on the network feels broken.
    setPreferences((p) => ({ ...p, ...(patch as Partial<Preferences>) }));
    setSaving(true);
    try {
      const res = await api.patch('/settings/preferences', patch);
      setPreferences({ ...DEFAULTS, ...res.data.preferences });
    } catch {
      setPreferences(previous);
    } finally {
      setSaving(false);
    }
  }, [preferences]);

  return (
    <PreferencesContext.Provider value={{ preferences, loaded, update, saving }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
