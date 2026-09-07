import {
  BarChart3, Boxes, ChartLine, Home, Megaphone, Package, PackagePlus, Settings, Star, Store, Users, Wallet, Heart,
} from 'lucide-react';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

const ITEMS: NavItem[] = [
  { to: '/seller', label: 'Home', icon: Home, tint: 'fresh' },
  { to: '/seller/products', label: 'Products', icon: Package, tint: 'green' },
  { to: '/seller/orders', label: 'Orders', icon: Boxes, tint: 'yellow' },
  { to: '/seller/inventory', label: 'Stock', icon: PackagePlus, tint: 'deep' },
  { to: '/seller/analytics', label: 'Analytics', icon: ChartLine, tint: 'ink' },
  { to: '/seller/customers', label: 'Customers', icon: Users },
  { to: '/seller/store', label: 'Store', icon: Store },
  { to: '/seller/reviews', label: 'Reviews', icon: Star },
  { to: '/seller/followers', label: 'Followers', icon: Heart },
  { to: '/seller/forecast', label: 'Forecasting', icon: BarChart3 },
  { to: '/seller/promotions', label: 'Promotions', icon: Megaphone },
  { to: '/seller/payments', label: 'Payments', icon: Wallet },
  { to: '/seller/settings', label: 'Settings', icon: Settings },
];

export function SellerLayout() {
  return <AppShell items={ITEMS} roleLabel="Seller" maxWidth="max-w-[1500px]" />;
}
