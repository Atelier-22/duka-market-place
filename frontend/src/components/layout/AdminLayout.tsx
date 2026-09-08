import {
  BadgeCheck, ChartLine, Eye, FileText, LayoutDashboard, Lightbulb, Package, Percent, Scale,
  Settings, ShieldCheck, ShoppingBag, Store, Tag, Users, Wallet, Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

const ITEMS: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/shoppers', label: 'Shoppers', icon: ShoppingBag },
  { to: '/admin/sellers', label: 'Sellers', icon: Store },
  { to: '/admin/seller-products', label: 'Products', icon: Tag },
  { to: '/admin/knowledge', label: 'Intelligence', icon: Lightbulb },
  { to: '/admin/verifications', label: 'Verification', icon: BadgeCheck },
  { to: '/admin/finance', label: 'Finance', icon: Wallet },
  { to: '/admin/analytics', label: 'Analytics', icon: ChartLine },
  { to: '/admin/operations', label: 'Operations', icon: Wrench },
  { to: '/admin/requests', label: 'Requests', icon: FileText },
  { to: '/admin/disputes', label: 'Disputes', icon: Scale },

  { to: '/admin/fees', label: 'Fees', icon: Percent },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

const SUPER_ONLY: NavItem[] = [
  { to: '/admin/god-view', label: 'Everything', icon: Eye },
  { to: '/admin/staff', label: 'Admins', icon: ShieldCheck },
];

export function AdminLayout() {
  const { user } = useAuth();
  const isSuper = user?.role === 'super_admin';
  const items = isSuper ? [...SUPER_ONLY, ...ITEMS] : ITEMS;

  return (
    <AppShell
      items={items}
      roleLabel={isSuper ? 'Super admin' : 'Admin'}
      maxWidth="max-w-[1600px]"
    />
  );
}
