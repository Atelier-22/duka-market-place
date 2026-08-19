import { Outlet } from 'react-router-dom';
import { AppSidebar } from './AppSidebar';

const ITEMS = [
  { to: '/shopper', label: 'Dashboard', icon: '🏠' },
  { to: '/shopper/available', label: 'Available jobs', icon: '🗺️' },
  { to: '/shopper/orders', label: 'My jobs', icon: '🛍️' },
  { to: '/shopper/earnings', label: 'Earnings', icon: '💰' },
  { to: '/shopper/verification', label: 'Verification', icon: '✅' },
  { to: '/shopper/profile', label: 'Profile', icon: '👤' },
];

export function ShopperLayout() {
  return (
    <div className="min-h-screen">
      <div className="atmosphere" />
      <div className="mx-auto flex max-w-7xl gap-4 p-4">
        <AppSidebar items={ITEMS} roleLabel="Shopper" />
        <main className="min-w-0 flex-1 py-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
