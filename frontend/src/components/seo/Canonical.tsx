import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * The canonical URL for whatever route is showing.
 *
 * It has to be set per route and at runtime, not once in index.html. A single
 * canonical baked into the shell would name the same URL on every page, which
 * tells a crawler that every route is a duplicate of the home page — worse
 * than having none at all.
 *
 * Doing it at runtime also fixes the other half of the problem: the site is
 * reachable on its Vercel deployment address as well as its own domain, and
 * whichever host served the page, the canonical points at dukashoppers.com. So
 * the deployment URL cannot be indexed as a competing copy.
 */
const ORIGIN = 'https://www.dukashoppers.com';

/** Routes behind a login, which should never be indexed or canonicalised. */
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

    // Trailing slash only on the root, so "/about" and "/about/" do not become
    // two canonical URLs for one page.
    const url = `${ORIGIN}${pathname === '/' ? '/' : pathname.replace(/\/+$/, '')}`;

    link.setAttribute('href', url);
    ogUrl.setAttribute('content', url);
    // A signed-in person's order pages have no business in a search index, and
    // the crawler cannot reach them anyway — saying so is belt and braces.
    robots.setAttribute('content', isPrivate ? 'noindex, nofollow' : 'index, follow');
  }, [pathname]);

  return null;
}
