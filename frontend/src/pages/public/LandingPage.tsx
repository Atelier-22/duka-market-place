import { Link } from 'react-router-dom';
import { ArrowRight, Bike, Broccoli, CheckCircle2, Footprints, Handshake, Lightbulb, MapPin, MessageCircle, Percent, Search, ShoppingBag, Smartphone, Star, Clock } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { HeroCarousel } from '../../components/domain/HeroCarousel';
import { BRAND } from '../../config/brand';

const HOW_IT_WORKS = [
  { icon: MessageCircle, title: 'Tell us what you need', body: 'A product, a market, a shop, even a TikTok seller — describe it in your own words.' },
  { icon: MapPin, title: 'Choose where to get it', body: 'Pick a specific market or shop, paste a social seller link, or let a shopper find the best option.' },
  { icon: Handshake, title: 'A nearby shopper accepts', body: 'A verified shopper close to that location picks up your request.' },
  { icon: ShoppingBag, title: 'They find and buy it', body: 'Real photos and the real price, uploaded before anything is purchased.' },
  { icon: CheckCircle2, title: 'You approve the purchase', body: 'See the exact price breakdown and approve before the shopper pays.' },
  { icon: Bike, title: 'They deliver it', body: 'Straight to the address you choose, tracked every step of the way.' },
];

const USE_CASES = [
  { icon: Footprints, title: 'Market finds', body: '"Black shoes, size 42, under 100,000 UGX from Owino Market."' },
  { icon: Broccoli, title: 'Fresh groceries', body: '"Get me tomatoes, onions and greens from Kalerwe Market."' },
  { icon: Smartphone, title: 'Social sellers', body: '"Find this exact phone case from a TikTok seller I found."' },
  { icon: Search, title: 'Best price search', body: '"Find me the cheapest good-quality version of this item."' },
];

