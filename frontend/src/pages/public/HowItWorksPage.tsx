import { Link } from 'react-router-dom';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';

const STEPS = [
  { n: 1, title: 'Tell us what you need', body: 'Describe the item, quantity, and any details that matter — size, color, brand, quality.' },
  { n: 2, title: 'Choose where to get it', body: 'Point us to a specific market or shop, paste a social media seller link, or let your shopper find the best option nearby.' },
  { n: 3, title: 'A nearby shopper accepts', body: 'A verified shopper close to that location reviews your request and accepts it, or sends you a priced offer.' },
  { n: 4, title: 'They find and buy it', body: 'Your shopper visits the location, finds the item, and photographs it with the real price before buying anything.' },
  { n: 5, title: 'You approve the purchase', body: 'You see the exact price breakdown — item, shopping fee, delivery fee, platform fee — and approve before they pay.' },
  { n: 6, title: 'They deliver it', body: 'Your shopper brings the item to the delivery address you chose.' },
  { n: 7, title: 'You pay and confirm', body: 'Confirm delivery, pay via cash or your chosen method, and rate your shopper.' },
];

export function HowItWorksPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-medium text-brand-green-deep">How it works</h1>
        <p className="mt-4 text-brand-ink/60">Seven steps, full transparency at every one of them.</p>
      </div>

      <div className="mt-14 flex flex-col gap-5">
        {STEPS.map((step) => (
          <GlassCard key={step.n} hover={false} className="flex items-start gap-5">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh font-display text-lg font-semibold text-white">
              {step.n}
            </span>
            <div>
              <p className="font-display text-lg font-medium text-brand-green-deep">{step.title}</p>
              <p className="mt-1 text-sm text-brand-ink/60">{step.body}</p>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="mt-14 text-center">
        <Link to="/register?role=customer">
          <GlassButton size="lg">Create your first request →</GlassButton>
        </Link>
      </div>
    </div>
  );
}
