import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Boxes, Heart, Megaphone, ShieldCheck, Store as StoreIcon, Truck, Users } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { setSession } from '../../services/session';
import { useAuth } from '../../context/AuthContext';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useBrandTransition } from '../../components/ui/BrandTransition';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { useToast } from '../../components/ui/Toast';

const STEPS = [
  { title: 'Open your store', body: 'Name it, pick a category, add a logo. Your storefront gets its own address on Duka.' },
  { title: 'Add products', body: 'Photos, price, stock and options like size or colour. Save drafts, publish when ready.' },
  { title: 'Get discovered', body: 'Published products appear on the marketplace, in search, and to everyone who follows you.' },
  { title: 'Deliver and get paid', body: 'Orders arrive in your dashboard. Confirm, prepare, deliver, and collect on delivery.' },
];

const FEATURES = [
  { icon: Boxes, title: 'Inventory that stays honest', body: 'Stock is reserved the moment someone orders and released if they cancel. No overselling.' },
  { icon: BarChart3, title: 'Real analytics', body: 'Sales, orders, top products and conversion, from your actual data. No made-up numbers.' },
  { icon: Heart, title: 'Followers', body: 'Customers follow your store and hear when you publish something new.' },
  { icon: Megaphone, title: 'Promotions', body: 'Run percentage or fixed discounts across chosen products with start and end dates.' },
  { icon: ShieldCheck, title: 'Verified badge', body: 'Submit your business details once. Verified stores stand out to buyers.' },
  { icon: Users, title: 'Shoppers too', body: 'Duka shoppers fulfilling requests can find your products and bring you orders.' },
];

export function SellPage() {
  usePageMeta({
    title: 'Sell on Duka',
    description: 'Open a store on Duka, publish your products and reach customers and shoppers across Uganda. Free to start, pay on delivery.',
  });
  const { user, refresh } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const { play } = useBrandTransition();
  const [enrolling, setEnrolling] = useState(false);

  async function enroll() {
    setEnrolling(true);
    try {
      const res = await api.post('/seller/enroll');
      setSession(res.data.accessToken, res.data.refreshToken, true);
      await play({
        label: 'Welcome to your store',
        task: async () => {
          await refresh();
          navigate('/seller', { replace: true });
        },
      });
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setEnrolling(false);
    }
  }

  const cta = user?.role === 'seller'
    ? <Link to="/seller"><Button size="lg">Go to your dashboard <ArrowRight size={16} /></Button></Link>
    : user
      ? <Button size="lg" onClick={enroll} disabled={enrolling}>{enrolling ? 'Opening…' : 'Open a seller account'} <ArrowRight size={16} /></Button>
      : <Link to="/register?role=seller"><Button size="lg">Start selling <ArrowRight size={16} /></Button></Link>;

  return (
    <div className="pb-20">
      <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 lg:pt-20">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div>
            <p className="text-label font-semibold uppercase tracking-wide text-brand-green">Sell on Duka</p>
            <h1 className="mt-2 font-display text-h1 font-medium text-brand-green-deep md:text-display">
              Your shop, open to everyone on Duka.
            </h1>
            <p className="mt-5 max-w-lg text-body text-ink-2">
              Publish what you stock, and customers across Kampala and beyond can find it, follow your store, and order for delivery. You keep your prices and your customers.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              {cta}
              <Link to="/marketplace"><Button size="lg" variant="secondary">See the marketplace</Button></Link>
            </div>
            <p className="mt-4 text-caption text-ink-3">{user && user.role !== 'seller' ? 'Your seller account links to this one. Switch between them any time.' : 'Free to open. No listing fees.'}</p>
          </div>
          <Card padding="lg" className="bg-brand-green-deep text-white">
            <div className="flex items-center gap-3">
              <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10"><StoreIcon size={22} /></span>
              <div><p className="font-display text-lg font-semibold">Your storefront</p><p className="text-sm text-white/70">dukashoppers.com/store/your-name</p></div>
            </div>
            <ul className="mt-5 grid grid-cols-2 gap-3 text-sm">
              {['Logo and cover', 'Verified badge', 'Product search', 'Reviews and replies', 'Follower count', 'Store policies'].map((f) => (
                <li key={f} className="flex items-center gap-2 text-white/85"><span className="h-1.5 w-1.5 rounded-full bg-brand-green-fresh" /> {f}</li>
              ))}
            </ul>
          </Card>
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:mt-24">
        <h2 className="font-display text-h2 font-medium text-brand-green-deep sm:text-h1">How it works</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Card padding="lg" className="h-full">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-green-mist font-display text-base font-semibold text-brand-green-deep">{i + 1}</span>
                <p className="mt-3 font-medium text-ink">{s.title}</p>
                <p className="mt-1 text-sm text-ink-2">{s.body}</p>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6 lg:mt-24">
        <h2 className="font-display text-h2 font-medium text-brand-green-deep sm:text-h1">Built for running a business</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} padding="lg">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-green-mist text-brand-green-deep"><f.icon size={20} strokeWidth={1.8} /></span>
              <p className="mt-3 font-medium text-ink">{f.title}</p>
              <p className="mt-1 text-sm text-ink-2">{f.body}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-16 max-w-3xl px-4 text-center sm:px-6 lg:mt-24">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-brand-green-mist text-brand-green-deep"><Truck size={22} /></span>
        <h2 className="mt-4 font-display text-h2 font-medium text-brand-green-deep sm:text-h1">Ready when you are</h2>
        <p className="mt-3 text-body text-ink-2">Set up in about five minutes. Publish your first product today.</p>
        <div className="mt-6 flex justify-center">{cta}</div>
      </section>
    </div>
  );
}
