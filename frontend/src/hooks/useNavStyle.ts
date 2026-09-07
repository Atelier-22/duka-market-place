import { useCallback, useEffect, useState } from 'react';

export type NavStyle = 'light' | 'dark';

export const NAV_STYLES: { key: NavStyle; label: string; description: string }[] = [
  { key: 'light', label: 'Light', description: 'A white capsule. The tab you are on floats out of it in a coloured circle.' },
  { key: 'dark', label: 'Dark', description: 'The same floating tab on a dark capsule.' },
];

const STORAGE_KEY = 'duka_nav_style';
const DEFAULT: NavStyle = 'light';

function read(): NavStyle {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === 'light' || raw === 'dark') return raw;
    // Older builds stored 'labeled' | 'pop' | 'glow'.
    if (raw === 'glow') return 'dark';
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
