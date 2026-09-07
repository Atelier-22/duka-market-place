import { BadgeCheck, Home, Map, MessageCircle, Settings, ShoppingBag, User, Wallet } from 'lucide-react';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

const ITEMS: NavItem[] = [
  { to: '/shopper', label: 'Home', icon: Home, tint: 'fresh' },
  { to: '/shopper/available', label: 'Jobs', icon: Map, tint: 'yellow' },
  { to: '/shopper/orders', label: 'My jobs', icon: ShoppingBag, tint: 'green' },
  { to: '/shopper/messages', label: 'Chats', icon: MessageCircle, badge: 'messages' as const, tint: 'deep' },
  { to: '/shopper/earnings', label: 'Earnings', icon: Wallet, tint: 'ink' },
  { to: '/shopper/verification', label: 'Verification', icon: BadgeCheck },
  { to: '/shopper/profile', label: 'Profile', icon: User },
  { to: '/shopper/settings', label: 'Settings', icon: Settings },
];

export function ShopperLayout() {
  return <AppShell items={ITEMS} roleLabel="Shopper" />;
}
