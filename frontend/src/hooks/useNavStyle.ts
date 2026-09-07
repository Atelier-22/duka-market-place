import { useCallback, useEffect, useState } from 'react';

export type NavStyle = 'labeled' | 'pop' | 'glow';

export const NAV_STYLES: { key: NavStyle; label: string; description: string }[] = [
  { key: 'labeled', label: 'Labeled Slide', description: 'Icons with names underneath, and a highlight that slides between them.' },
  { key: 'pop', label: 'Floating Pop', description: 'The tab you are on lifts out of the bar in a coloured circle.' },
  { key: 'glow', label: 'Dark Glow', description: 'A dark bar, with the tab you are on glowing.' },
];

const STORAGE_KEY = 'duka_nav_style';
const DEFAULT: NavStyle = 'labeled';

function read(): NavStyle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'labeled' || raw === 'pop' || raw === 'glow') return raw;
  } catch {

  }
  return DEFAULT;
}

export function useNavStyle(): [NavStyle, (next: NavStyle) => void] {
  const [navStyle, setNavStyle] = useState<NavStyle>(read);

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

    }

    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY, newValue: next }));
  }, []);

  return [navStyle, choose];
}
