import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';

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
    <div className="mx-auto max-w-3xl px-4 pb-24 pt-10">
      <h1 className="font-display text-3xl font-medium text-brand-green-deep md:text-4xl">{title}</h1>
      <p className="mt-2 text-sm text-brand-ink/45">Last updated {updated}</p>
      {intro && <p className="mt-6 text-[15px] leading-relaxed text-brand-ink/75">{intro}</p>}
      <div className="mt-8 flex flex-col gap-8">{children}</div>

      <div className="mt-12 border-t border-brand-green/10 pt-6 text-sm text-brand-ink/60">
        <p>
          Questions about this page? Email{' '}
          <a className="font-medium text-brand-green-fresh underline" href={`mailto:${BRAND.supportEmail}`}>
            {BRAND.supportEmail}
          </a>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
          <Link className="hover:text-brand-green-deep" to="/privacy">Privacy Policy</Link>
          <Link className="hover:text-brand-green-deep" to="/terms">Terms &amp; Conditions</Link>
          <Link className="hover:text-brand-green-deep" to="/refunds">Refund Policy</Link>
          <Link className="hover:text-brand-green-deep" to="/cookies">Cookies &amp; Storage</Link>
        </div>
      </div>
    </div>
  );
}

export function Clause({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl font-medium text-brand-green-deep">{heading}</h2>
      <div className="mt-3 flex flex-col gap-3 text-[15px] leading-relaxed text-brand-ink/75">
        {children}
      </div>
    </section>
  );
}

export function Pending({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl2 border border-brand-yellow/40 bg-brand-yellow-soft/30 px-4 py-3 text-sm text-brand-ink/75">
      {children}
    </p>
  );
}
