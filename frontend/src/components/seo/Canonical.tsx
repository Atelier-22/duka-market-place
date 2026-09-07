import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const ORIGIN = 'https://www.dukashoppers.com';

const PRIVATE_PREFIXES = ['/app', '/shopper', '/admin'];

function upsert(selector: string, create: () => HTMLElement): HTMLElement {
  const existing = document.head.querySelector(selector);
  if (existing) return existing as HTMLElement;
  const created = create();
  document.head.appendChild(created);
  return created;
}

export function Canonical() {
  const { pathname } = useLocation();

  useEffect(() => {
    const isPrivate = PRIVATE_PREFIXES.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`)
    );

    const link = upsert('link[rel="canonical"]', () => {
      const el = document.createElement('link');
      el.setAttribute('rel', 'canonical');
      return el;
    }) as HTMLLinkElement;

    const ogUrl = upsert('meta[property="og:url"]', () => {
      const el = document.createElement('meta');
      el.setAttribute('property', 'og:url');
      return el;
    }) as HTMLMetaElement;

    const robots = upsert('meta[name="robots"]', () => {
      const el = document.createElement('meta');
      el.setAttribute('name', 'robots');
      return el;
    }) as HTMLMetaElement;

    const url = `${ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;

    link.setAttribute('href', url);
    ogUrl.setAttribute('content', url);

    robots.setAttribute('content', isPrivate ? 'noindex, nofollow' : 'index, follow');
  }, [pathname]);

  return null;
}
