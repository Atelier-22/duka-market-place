import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Bike,
  Broccoli,
  Camera,
  Check,
  Clock,
  Footprints,
  Handshake,
  MapPin,
  MessageCircle,
  Percent,
  Search,
  ShoppingBag,
  Smartphone,
  Star,
  Store,
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { HeroCarousel } from '../../components/domain/HeroCarousel';
import { BRAND } from '../../config/brand';
import { usePageMeta } from '../../hooks/usePageMeta';
import { StructuredData } from '../../components/seo/StructuredData';
import { MarketplaceTeaser } from '../../components/market/MarketplaceTeaser';

const HOW_IT_WORKS = [
  { icon: MessageCircle, title: 'Tell us what you need', body: 'A product, a market, a shop, even a TikTok seller — describe it in your own words.' },
  { icon: MapPin, title: 'Choose where to get it', body: 'Pick a specific market or shop, paste a social seller link, or let a shopper find the best option.' },
  { icon: Handshake, title: 'A nearby shopper accepts', body: 'A verified shopper close to that location picks up your request.' },
  { icon: ShoppingBag, title: 'They find and buy it', body: 'Real photos and the real price, uploaded before anything is purchased.' },
  { icon: Check, title: 'You approve the purchase', body: 'See the exact price breakdown and approve before the shopper pays.' },
  { icon: Bike, title: 'They deliver it', body: 'Straight to the address you choose, tracked every step of the way.' },
];

const USE_CASES = [
  { icon: Footprints, title: 'Market finds', body: '"Black shoes, size 42, under 100,000 UGX from Owino Market."' },
  { icon: Broccoli, title: 'Fresh groceries', body: '"Get me tomatoes, onions and greens from Kalerwe Market."' },
  { icon: Smartphone, title: 'Social sellers', body: '"Find this exact phone case from a TikTok seller I found."' },
  { icon: Search, title: 'Best price search', body: '"Find me the cheapest good-quality version of this item."' },
];

const TRUST = [
  { icon: Camera, title: 'Trust', body: 'Every purchase is backed by a real photo, a real receipt, and your explicit approval before payment.' },
  { icon: Bike, title: 'Speed', body: 'Requests are matched with nearby shoppers who already know the market.' },
  { icon: Store, title: 'Local knowledge', body: 'Shoppers know which stall has it cheaper, and which seller to avoid.' },
];

const SHOPPER_PERKS = [
  { icon: Clock, label: 'Flexible hours' },
  { icon: MapPin, label: 'Choose your area' },
  { icon: Percent, label: 'Transparent fees' },
  { icon: Star, label: 'Build your rating' },
];

const HERO_PROMISES = ['Photo before purchase', 'You approve the price', 'Pay on delivery'];

const EXAMPLE_ORDER = [
  { label: 'Item', amount: '55,000' },
  { label: 'Shopping fee', amount: '8,000' },
  { label: 'Delivery', amount: '6,000' },
];

const SECTION = 'mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:mt-24';
const ICON_WELL = 'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-green-mist text-brand-green-deep';

function SectionIntro({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <div className="mx-auto max-w-xl text-center">
      <p className="text-label font-semibold uppercase text-ink-3">{eyebrow}</p>
      <h2 className="mt-2 font-display text-h2 font-medium text-brand-green-deep sm:text-h1">{title}</h2>
      <p className="mt-3 text-body text-ink-2">{body}</p>
    </div>
  );
}

const ORGANIZATION = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: BRAND.name,
  url: 'https://www.dukashoppers.com/',
  logo: 'https://www.dukashoppers.com/duka-mark.png',
  email: BRAND.supportEmail,
  telephone: BRAND.supportPhone,
  areaServed: { '@type': 'Country', name: BRAND.country },
  contactPoint: [{
    '@type': 'ContactPoint',
    contactType: 'customer support',
    telephone: BRAND.supportPhone,
    email: BRAND.supportEmail,
    availableLanguage: ['en', 'sw', 'lg'],
  }],
};

