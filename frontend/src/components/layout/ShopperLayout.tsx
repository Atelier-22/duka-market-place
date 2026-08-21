import { Outlet } from 'react-router-dom';
import { BadgeCheck, Home, Map, ShoppingBag, User, Wallet } from 'lucide-react';
import { AppSidebar } from './AppSidebar';

const ITEMS = [
  { to: '/shopper', label: 'Dashboard', icon: Home },
  { to: '/shopper/available', label: 'Available jobs', icon: Map },
  { to: '/shopper/orders', label: 'My jobs', icon: ShoppingBag },
  { to: '/shopper/earnings', label: 'Earnings', icon: Wallet },
  { to: '/shopper/verification', label: 'Verification', icon: BadgeCheck },
  { to: '/shopper/profile', label: 'Profile', icon: User },
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
