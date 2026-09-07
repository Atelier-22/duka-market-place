import { useEffect } from 'react';
import { BRAND } from '../config/brand';

interface PageMeta {
  title: string;
  description?: string;
  noindex?: boolean;
  image?: string;
}

const ORIGIN = 'https://www.dukashoppers.com';
const DEFAULT_DESCRIPTION =
  'Duka connects you with a verified local shopper who goes to the market, shop, or seller you name, buys what you need, and delivers it to your door.';
const DEFAULT_IMAGE = `${ORIGIN}/duka-mark.png`;

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attribute, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

export function usePageMeta({ title, description, noindex = false, image }: PageMeta) {
  useEffect(() => {
    const fullTitle = title.includes(BRAND.name) ? title : `${title} · ${BRAND.name}`;
    const text = description ?? DEFAULT_DESCRIPTION;
    const picture = image ?? DEFAULT_IMAGE;

    document.title = fullTitle;
    setMeta('name', 'description', text);
    setMeta('name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', text);
    setMeta('property', 'og:image', picture);
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', text);
    setMeta('name', 'twitter:image', picture);
  }, [title, description, noindex, image]);
}