const WEBSITE = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: BRAND.name,
  url: 'https://www.dukashoppers.com/',
  description: 'A verified local shopper finds what you need and delivers it to your door.',
  inLanguage: 'en',
};

export function LandingPage() {
  usePageMeta({
    title: 'Duka — If you want it, we find it.',
    description: 'Tell us what you need. A verified local shopper in Uganda finds it at the market, shop or seller you name and brings it to your door.',
  });
  const navigate = useNavigate();

  return (
    <>
      <StructuredData id="organization" data={ORGANIZATION} />
      <StructuredData id="website" data={WEBSITE} />

    <div>
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:pt-20">
        <div className="grid animate-fade-up items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-1.5 text-small font-medium text-ink-2">
              <MapPin size={14} strokeWidth={2} className="text-brand-green" aria-hidden="true" />
              Now live in towns across {BRAND.country}
            </p>
            <h1 className="mt-5 max-w-lg font-display text-h1 font-medium text-brand-green-deep md:text-display">
              Tell us what you need. We&rsquo;ll find someone nearby to get it for you.
            </h1>
            <p className="mt-5 max-w-md text-body text-ink-2">
              {BRAND.name} connects you with a verified local shopper who goes to the market, shop or
              seller you name, buys it, and brings it to your door.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" fullWidth className="sm:w-auto" onClick={() => navigate('/register?role=customer')}>
                Create a shopping request <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
              </Button>
              <Button size="lg" variant="secondary" fullWidth className="sm:w-auto" onClick={() => navigate('/become-a-shopper')}>
                Become a shopper
              </Button>
            </div>
            <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-small text-ink-2">
              {HERO_PROMISES.map((promise) => (
                <li key={promise} className="flex items-center gap-1.5">
                  <Check size={15} strokeWidth={2.5} className="text-brand-green" aria-hidden="true" />
                  {promise}
                </li>
              ))}
            </ul>
          </div>

          <div
            className="w-full min-w-0 lg:max-w-md lg:justify-self-end"
            role="img"
            aria-label="An example order: black shoes, size 42, from Owino Market. Shopper Nakato found them for 55,000 UGX; the total with fees is 69,000 UGX and is waiting for your approval."
          >
            <Card padding="lg">
              <div className="flex items-center justify-between gap-3">
                <p className="text-label font-semibold uppercase text-ink-3">Active request</p>
                <span className="rounded-full bg-brand-green-mist px-2.5 py-1 text-caption font-semibold text-brand-green-deep">
                  Shopping
                </span>
              </div>
              <p className="mt-3 font-display text-h3 font-medium text-brand-green-deep">Black shoes, size 42</p>
              <p className="mt-1 text-small text-ink-2">Owino Market · Budget 100,000 UGX</p>

              <div className="mt-5 flex items-center gap-3 border-t border-line pt-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-body font-semibold text-brand-green-deep">
                  N
                </span>
                <div className="min-w-0">
                  <p className="text-body font-medium text-ink">Nakato is shopping for you</p>
                  <p className="text-small text-ink-2">Verified shopper · Found the item</p>
                </div>
              </div>

              <dl className="mt-5 rounded-xl border border-line bg-surface-2 p-4 text-small">
                {EXAMPLE_ORDER.map((line) => (
                  <div key={line.label} className="flex items-baseline justify-between gap-4 py-1">
                    <dt className="text-ink-2">{line.label}</dt>
                    <dd className="font-medium tabular-nums text-ink">{line.amount} UGX</dd>
                  </div>
                ))}
                <div className="mt-2 flex items-baseline justify-between gap-4 border-t border-line pt-3 text-body">
                  <dt className="font-semibold text-ink">Total</dt>
                  <dd className="font-semibold tabular-nums text-brand-green-deep">69,000 UGX</dd>
                </div>
              </dl>

              <p className="mt-4 flex items-start gap-2 text-small text-ink-2">
                <Check size={16} strokeWidth={2.5} className="mt-0.5 shrink-0 text-brand-green" aria-hidden="true" />
                31,000 UGX under your budget. Approve, and Nakato pays and heads your way.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <HeroCarousel />
      </section>

      <section className={SECTION}>
        <MarketplaceTeaser />
      </section>

      <section className={SECTION}>
        <SectionIntro
          eyebrow="How it works"
          title="From a message to a delivery"
          body="Six transparent steps. You see the item and the real price before anything is bought."
        />
        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <li key={step.title} className="min-w-0">
              <Card className="h-full">
                <div className="flex items-center justify-between gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-mist font-display text-h3 font-medium text-brand-green-deep">
                    {i + 1}
                  </span>
                  <step.icon size={20} strokeWidth={1.75} className="text-brand-green" aria-hidden="true" />
                </div>
                <h3 className="mt-4 font-display text-h3 font-medium text-brand-green-deep">{step.title}</h3>
                <p className="mt-1.5 text-small text-ink-2">{step.body}</p>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-center text-body">
          <Link to="/how-it-works" className="font-medium text-brand-green hover:underline">
            See the full walkthrough
          </Link>
        </p>
      </section>

      <section className={SECTION}>
        <SectionIntro
          eyebrow="Popular requests"
          title="If it can be found, we can get it"
          body="A market stall, a small shop, a supermarket, or a seller you found online."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {USE_CASES.map((uc) => (
            <li key={uc.title} className="min-w-0">
              <Card className="flex h-full gap-4">
                <span className={ICON_WELL}>
                  <uc.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-h3 font-medium text-brand-green-deep">{uc.title}</h3>
                  <p className="mt-1 text-small text-ink-2">{uc.body}</p>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </section>

      <section className={SECTION}>
        <div className="surface-deep rounded-3xl px-6 py-10 sm:px-10 lg:px-14 lg:py-14">
          <p className="text-label font-semibold uppercase text-white/60">Why people trust {BRAND.name}</p>
          <div className="mt-8 grid gap-8 md:grid-cols-3 md:gap-10">
            {TRUST.map((item) => (
              <div key={item.title} className="min-w-0">
                <item.icon size={24} strokeWidth={1.5} className="text-brand-green-fresh" aria-hidden="true" />
                <h3 className="mt-4 font-display text-h3 font-medium text-white">{item.title}</h3>
                <p className="mt-2 text-small text-white/70">{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={SECTION}>
        <Card padding="lg" className="grid items-center gap-8 md:grid-cols-2 md:gap-12">
          <div className="min-w-0">
            <p className="text-label font-semibold uppercase text-ink-3">For shoppers</p>
            <h2 className="mt-2 font-display text-h2 font-medium text-brand-green-deep sm:text-h1">
              Earn on your own schedule
            </h2>
            <p className="mt-3 text-body text-ink-2">
              Choose your area, accept the jobs that work for you, and get paid transparently for
              every shop and delivery. No inventory, no shop rent — just your time and local knowledge.
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate('/become-a-shopper')}>
                Start earning <ArrowRight size={17} strokeWidth={2} aria-hidden="true" />
              </Button>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {SHOPPER_PERKS.map((perk) => (
              <li key={perk.label} className="min-w-0 rounded-xl border border-line bg-surface-2 p-4">
                <perk.icon size={20} strokeWidth={1.75} className="text-brand-green" aria-hidden="true" />
                <p className="mt-3 text-small font-medium text-brand-green-deep">{perk.label}</p>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section className="mx-auto mt-16 max-w-3xl px-4 text-center sm:px-6 lg:mt-24">
        <h2 className="font-display text-h2 font-medium text-brand-green-deep sm:text-h1">
          Ready to get something you can&rsquo;t go and get yourself?
        </h2>
        <p className="mt-3 text-body text-ink-2">
          Create a request in a minute. A nearby shopper takes it from there.
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button size="lg" fullWidth className="sm:w-auto" onClick={() => navigate('/register?role=customer')}>
            Create a shopping request
          </Button>
          <Button size="lg" variant="secondary" fullWidth className="sm:w-auto" onClick={() => navigate('/register?role=shopper')}>
            Become a shopper
          </Button>
        </div>
      </section>
    </div>
      </>
  );
}
