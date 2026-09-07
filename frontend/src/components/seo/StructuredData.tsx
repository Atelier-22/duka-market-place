import { useEffect } from 'react';

export function StructuredData({ id, data }: { id: string; data: Record<string, unknown> }) {
  useEffect(() => {
    const selector = `script[type="application/ld+json"][data-ld="${id}"]`;
    let el = document.head.querySelector<HTMLScriptElement>(selector);
    if (!el) {
      el = document.createElement('script');
      el.type = 'application/ld+json';
      el.dataset.ld = id;
      document.head.appendChild(el);
    }
    el.textContent = JSON.stringify(data);
    return () => {
      el?.remove();
    };
  }, [id, data]);

  return null;
}
