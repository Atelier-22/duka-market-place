import { BadgeCheck, Home, Map, MessageCircle, Settings, ShoppingBag, User, Wallet } from 'lucide-react';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

// The first four become the phone's bottom tabs — a shopper lives in available
// jobs, their own jobs and the chat, so those come before earnings and admin.
const ITEMS: NavItem[] = [
  { to: '/shopper', label: 'Home', icon: Home },
  { to: '/shopper/available', label: 'Jobs', icon: Map },
  { to: '/shopper/orders', label: 'My jobs', icon: ShoppingBag },
  { to: '/shopper/messages', label: 'Chats', icon: MessageCircle, badge: 'messages' as const },
  { to: '/shopper/earnings', label: 'Earnings', icon: Wallet },
  { to: '/shopper/verification', label: 'Verification', icon: BadgeCheck },
  { to: '/shopper/profile', label: 'Profile', icon: User },
  { to: '/shopper/settings', label: 'Settings', icon: Settings },
];

export function ShopperLayout() {
  return <AppShell items={ITEMS} roleLabel="Shopper" />;
}
