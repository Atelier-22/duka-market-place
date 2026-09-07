import { Link } from 'react-router-dom';
import { ChevronRight, CreditCard, LogOut, LucideIcon, Settings, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';

const LINKS: { to: string; label: string; description: string; icon: LucideIcon }[] = [
  { to: '/app/profile', label: 'Profile', description: 'Your name, phone and photo', icon: User },
  { to: '/app/payments', label: 'Payments', description: 'What you have paid, and for which order', icon: CreditCard },
  { to: '/app/settings', label: 'Settings', description: 'Addresses, notifications, appearance, security', icon: Settings },
];

export function AccountPage() {
  const { user, logout } = useAuth();

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Account</h1>
      {user && (
        <p className="mt-1 text-sm text-brand-ink/55">
          {user.fullName} · {user.phone}
        </p>
      )}

      <GlassCard padding="sm" className="mt-6">
        <div className="flex flex-col">
          {LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex min-h-[64px] items-center gap-3 border-b border-brand-green/10 px-2 py-3 last:border-0"
            >
              <span className="flex w-5 shrink-0 items-center justify-center">
                <link.icon size={19} strokeWidth={1.75} className="text-brand-ink/45" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-medium text-brand-ink">{link.label}</span>
                <span className="block text-xs text-brand-ink/50">{link.description}</span>
              </span>
              <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-brand-ink/30" />
            </Link>
          ))}
        </div>
      </GlassCard>

      <div className="mt-6 border-t border-brand-green/10 pt-4">
        <button
          type="button"
          onClick={logout}
          className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-brand-red hover:bg-brand-red/10"
        >
          <LogOut size={18} strokeWidth={1.75} className="shrink-0" />
          Log out
        </button>
      </div>
    </div>
  );
}
