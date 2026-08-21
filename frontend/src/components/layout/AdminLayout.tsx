import { Outlet } from 'react-router-dom';
import {
  BadgeCheck, FileText, LayoutDashboard, Package, Scale, Settings, ShoppingBag, Users,
} from 'lucide-react';
import { AppSidebar } from './AppSidebar';

const ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/customers', label: 'Customers', icon: Users },
  { to: '/admin/shoppers', label: 'Shoppers', icon: ShoppingBag },
  { to: '/admin/verifications', label: 'Verification', icon: BadgeCheck },
  { to: '/admin/requests', label: 'Requests', icon: FileText },
  { to: '/admin/orders', label: 'Orders', icon: Package },
  { to: '/admin/disputes', label: 'Disputes', icon: Scale },
  { to: '/admin/fees', label: 'Fees', icon: Settings },
];

export function AdminLayout() {
  return (
    <div className="min-h-screen bg-brand-green-mist/30">
      <div className="mx-auto flex max-w-[1600px] gap-4 p-4">
        <AppSidebar items={ITEMS} roleLabel="Admin" />
        <main className="min-w-0 flex-1 py-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
