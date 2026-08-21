import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { api } from '../services/api';
import { useAuth } from './AuthContext';

export type Theme = 'system' | 'light' | 'dark';
export type Accent = 'green' | 'ocean' | 'sunset' | 'grape' | 'charcoal';
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
};

interface PreferencesContextValue {
  preferences: Preferences;
  /** Applies immediately, then persists. Reverts if the server rejects it. */
  update: (patch: Partial<Record<string, unknown>>) => Promise<void>;
  saving: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const LOCAL_KEY = 'duka_preferences';

/** Appearance must survive a reload before /me returns, so it is mirrored locally. */
function readLocal(): Preferences {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function writeLocal(prefs: Preferences) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(prefs));
  } catch {
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
      .catch(() => undefined);
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
    <PreferencesContext.Provider value={{ preferences, update, saving }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
