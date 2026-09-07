import { Link } from 'react-router-dom';
import { Bell, ChevronRight, CreditCard, MapPin, Package, Settings, ShieldCheck, Truck, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Card } from '../../components/ui/Card';
import { Avatar } from '../../components/ui/Avatar';
import { ListRow } from '../../components/ui/ListRow';
import { PageHeader } from '../../components/ui/PageHeader';

const QUICK = [
  { to: '/app/settings/personal', label: 'Personal information', description: 'Name, phone, email and photo', icon: User },
  { to: '/app/settings/addresses', label: 'Saved addresses', description: 'Where your orders get delivered', icon: MapPin },
  { to: '/app/settings/delivery', label: 'Delivery preferences', description: 'Handover and how to reach you', icon: Truck },
  { to: '/app/payments', label: 'Payments', description: 'What you have paid, and for which order', icon: CreditCard },
  { to: '/app/orders', label: 'Orders', description: 'Everything in flight and everything past', icon: Package },
  { to: '/app/settings/notify-orders', label: 'Notifications', description: 'Choose what reaches you', icon: Bell },
  { to: '/app/settings/privacy', label: 'Privacy & security', description: 'Your data, devices and permissions', icon: ShieldCheck },
];

export function AccountPage() {
  const { user } = useAuth();

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader title="Account" />

      {user && (
        <Link to="/app/settings/personal" className="block">
          <Card hover className="flex items-center gap-4">
            <Avatar name={user.fullName} src={user.avatarUrl} size={56} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-display text-h3 font-medium text-brand-green-deep">{user.fullName}</span>
              <span className="block truncate text-small text-ink-2">{user.phone}{user.email ? ` · ${user.email}` : ''}</span>
            </span>
            <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-ink-3" />
          </Card>
        </Link>
      )}

      <Card padding="none" className="mt-4">
        {QUICK.map((link) => (
          <ListRow key={link.to} to={link.to} icon={link.icon} label={link.label} description={link.description} />
        ))}
      </Card>

      <Card padding="none" className="mt-4">
        <ListRow to="/app/settings" icon={Settings} label="All settings" description="Appearance, language, help and more" />
      </Card>
    </div>
  );
}
