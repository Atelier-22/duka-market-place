import { useCallback, useEffect, useState } from 'react';

export type NavStyle = 'labeled' | 'pop' | 'glow';

export const NAV_STYLES: { key: NavStyle; label: string; description: string }[] = [
  { key: 'labeled', label: 'Labeled Slide', description: 'Icons with names underneath, and a highlight that slides between them.' },
  { key: 'pop', label: 'Floating Pop', description: 'The tab you are on lifts out of the bar in a coloured circle.' },
  { key: 'glow', label: 'Dark Glow', description: 'A dark bar, with the tab you are on glowing.' },
];

const STORAGE_KEY = 'duka_nav_style';
const DEFAULT: NavStyle = 'labeled';

/**
 * Which shape the phone navigation takes.
 *
 * Kept out of the synced preferences on purpose. Those are replaced wholesale
 * from the server on load — `{...DEFAULTS, ...response}` — so a value the
 * server does not know about is silently reset the moment the fetch lands.
 * This is also a per-device choice in a way a theme is not: the bar only
 * exists on a phone, so syncing it to a laptop that never renders it buys
 * nothing.
 *
 * Reading storage throws outright in a private window in some browsers, so
 * every access is guarded and a failure just means the default.
 */
function read(): NavStyle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'labeled' || raw === 'pop' || raw === 'glow') return raw;
  } catch {
    /* storage blocked */
  }
  return DEFAULT;
}

export function useNavStyle(): [NavStyle, (next: NavStyle) => void] {
  const [navStyle, setNavStyle] = useState<NavStyle>(read);

  // Another tab changing it should not leave this one disagreeing.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key === STORAGE_KEY) setNavStyle(read());
    }
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const choose = useCallback((next: NavStyle) => {
    setNavStyle(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* storage blocked — the choice still applies for this session */
    }
    // Same tab gets no storage event, so tell it directly.
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: next }));
  }, []);

  return [navStyle, choose];
}
