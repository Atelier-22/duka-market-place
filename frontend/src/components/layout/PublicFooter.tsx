import { Link } from 'react-router-dom';
import { BRAND } from '../../config/brand';
import { DukaLockup } from '../ui/DukaLogo';

export function PublicFooter() {
  return (
    <footer className="mt-24 px-4 pb-10">
      <div className="glass-deep mx-auto max-w-6xl rounded-xl3 p-10">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 md:col-span-1">
            <DukaLockup markSize={44} variant="light" align="left" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Product</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-white/70">
              <Link to="/how-it-works" className="hover:text-white">How it works</Link>
              <Link to="/become-a-shopper" className="hover:text-white">Become a shopper</Link>
              <Link to="/register" className="hover:text-white">Create a request</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Company</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-white/70">
              <Link to="/about" className="hover:text-white">About</Link>
              <Link to="/help" className="hover:text-white">Help &amp; FAQ</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Legal</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-white/70">
              <Link to="/privacy" className="hover:text-white">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-white">Terms &amp; Conditions</Link>
              <Link to="/refunds" className="hover:text-white">Refund Policy</Link>
              <Link to="/cookies" className="hover:text-white">Cookies &amp; Storage</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-white/40">Contact</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-white/70">
              <a href={`mailto:${BRAND.supportEmail}`} className="hover:text-white">
                {BRAND.supportEmail}
              </a>
              {/* Only rendered once there is a real number — an unanswerable
                  support line is worse than none. */}
              {BRAND.supportPhone && <span>{BRAND.supportPhone}</span>}
              <span>{BRAND.country}</span>
            </div>
          </div>
        </div>
        <div className="mt-10 flex flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-white/40 md:flex-row">
          <span>© {new Date().getFullYear()} {BRAND.name}. All rights reserved.</span>
          <span>Operating in {BRAND.country}. Not yet incorporated as a company.</span>
        </div>
      </div>
    </footer>
  );
}
