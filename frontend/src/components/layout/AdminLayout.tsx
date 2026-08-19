import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

const ITEMS = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/customers', label: 'Customers', icon: '🧑' },
  { to: '/admin/shoppers', label: 'Shoppers', icon: '🛍️' },
  { to: '/admin/verifications', label: 'Verification', icon: '✅' },
  { to: '/admin/requests', label: 'Requests', icon: '📝' },
  { to: '/admin/orders', label: 'Orders', icon: '📦' },
  { to: '/admin/disputes', label: 'Disputes', icon: '⚖️' },
  { to: '/admin/fees', label: 'Fees', icon: '⚙️' },
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
