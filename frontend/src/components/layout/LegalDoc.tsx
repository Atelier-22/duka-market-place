import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { BRAND } from '../../config/brand';

/** Inline link inside running text. */
export const PROSE_LINK = 'font-medium text-brand-green hover:underline';

const LEGAL_LINKS = [
  { to: '/privacy', label: 'Privacy Policy' },
  { to: '/terms', label: 'Terms & Conditions' },
  { to: '/refunds', label: 'Refund Policy' },
  { to: '/cookies', label: 'Cookies & Storage' },
];

/** Shell for a legal page: title, date, intro, clauses, then a quiet footer. */
export function LegalDoc({
  title,
  updated,
  intro,
  children,
}: {
  title: string;
  updated: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-prose">
        <p className="text-label font-semibold uppercase text-ink-3">Legal</p>
        <h1 className="mt-2 font-display text-display font-medium text-brand-green-deep">{title}</h1>
        <p className="mt-3 text-small text-ink-3">Last updated {updated}</p>
        {intro && <p className="mt-5 text-body text-ink-2">{intro}</p>}
      </header>

      <div className="mt-10 flex max-w-prose flex-col gap-10">{children}</div>

      <footer className="mt-14 max-w-prose border-t border-line pt-6">
        <p className="text-small text-ink-2">
          Questions about this page? Email{' '}
          <a className={PROSE_LINK} href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
        </p>
        <nav aria-label="Legal pages" className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-small">
          {LEGAL_LINKS.map((l) => (
            <Link key={l.to} to={l.to} className={PROSE_LINK}>{l.label}</Link>
          ))}
        </nav>
      </footer>
    </article>
  );
}

/** One clause. `level` 3 renders a sub-heading for clauses nested in a larger section. */
export function Clause({ heading, children, level = 2 }: { heading: string; children: ReactNode; level?: 2 | 3 }) {
  const Heading = level === 3 ? 'h3' : 'h2';
  return (
    <section>
      <Heading className={`font-display font-medium text-brand-green-deep ${level === 3 ? 'text-h3' : 'text-h2'}`}>
        {heading}
      </Heading>
      <div className="mt-3 flex flex-col gap-3 text-body text-ink-2 [&_strong]:font-semibold [&_strong]:text-ink">
        {children}
      </div>
    </section>
  );
}

/** A note flagging something that still needs a decision or professional review. */
export function Pending({ children }: { children: ReactNode }) {
  return (
    <div role="note" className="flex gap-3 rounded-xl border border-line bg-surface-2 px-4 py-3.5">
      <Info size={18} strokeWidth={2} className="mt-0.5 shrink-0 text-ink-3" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-label font-semibold uppercase text-ink-3">Pending review</p>
        <p className="mt-1 text-small text-ink-2">{children}</p>
      </div>
    </div>
  );
}
