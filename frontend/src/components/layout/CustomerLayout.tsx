import { Home, MessageCircle, Package, PlusCircle, User } from 'lucide-react';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

const ITEMS: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home, tint: 'fresh' },
  { to: '/app/requests/new', label: 'Request', icon: PlusCircle, tint: 'yellow' },
  { to: '/app/orders', label: 'Orders', icon: Package, tint: 'green' },
  { to: '/app/messages', label: 'Chats', icon: MessageCircle, badge: 'messages' as const, tint: 'deep' },
  { to: '/app/account', label: 'Account', icon: User, tint: 'ink' },
];

export function CustomerLayout() {
  return <AppShell items={ITEMS} roleLabel="Customer" />;
}
