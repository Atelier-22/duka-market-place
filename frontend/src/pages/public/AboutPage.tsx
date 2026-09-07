import { Link } from 'react-router-dom';
import { Coins, Eye, Store } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { PROSE_LINK } from '../../components/layout/LegalDoc';
import { BRAND } from '../../config/brand';
import { usePageMeta } from '../../hooks/usePageMeta';

const PRINCIPLES = [
  { icon: Eye, title: 'Nothing hidden', body: 'The real photo, the real price, and every fee on its own line before anything is bought.' },
  { icon: Coins, title: 'Shoppers paid fairly', body: 'Fees are shown up front and never depend on hiding what the item cost.' },
  { icon: Store, title: 'Markets first', body: 'We meet the market where it is instead of asking it to move online first.' },
];

export function AboutPage() {
  usePageMeta({ title: 'About Duka', description: 'Duka exists so anyone can get what they need from local markets, shops and social sellers without leaving home.' });
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-label font-semibold uppercase text-ink-3">About {BRAND.name}</p>
        <h1 className="mt-2 font-display text-display font-medium text-brand-green-deep">Our mission</h1>
        <p className="mt-4 text-body text-ink-2">
          Millions of people rely on local markets, small shops, and social-media sellers for the
          things they need every day — but getting there takes time not everyone has. {BRAND.name}{' '}
          exists to close that gap without pretending every market has to move online first.
        </p>
      </header>

      <div className="mt-6 max-w-prose text-body text-ink">
        <p>
          Instead of building another catalogue that only lists what a handful of large sellers
          stock, we connect people directly to shoppers who already know the market — and pay those
          shoppers fairly and transparently for the value of their time and local knowledge.
        </p>
      </div>

      <section className="mt-12">
        <h2 className="font-display text-h2 font-medium text-brand-green-deep">How we work</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <li key={p.title} className="min-w-0">
              <Card className="h-full">
                <p.icon size={20} strokeWidth={1.75} className="text-brand-green" aria-hidden="true" />
                <h3 className="mt-3 font-display text-h3 font-medium text-brand-green-deep">{p.title}</h3>
                <p className="mt-1.5 text-small text-ink-2">{p.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <Card padding="lg" className="mt-12">
        <h2 className="font-display text-h2 font-medium text-brand-green-deep">
          Built for {BRAND.country}, built to last
        </h2>
        <p className="mt-3 text-body text-ink-2">
          We started in Kampala because that&rsquo;s where the need was clearest, but the model —
          connect a customer&rsquo;s request to a nearby shopper&rsquo;s effort — works anywhere
          markets outpace online catalogues.
        </p>
        <p className="mt-4 text-body text-ink-2">
          {BRAND.name} is operated by {BRAND.operatorName} in {BRAND.country}. Questions, ideas or
          partnerships:{' '}
          <a className={PROSE_LINK} href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
        </p>
      </Card>

      <p className="mt-8 text-body text-ink-2">
        Want to be part of it?{' '}
        <Link to="/become-a-shopper" className={PROSE_LINK}>Become a shopper</Link> or{' '}
        <Link to="/how-it-works" className={PROSE_LINK}>see how ordering works</Link>.
      </p>
    </div>
  );
}
