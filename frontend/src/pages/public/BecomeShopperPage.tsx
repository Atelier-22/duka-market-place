import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Clock, Coins, MapPin, ShoppingBag, Star } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';

const BENEFITS = [
  { icon: Clock, title: 'Flexible work', body: 'Go online when you want, offline when you don\u2019t. No shifts, no minimums.' },
  { icon: MapPin, title: 'Choose your area', body: 'Set the markets and neighborhoods you know best.' },
  { icon: Bell, title: 'Accept nearby jobs', body: 'See requests close to you first, with the item, budget and estimated fee up front.' },
  { icon: ShoppingBag, title: 'Shop for customers', body: 'Use your knowledge of the market to find exactly what they asked for.' },
  { icon: Coins, title: 'Earn service fees', body: 'Keep your shopping fee and delivery fee — paid out transparently after every completed job.' },
  { icon: Star, title: 'Build your reputation', body: 'Every completed job builds your rating and unlocks more requests.' },
];

export function BecomeShopperPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-16">
      <div className="text-center">
        <h1 className="font-display text-4xl font-medium text-brand-green-deep md:text-5xl">Earn money as a local shopper</h1>
        <p className="mx-auto mt-4 max-w-xl text-brand-ink/60">
          Turn your knowledge of local markets and shops into flexible income. Set your own hours,
          choose your own area, and get paid transparently for every job.
        </p>
        <Link to="/register?role=shopper" className="mt-8 inline-block">
          <GlassButton size="lg">Become a shopper <ArrowRight size={17} strokeWidth={2} /></GlassButton>
        </Link>
      </div>

      <div className="mt-16 grid gap-5 md:grid-cols-3">
        {BENEFITS.map((b) => (
          <GlassCard key={b.title}>
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-mist text-brand-green-deep"><b.icon size={20} strokeWidth={1.6} /></span>
            <p className="mt-4 font-display text-base font-medium text-brand-green-deep">{b.title}</p>
            <p className="mt-1.5 text-sm text-brand-ink/60">{b.body}</p>
          </GlassCard>
        ))}
      </div>

      <GlassCard glow="yellow" padding="lg" className="mt-16">
        <h2 className="font-display text-2xl font-medium text-brand-green-deep">How shoppers get paid</h2>
        <p className="mt-3 max-w-2xl text-sm text-brand-ink/60">
          Every order shows the exact item price, your shopping fee, and the delivery fee, all recorded
          before the customer approves the purchase. Once an order is completed, your shopping fee and
          delivery fee (minus the platform's small cut) are released straight to your available balance.
          There is never a reason to hide the real item price — your earnings never depend on it.
        </p>
      </GlassCard>
    </div>
  );
}
