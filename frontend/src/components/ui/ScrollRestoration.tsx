import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';

const positions = new Map<string, number>();

export function ScrollRestoration() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const activeKey = useRef(location.key);

  useEffect(() => {
    function remember() {
      positions.set(activeKey.current, window.scrollY);
    }
    window.addEventListener('scroll', remember, { passive: true });
    return () => window.removeEventListener('scroll', remember);
  }, []);

  useEffect(() => {
    activeKey.current = location.key;
    if (location.pathname.includes('/settings')) return;

    const saved = positions.get(location.key);
    const target = navigationType === 'POP' && saved !== undefined ? saved : 0;
    window.scrollTo(0, target);
    if (target > 0) {
      const frame = requestAnimationFrame(() => window.scrollTo(0, target));
      return () => cancelAnimationFrame(frame);
    }
  }, [location.key, location.pathname, navigationType]);

  return null;
}
