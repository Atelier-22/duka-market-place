import { Home, MessageCircle, Package, PlusCircle, User } from 'lucide-react';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

const ITEMS: NavItem[] = [
  { to: '/app', label: 'Home', icon: Home },
  { to: '/app/requests/new', label: 'Request', icon: PlusCircle },
  { to: '/app/orders', label: 'Orders', icon: Package },
  { to: '/app/messages', label: 'Chats', icon: MessageCircle, badge: 'messages' as const },
  { to: '/app/account', label: 'Account', icon: User },
];

export function CustomerLayout() {
  return <AppShell items={ITEMS} roleLabel="Customer" />;
}
