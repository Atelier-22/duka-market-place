import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

const ITEMS = [
  { to: '/app', label: 'Dashboard', icon: '🏠' },
  { to: '/app/requests/new', label: 'Request something', icon: '➕' },
  { to: '/app/requests', label: 'My requests', icon: '📋' },
  { to: '/app/orders', label: 'Orders', icon: '📦' },
  { to: '/app/payments', label: 'Payments', icon: '💳' },
  { to: '/app/profile', label: 'Profile', icon: '👤' },
];

export function CustomerLayout() {
  return (
    <div className="min-h-screen">
      <div className="atmosphere" />
      <div className="mx-auto flex max-w-7xl gap-4 p-4">
        <AppSidebar items={ITEMS} roleLabel="Customer" />
        <main className="min-w-0 flex-1 py-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
