import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { BRAND } from '../../config/brand';
import { GlassButton } from '../ui/GlassButton';
import { useAuth } from '../../context/AuthContext';

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

  const homePath = user ? (user.role === 'shopper' ? '/shopper' : user.role === 'admin' ? '/admin' : '/app') : '/';

  return (
    <header className="sticky top-0 z-40 px-4 pt-4">
      <nav className="glass mx-auto flex max-w-6xl items-center justify-between rounded-full px-5 py-3">
        <Link to="/" className="flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh font-display text-sm font-bold text-white">
            {BRAND.name[0]}
          </span>
          <span className="font-display text-lg font-semibold text-brand-green-deep">{BRAND.name}</span>
        </Link>

        <div className="hidden items-center gap-6 md:flex">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm font-medium text-brand-ink/70 hover:text-brand-green-deep">
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <GlassButton size="sm" onClick={() => navigate(homePath)}>Go to dashboard</GlassButton>
          ) : (
            <>
              <Link to="/login" className="text-sm font-semibold text-brand-green-deep">Log in</Link>
              <GlassButton size="sm" onClick={() => navigate('/register')}>Get started</GlassButton>
            </>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          <span className="text-xl text-brand-green-deep">{open ? '✕' : '☰'}</span>
        </button>
      </nav>

      {open && (
        <div className="glass mx-auto mt-2 flex max-w-6xl flex-col gap-1 rounded-2xl p-4 md:hidden">
          {LINKS.map((l) => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="rounded-lg px-3 py-2 text-sm font-medium text-brand-ink/70 hover:bg-brand-green-mist">
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex gap-2 border-t border-brand-green/10 pt-3">
            {user ? (
              <GlassButton size="sm" fullWidth onClick={() => navigate(homePath)}>Dashboard</GlassButton>
            ) : (
              <>
                <GlassButton size="sm" variant="secondary" fullWidth onClick={() => navigate('/login')}>Log in</GlassButton>
                <GlassButton size="sm" fullWidth onClick={() => navigate('/register')}>Sign up</GlassButton>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
