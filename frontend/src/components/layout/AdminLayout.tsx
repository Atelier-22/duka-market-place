import {
  BadgeCheck, FileText, LayoutDashboard, Package, Scale, Settings, ShoppingBag, Users,
} from 'lucide-react';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

const ITEMS: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/shoppers', label: 'Shoppers', icon: ShoppingBag },
  { to: '/admin/verifications', label: 'Verification', icon: BadgeCheck },
  { to: '/admin/requests', label: 'Requests', icon: FileText },
  { to: '/admin/disputes', label: 'Disputes', icon: Scale },
  { to: '/admin/fees', label: 'Fees', icon: Settings },
];

export function AdminLayout() {
  // Wider than the other two: these pages are mostly tables.
  return <AppShell items={ITEMS} roleLabel="Admin" maxWidth="max-w-[1600px]" />;
}
