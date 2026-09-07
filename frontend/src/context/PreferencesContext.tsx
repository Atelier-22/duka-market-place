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
export type DeliveryHandoff = 'meet' | 'gate' | 'call';
export type DeliveryContact = 'call' | 'message' | 'either';

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
  notify_store_updates: boolean;
  share_location: boolean;
  location_prompt_dismissed_at: string | null;
  notify_security: boolean;
  delivery_instructions: string | null;
  delivery_handoff: DeliveryHandoff;
  delivery_contact: DeliveryContact;
  default_city: string | null;
  default_sourcing: string | null;
}

const DEFAULTS: Preferences = {
  theme: 'light',
  accent: 'green',
  language: 'en',
  tone: 'friendly',
  traits: [],
  notify_messages: true,
  notify_orders: true,
  notify_offers: true,
  notify_marketing: false,
  notify_new_requests: true,
  notify_store_updates: true,
  share_location: false,
  location_prompt_dismissed_at: null,
  notify_security: true,
  delivery_instructions: null,
  delivery_handoff: 'meet',
  delivery_contact: 'either',
  default_city: null,
  default_sourcing: null,
};

interface PreferencesContextValue {
  preferences: Preferences;

  loaded: boolean;

  update: (patch: Partial<Record<string, unknown>>) => Promise<void>;
  reset: () => void;
  saving: boolean;
}

const PreferencesContext = createContext<PreferencesContextValue | undefined>(undefined);

const LOCAL_KEY = 'duka_preferences';

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
  try { sessionStorage.setItem(LOCAL_KEY, json); } catch {  }
  try { localStorage.setItem(LOCAL_KEY, json); } catch {
  }
}

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

  useEffect(() => {
    if (preferences.theme !== 'system' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyToDocument(preferences);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [preferences]);

  useEffect(() => {
    if (!user) return;
    api.get('/settings/preferences')
      .then((res) => setPreferences({ ...DEFAULTS, ...res.data.preferences }))
      .catch(() => undefined)
      .finally(() => setLoaded(true));
  }, [user]);

  const update = useCallback(async (patch: Partial<Record<string, unknown>>) => {
    const previous = preferences;

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

  const reset = useCallback(() => {
    setPreferences(DEFAULTS);
    try { sessionStorage.removeItem(LOCAL_KEY); } catch {

    }
    try { localStorage.removeItem(LOCAL_KEY); } catch {

    }
  }, []);

  return (
    <PreferencesContext.Provider value={{ preferences, loaded, update, reset, saving }}>
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences(): PreferencesContextValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences must be used within PreferencesProvider');
  return ctx;
}
