import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Bell, Check, Clock, Coins, MapPin, ShoppingBag, Star } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PROSE_LINK } from '../../components/layout/LegalDoc';
import { usePageMeta } from '../../hooks/usePageMeta';

const BENEFITS = [
  { icon: Clock, title: 'Flexible work', body: 'Go online when you want, offline when you don’t. No shifts, no minimums.' },
  { icon: MapPin, title: 'Choose your area', body: 'Set the markets and neighbourhoods you know best.' },
  { icon: Bell, title: 'Accept nearby jobs', body: 'See requests close to you first, with the item, budget and estimated fee up front.' },
  { icon: ShoppingBag, title: 'Shop for customers', body: 'Use your knowledge of the market to find exactly what they asked for.' },
  { icon: Coins, title: 'Earn service fees', body: 'Keep your shopping fee and delivery fee — paid out transparently after every completed job.' },
  { icon: Star, title: 'Build your reputation', body: 'Every completed job builds your rating and unlocks more requests.' },
];

const EXAMPLE_ORDER = [
  { label: 'Item price (paid to the shop)', amount: '55,000' },
  { label: 'Shopping fee (yours)', amount: '8,000' },
  { label: 'Delivery fee (yours)', amount: '6,000' },
];

const REQUIREMENTS = [
  'A government-issued ID for verification',
  'A smartphone with data',
  'Good knowledge of the markets and shops near you',
];

export function BecomeShopperPage() {
  usePageMeta({ title: 'Become a shopper', description: 'Earn money shopping for people nearby. Verify your ID, pick the jobs you want, and get paid per delivery.' });
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-label font-semibold uppercase text-ink-3">For shoppers</p>
        <h1 className="mt-2 font-display text-display font-medium text-brand-green-deep">
          Earn money as a local shopper
        </h1>
        <p className="mt-4 text-body text-ink-2">
          Turn your knowledge of local markets and shops into flexible income. Set your own hours,
          choose your own area, and get paid transparently for every job.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button size="lg" fullWidth className="sm:w-auto" onClick={() => navigate('/register?role=shopper')}>
            Become a shopper <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </Button>
          <Button size="lg" variant="secondary" fullWidth className="sm:w-auto" onClick={() => navigate('/how-it-works')}>
            See how it works
          </Button>
        </div>
      </header>

      <section className="mt-14">
        <h2 className="font-display text-h2 font-medium text-brand-green-deep">What you get</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {BENEFITS.map((b) => (
            <li key={b.title} className="min-w-0">
              <Card className="h-full">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-mist text-brand-green-deep">
                  <b.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <h3 className="mt-4 font-display text-h3 font-medium text-brand-green-deep">{b.title}</h3>
                <p className="mt-1.5 text-small text-ink-2">{b.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-14 grid gap-4 lg:grid-cols-[3fr_2fr]">
        <Card padding="lg" className="min-w-0">
          <h2 className="font-display text-h2 font-medium text-brand-green-deep">How shoppers get paid</h2>
          <p className="mt-3 text-body text-ink-2">
            Every order shows the exact item price, your shopping fee, and the delivery fee, all
            recorded before the customer approves the purchase. Once an order is completed, your
            shopping fee and delivery fee (minus the platform&rsquo;s small cut) are released straight
            to your available balance. There is never a reason to hide the real item price — your
            earnings never depend on it.
          </p>
          <dl className="mt-5 rounded-xl border border-line bg-surface-2 p-4 text-small">
            <p className="text-label font-semibold uppercase text-ink-3">Example order</p>
            {EXAMPLE_ORDER.map((line) => (
              <div key={line.label} className="mt-2 flex items-baseline justify-between gap-4">
                <dt className="text-ink-2">{line.label}</dt>
                <dd className="font-medium tabular-nums text-ink">{line.amount} UGX</dd>
              </div>
            ))}
            <div className="mt-3 flex items-baseline justify-between gap-4 border-t border-line pt-3 text-body">
              <dt className="font-semibold text-ink">Your earnings</dt>
              <dd className="font-semibold tabular-nums text-brand-green-deep">14,000 UGX</dd>
            </div>
            <p className="mt-1 text-caption text-ink-3">Less the platform fee, shown on every order.</p>
          </dl>
        </Card>

        <Card padding="lg" className="min-w-0">
          <h2 className="font-display text-h2 font-medium text-brand-green-deep">What you need</h2>
          <ul className="mt-4 flex flex-col gap-3">
            {REQUIREMENTS.map((r) => (
              <li key={r} className="flex gap-3 text-body text-ink-2">
                <Check size={18} strokeWidth={2.5} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />
                {r}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-small text-ink-3">
            Verification is reviewed by a person, and your ID photo is deleted as soon as a decision
            is made.{' '}
            <Link to="/privacy" className={PROSE_LINK}>Read how we handle documents</Link>.
          </p>
        </Card>
      </section>

      <section className="mt-14 border-t border-line pt-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-h2 font-medium text-brand-green-deep">
              Start with the markets you already know
            </h2>
            <p className="mt-1 text-body text-ink-2">Sign up, verify your ID, and accept your first request.</p>
          </div>
          <Button size="lg" fullWidth className="shrink-0 sm:w-auto" onClick={() => navigate('/register?role=shopper')}>
            Become a shopper
          </Button>
        </div>
      </section>
    </div>
  );
}
