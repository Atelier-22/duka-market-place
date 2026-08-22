import {
  BadgeCheck, ChartLine, Eye, FileText, LayoutDashboard, Package, Percent, Scale,
  Settings, ShieldCheck, ShoppingBag, Users, Wallet, Wrench,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { AppShell } from './AppShell';
import { NavItem } from './MobileNav';

const ITEMS: NavItem[] = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/shoppers', label: 'Shoppers', icon: ShoppingBag },
  { to: '/admin/verifications', label: 'Verification', icon: BadgeCheck },
  { to: '/admin/finance', label: 'Finance', icon: Wallet },
  { to: '/admin/analytics', label: 'Analytics', icon: ChartLine },
  { to: '/admin/operations', label: 'Operations', icon: Wrench },
  { to: '/admin/requests', label: 'Requests', icon: FileText },
  { to: '/admin/disputes', label: 'Disputes', icon: Scale },
  // Fees is the platform's pricing, not the admin's own preferences — it had
  // the Settings icon only because there was no Settings page to give it to.
  { to: '/admin/fees', label: 'Fees', icon: Percent },
  { to: '/admin/settings', label: 'Settings', icon: Settings },
];

/**
 * Only a super admin is shown these, and the API refuses them to anyone else.
 * An admin never sees the entries, so nothing in their console suggests a layer
 * above them exists — the same reasoning that keeps /admin off the customer and
 * shopper UI entirely.
 */
const SUPER_ONLY: NavItem[] = [
  { to: '/admin/god-view', label: 'Everything', icon: Eye },
  { to: '/admin/staff', label: 'Admins', icon: ShieldCheck },
];

export function AdminLayout() {
  const { user } = useAuth();
  const isSuper = user?.role === 'super_admin';
  const items = isSuper ? [...SUPER_ONLY, ...ITEMS] : ITEMS;

  // Wider than the other two: these pages are mostly tables.
  return (
    <AppShell
      items={items}
      roleLabel={isSuper ? 'Super admin' : 'Admin'}
      maxWidth="max-w-[1600px]"
    />
  );
}
