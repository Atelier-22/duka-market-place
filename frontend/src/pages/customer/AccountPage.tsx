import { Link } from 'react-router-dom';
import {
  Bell, ChevronRight, CreditCard, LucideIcon, MapPin, Package, Settings, ShieldCheck, Truck, User,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';

const QUICK: { to: string; label: string; description: string; icon: LucideIcon }[] = [
  { to: '/app/settings/personal', label: 'Personal information', description: 'Name, phone, email and photo', icon: User },
  { to: '/app/settings/addresses', label: 'Saved addresses', description: 'Where your orders get delivered', icon: MapPin },
  { to: '/app/settings/delivery', label: 'Delivery preferences', description: 'Handover and how to reach you', icon: Truck },
  { to: '/app/payments', label: 'Payments', description: 'What you have paid, and for which order', icon: CreditCard },
  { to: '/app/orders', label: 'Orders', description: 'Everything in flight and everything past', icon: Package },
  { to: '/app/settings/notify-orders', label: 'Notifications', description: 'Choose what reaches you', icon: Bell },
  { to: '/app/settings/privacy', label: 'Privacy & security', description: 'Your data, devices and permissions', icon: ShieldCheck },
];

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Account</h1>

      {user && (
        <Link
          to="/app/settings/personal"
          className="glass mt-5 flex items-center gap-3 rounded-xl2 p-4 transition-transform active:scale-[0.99]"
        >
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="h-14 w-14 rounded-full object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-green text-base font-semibold text-white">
              {initials(user.fullName)}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="block truncate font-display text-lg font-medium text-brand-green-deep">{user.fullName}</span>
            <span className="block truncate text-sm text-brand-ink/50">{user.phone}</span>
          </span>
          <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-brand-ink/30" />
        </Link>
      )}

      <GlassCard padding="sm" className="mt-4">
        <div className="flex flex-col">
          {QUICK.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="flex min-h-[64px] items-center gap-3 border-b border-brand-green/10 px-2 py-3 transition-colors last:border-0 active:bg-brand-green-mist/60"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green">
                <link.icon size={17} strokeWidth={1.75} />
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

      <Link
        to="/app/settings"
        className="glass mt-4 flex min-h-[60px] items-center gap-3 rounded-xl2 px-4 transition-transform active:scale-[0.99]"
      >
        <Settings size={19} strokeWidth={1.75} className="text-brand-green-deep" />
        <span className="flex-1 text-[15px] font-medium text-brand-ink">All settings</span>
        <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-brand-ink/30" />
      </Link>
    </div>
  );
}