export function LandingPage() {
  return (
    <div>
      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-10 md:pt-20">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <div className="animate-fade-up">
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold text-brand-green-deep">
              🇺🇬 Now live across Kampala
            </span>
            <h1 className="mt-6 font-display text-4xl font-medium leading-[1.1] text-brand-green-deep md:text-6xl">
              Tell us what you need.<br />
              <span className="text-gradient-brand">We'll find someone nearby</span><br />
              to get it for you.
            </h1>
            <p className="mt-6 max-w-md text-lg text-brand-ink/65">
              {BRAND.name} connects you with a verified local shopper who goes to the market, shop,
              or seller you name — buys it, and brings it to your door.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/register?role=customer">
                <GlassButton size="lg">Create a shopping request <ArrowRight size={17} strokeWidth={2} /></GlassButton>
              </Link>
              <Link to="/become-a-shopper">
                <GlassButton size="lg" variant="secondary">Become a shopper</GlassButton>
              </Link>
            </div>
            <div className="mt-10 flex gap-8">
              <div>
                <p className="font-display text-2xl font-semibold text-brand-green-deep">1,200+</p>
                <p className="text-xs text-brand-ink/50">Requests fulfilled</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-brand-green-deep">300+</p>
                <p className="text-xs text-brand-ink/50">Verified shoppers</p>
              </div>
              <div>
                <p className="font-display text-2xl font-semibold text-brand-green-deep">4.8★</p>
                <p className="text-xs text-brand-ink/50">Average rating</p>
              </div>
            </div>
          </div>

          <div className="relative animate-fade-up [animation-delay:150ms]">
            <GlassCard glow="green" padding="lg" className="animate-float">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Active request</p>
              <p className="mt-2 font-display text-lg font-medium text-brand-green-deep">Black shoes, size 42</p>
              <p className="mt-1 text-sm text-brand-ink/60">Owino Market · Budget: 100,000 UGX</p>
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-brand-green-mist p-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-fresh text-white"><ShoppingBag size={18} strokeWidth={1.75} /></span>
                <div>
                  <p className="text-sm font-semibold text-brand-green-deep">Nakato is shopping for you</p>
                  <p className="text-xs text-brand-ink/50">Found the item — 55,000 UGX</p>
                </div>
              </div>
              <div className="mt-4 rounded-xl bg-brand-yellow/15 p-3 text-sm text-yellow-800">
                <Lightbulb size={15} strokeWidth={2} className="mr-1 inline" /> Item is 45,000 UGX under your budget — approve to continue.
              </div>
            </GlassCard>
            <GlassCard glow="yellow" padding="sm" className="absolute -bottom-8 -left-8 hidden w-48 animate-float [animation-delay:1s] md:block">
              <p className="text-xs font-semibold text-brand-ink/50">This week's earnings</p>
              <p className="font-display text-xl font-semibold text-brand-green-deep">142,000 UGX</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CAROUSEL */}
      <section className="mx-auto mt-32 max-w-6xl px-4">
        <HeroCarousel />
      </section>

      {/* HOW IT WORKS */}
      <section className="mx-auto mt-32 max-w-6xl px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-medium text-brand-green-deep md:text-4xl">How it works</h2>
          <p className="mt-3 text-brand-ink/60">From a message to a delivery, in six transparent steps.</p>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {HOW_IT_WORKS.map((step, i) => (
            <GlassCard key={step.title} className="animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-mist text-xl">
                <step.icon size={22} strokeWidth={1.5} />
              </span>
              <p className="mt-4 font-display text-base font-medium text-brand-green-deep">{step.title}</p>
              <p className="mt-1.5 text-sm text-brand-ink/60">{step.body}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* WHY USE THE PLATFORM */}
      <section className="mx-auto mt-32 max-w-6xl px-4">
        <div className="glass-deep grid gap-8 rounded-xl3 p-10 md:grid-cols-3 md:p-14">
          {[
            { title: 'Trust', body: 'Every purchase is backed by a real photo, a real receipt, and your explicit approval before payment.' },
            { title: 'Speed', body: 'Requests are matched with nearby shoppers who already know the market.' },
            { title: 'Local knowledge', body: 'Shoppers know which stall has it cheaper, and which seller to avoid.' },
          ].map((item) => (
            <div key={item.title}>
              <p className="font-display text-xl font-medium text-brand-yellow">{item.title}</p>
              <p className="mt-2 text-sm text-white/70">{item.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* USE CASES */}
      <section className="mx-auto mt-32 max-w-6xl px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-medium text-brand-green-deep md:text-4xl">Popular use cases</h2>
          <p className="mt-3 text-brand-ink/60">If it can be found in a market, a shop, or online — we can get it.</p>
        </div>
        <div className="mt-12 grid gap-5 sm:grid-cols-2">
          {USE_CASES.map((uc) => (
            <GlassCard key={uc.title} className="flex gap-4">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-yellow/15 text-2xl">
                <uc.icon size={22} strokeWidth={1.5} />
              </span>
              <div>
                <p className="font-display text-base font-medium text-brand-green-deep">{uc.title}</p>
                <p className="mt-1 text-sm italic text-brand-ink/60">{uc.body}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* SHOPPER EARNING CTA */}
      <section className="mx-auto mt-32 max-w-6xl px-4">
        <GlassCard glow="yellow" padding="lg" className="grid items-center gap-8 md:grid-cols-2">
          <div>
            <h2 className="font-display text-3xl font-medium text-brand-green-deep">Earn on your own schedule</h2>
            <p className="mt-3 text-brand-ink/60">
              Choose your area, accept the jobs that work for you, and get paid transparently for every
              shop and delivery. No inventory, no shop rent — just your time and local knowledge.
            </p>
            <Link to="/become-a-shopper" className="mt-6 inline-block">
              <GlassButton>Start earning <ArrowRight size={17} strokeWidth={2} /></GlassButton>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Flexible hours', icon: Clock },
              { label: 'Choose your area', icon: MapPin },
              { label: 'Transparent fees', icon: Percent },
              { label: 'Build your rating', icon: Star },
            ].map((f) => (
              <div key={f.label} className="glass rounded-xl2 p-4 text-center">
                <f.icon size={22} strokeWidth={1.5} className="text-brand-green-fresh" />
                <p className="mt-2 text-sm font-medium text-brand-green-deep">{f.label}</p>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto mt-32 max-w-6xl px-4">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="font-display text-3xl font-medium text-brand-green-deep md:text-4xl">What people are saying</h2>
        </div>
        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {[
            { quote: 'I needed shoes from Owino but couldn\u2019t leave work. My shopper had them delivered before 5pm.', name: 'Brenda, Kampala' },
            { quote: 'I make more in a good week here than I used to selling airtime. The app is straightforward.', name: 'Ivan, Shopper' },
            { quote: 'The price breakdown is what won me over — no surprises when the item arrives.', name: 'Patricia, Kampala' },
          ].map((t) => (
            <GlassCard key={t.name} hover={false}>
              <p className="text-brand-yellow">★★★★★</p>
              <p className="mt-3 text-sm italic text-brand-ink/70">"{t.quote}"</p>
              <p className="mt-4 text-xs font-semibold text-brand-green-deep">{t.name}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="mx-auto mt-32 max-w-4xl px-4 text-center">
        <h2 className="font-display text-3xl font-medium text-brand-green-deep md:text-4xl">
          Ready to get something you can't go get yourself?
        </h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link to="/register?role=customer">
            <GlassButton size="lg">Create Shopping Request</GlassButton>
          </Link>
          <Link to="/register?role=shopper">
            <GlassButton size="lg" variant="secondary">Become a Shopper</GlassButton>
          </Link>
        </div>
      </section>
    </div>
  );
}
