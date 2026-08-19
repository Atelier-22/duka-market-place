import { GlassCard } from '../../components/ui/GlassCard';
import { BRAND } from '../../config/brand';

export function AboutPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="font-display text-4xl font-medium text-brand-green-deep">Our mission</h1>
      <p className="mt-6 text-lg leading-relaxed text-brand-ink/70">
        Millions of people rely on local markets, small shops, and social-media sellers for the things
        they need every day — but getting there takes time not everyone has. {BRAND.name} exists to close
        that gap without pretending every market has to move online first.
      </p>
      <p className="mt-4 text-lg leading-relaxed text-brand-ink/70">
        Instead of building another catalogue that only lists what a handful of large sellers stock, we
        connect people directly to shoppers who already know the market — and pay those shoppers fairly
        and transparently for the value of their time and local knowledge.
      </p>
      <GlassCard glow="green" padding="lg" className="mt-10">
        <p className="font-display text-xl font-medium text-brand-green-deep">Built for {BRAND.country}, built to last</p>
        <p className="mt-3 text-sm text-brand-ink/60">
          We started in Kampala because that's where the need was clearest, but the model — connect a
          customer's request to a nearby shopper's effort — works anywhere markets outpace online catalogues.
        </p>
      </GlassCard>
    </div>
  );
}
