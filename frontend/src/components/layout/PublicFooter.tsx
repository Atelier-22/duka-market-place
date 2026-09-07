import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';
import { DukaLockup } from '../ui/DukaLogo';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { to: '/marketplace', label: 'Marketplace' },
      { to: '/how-it-works', label: 'How it works' },
      { to: '/become-a-shopper', label: 'Become a shopper' },
      { to: '/sell', label: 'Sell on Duka' },
      { to: '/register', label: 'Create a request' },
    ],
  },
  {
    title: 'Company',
    links: [
      { to: '/about', label: 'About' },
      { to: '/help', label: 'Help & FAQ' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { to: '/privacy', label: 'Privacy Policy' },
      { to: '/terms', label: 'Terms & Conditions' },
      { to: '/refunds', label: 'Refund Policy' },
      { to: '/cookies', label: 'Cookies & Storage' },
    ],
  },
];

export function PublicFooter() {
  return (
    <footer className="surface-deep mt-24">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:py-16">
        <div className="grid grid-cols-2 gap-10 md:grid-cols-5">
          <div className="col-span-2 md:col-span-2">
            <DukaLockup markSize={44} variant="light" align="left" />
            <p className="mt-4 max-w-xs text-sm text-white/60">
              A verified local shopper goes to the market, shop or seller you name, buys what you need, and brings it to your door.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-label font-semibold uppercase text-white/45">{col.title}</p>
              <div className="mt-3 flex flex-col gap-2.5 text-sm text-white/75">
                {col.links.map((l) => (
                  <Link key={l.to} to={l.to} className="transition-colors hover:text-white">{l.label}</Link>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-12 flex flex-col gap-3 border-t border-white/10 pt-6 text-caption text-white/50 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          <span className="flex flex-wrap gap-x-4 gap-y-1">
            <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-white">{BRAND.supportEmail}</a>
            {BRAND.supportPhone && <span>{BRAND.supportPhone}</span>}
            <span>Operated by {BRAND.operatorName} in {BRAND.country}.</span>
          </span>
        </div>
      </div>
    </footer>
  );
}
