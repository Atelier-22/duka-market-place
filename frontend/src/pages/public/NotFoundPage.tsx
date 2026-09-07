import { Link } from 'react-router-dom';
import { ArrowLeft, Compass, LifeBuoy, ShoppingBag } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { usePageMeta } from '../../hooks/usePageMeta';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../utils/home';

const PLACES = [
  { to: '/how-it-works', icon: Compass, label: 'How Duka works', hint: 'Seven steps from request to doorstep' },
  { to: '/become-a-shopper', icon: ShoppingBag, label: 'Become a shopper', hint: 'Earn by shopping for people nearby' },
  { to: '/help', icon: LifeBuoy, label: 'Help & FAQ', hint: 'Answers to the questions we hear most' },
];

export function NotFoundPage() {
  usePageMeta({ title: 'Page not found', description: 'That page does not exist on Duka.', noindex: true });
  const { user } = useAuth();
  const home = user ? homeFor(user.role) : '/';

  return (
    <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6 sm:py-24">
      <p className="text-label font-semibold uppercase tracking-wide text-brand-green">404</p>
      <h1 className="mt-2 font-display text-display font-medium text-brand-green-deep">
        We looked, but this page isn&rsquo;t here.
      </h1>
      <p className="mt-4 max-w-xl text-body text-ink-2">
        The link may be old, mistyped, or the page has moved. Nothing has gone wrong on your side.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link to={home}>
          <Button variant="primary">
            <ArrowLeft size={16} strokeWidth={2} /> {user ? 'Back to my Duka' : 'Back to the homepage'}
          </Button>
        </Link>
        {!user && (
          <Link to="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
        )}
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-3">
        {PLACES.map((place) => (
          <Link key={place.to} to={place.to} className="block">
            <Card className="h-full" padding="lg">
              <place.icon size={20} strokeWidth={1.8} className="text-brand-green" />
              <p className="mt-3 font-medium text-ink">{place.label}</p>
              <p className="mt-1 text-small text-ink-2">{place.hint}</p>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
