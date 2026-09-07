import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BRAND } from '../../config/brand';
import { DukaMark } from '../ui/DukaLogo';
import { Button } from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { homeFor } from '../../utils/home';

const LINKS = [
  { to: '/how-it-works', label: 'How it works' },
  { to: '/become-a-shopper', label: 'Become a shopper' },
  { to: '/about', label: 'About' },
  { to: '/help', label: 'Help' },
];

export function PublicNavbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open]);

  const homePath = user ? homeFor(user.role) : '/';
  const link = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'text-brand-green-deep' : 'text-ink-2 hover:text-ink'}`;

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6" aria-label="Site">
        <Link to="/" aria-label={`${BRAND.name} home`} className="flex items-center gap-2.5">
          <DukaMark size={32} />
          <span className="font-display text-xl font-semibold leading-none text-brand-green-deep">{BRAND.name}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={link}>
              {l.label}
            </NavLink>
          ))}
        </div>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <Button size="sm" onClick={() => navigate(homePath)}>Go to dashboard</Button>
          ) : (
            <>
              <Button size="sm" variant="tertiary" onClick={() => navigate('/login')}>Log in</Button>
              <Button size="sm" onClick={() => navigate('/register')}>Get started</Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-brand-green-deep transition-colors hover:bg-surface-2 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={22} strokeWidth={2} /> : <Menu size={22} strokeWidth={2} />}
        </button>
      </nav>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-16 z-40 flex flex-col border-t border-line bg-surface p-4 md:hidden">
          <div className="flex flex-col">
            {LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                onClick={() => setOpen(false)}
                className="min-h-[52px] border-b border-line py-3 text-[17px] font-medium text-ink last:border-0"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <div className="mt-auto flex flex-col gap-2 pb-4">
            {user ? (
              <Button size="lg" fullWidth onClick={() => { setOpen(false); navigate(homePath); }}>Go to dashboard</Button>
            ) : (
              <>
                <Button size="lg" fullWidth onClick={() => { setOpen(false); navigate('/register'); }}>Get started</Button>
                <Button size="lg" variant="secondary" fullWidth onClick={() => { setOpen(false); navigate('/login'); }}>Log in</Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
