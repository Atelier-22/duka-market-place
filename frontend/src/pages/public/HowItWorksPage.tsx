import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Camera, Receipt, Wallet } from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';

const STEPS = [
  { n: 1, title: 'Tell us what you need', body: 'Describe the item, quantity, and any details that matter — size, colour, brand, quality.' },
  { n: 2, title: 'Choose where to get it', body: 'Point us to a specific market or shop, paste a social media seller link, or let your shopper find the best option nearby.' },
  { n: 3, title: 'A nearby shopper accepts', body: 'A verified shopper close to that location reviews your request and accepts it, or sends you a priced offer.' },
  { n: 4, title: 'They find and buy it', body: 'Your shopper visits the location, finds the item, and photographs it with the real price before buying anything.' },
  { n: 5, title: 'You approve the purchase', body: 'You see the exact price breakdown — item, shopping fee, delivery fee, platform fee — and approve before they pay.' },
  { n: 6, title: 'They deliver it', body: 'Your shopper brings the item to the delivery address you chose.' },
  { n: 7, title: 'You pay and confirm', body: 'Confirm delivery, pay via cash or your chosen method, and rate your shopper.' },
];

const GUARANTEES = [
  { icon: Camera, title: 'A photo before anything is bought', body: 'Your shopper sends the real item and the real asking price first.' },
  { icon: Receipt, title: 'Every fee on its own line', body: 'Item, shopping fee, delivery fee and platform fee — never one bundled number.' },
  { icon: Wallet, title: 'Pay when it arrives', body: 'Cash on delivery today; mobile money and cards as we add licensed providers.' },
];

export function HowItWorksPage() {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:py-16">
      <header className="max-w-2xl">
        <p className="text-label font-semibold uppercase text-ink-3">How it works</p>
        <h1 className="mt-2 font-display text-display font-medium text-brand-green-deep">
          Seven steps, and you see every one of them
        </h1>
        <p className="mt-4 text-body text-ink-2">
          From describing what you need to confirming it arrived, nothing happens without you
          seeing it first.
        </p>
      </header>

      <Card padding="none" className="mt-10 overflow-hidden">
        <ol>
          {STEPS.map((step) => (
            <li key={step.n} className="flex gap-4 border-b border-line p-5 last:border-b-0 sm:gap-5 sm:p-6">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green-mist font-display text-h3 font-medium text-brand-green-deep"
                aria-hidden="true"
              >
                {step.n}
              </span>
              <div className="min-w-0">
                <h2 className="font-display text-h3 font-medium text-brand-green-deep">{step.title}</h2>
                <p className="mt-1 text-body text-ink-2">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </Card>

      <section className="mt-12">
        <h2 className="font-display text-h2 font-medium text-brand-green-deep">What you can always count on</h2>
        <ul className="mt-5 grid gap-4 sm:grid-cols-3">
          {GUARANTEES.map((g) => (
            <li key={g.title} className="min-w-0">
              <Card className="h-full">
                <g.icon size={20} strokeWidth={1.75} className="text-brand-green" aria-hidden="true" />
                <h3 className="mt-3 font-display text-h3 font-medium text-brand-green-deep">{g.title}</h3>
                <p className="mt-1.5 text-small text-ink-2">{g.body}</p>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-12 border-t border-line pt-10">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h2 className="font-display text-h2 font-medium text-brand-green-deep">Ready to try it?</h2>
            <p className="mt-1 text-body text-ink-2">Your first request takes about a minute.</p>
          </div>
          <Button size="lg" fullWidth className="shrink-0 sm:w-auto" onClick={() => navigate('/register?role=customer')}>
            Create your first request <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
          </Button>
        </div>
        <p className="mt-6 text-small text-ink-2">
          Still have questions?{' '}
          <Link to="/help" className="font-medium text-brand-green hover:underline">Read the FAQ</Link>.
        </p>
      </section>
    </div>
  );
}
