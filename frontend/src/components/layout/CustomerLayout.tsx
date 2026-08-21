import { ClipboardList, CreditCard, Home, MessageCircle, Package, PlusCircle, Settings, User } from 'lucide-react';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

// Order matters on a phone: the first four become the bottom tabs, so they are
// the things a customer does constantly, not the full alphabet of pages.
const ITEMS: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/app/requests/new', label: 'Request', icon: PlusCircle },
  { to: '/app/orders', label: 'Orders', icon: Package },
  { to: '/app/messages', label: 'Chats', icon: MessageCircle, badge: 'messages' as const },
  { to: '/app/requests', label: 'My requests', icon: ClipboardList },
  { to: '/app/payments', label: 'Payments', icon: CreditCard },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

export function CustomerLayout() {
  return <AppShell items={ITEMS} roleLabel="Customer" />;
}
