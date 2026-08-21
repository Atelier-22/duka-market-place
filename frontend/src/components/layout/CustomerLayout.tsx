import { Outlet } from 'react-router-dom';
import { ClipboardList, CreditCard, Home, MessageCircle, Package, PlusCircle, Settings, User } from 'lucide-react';
import { AppSidebar } from './AppSidebar';

const ITEMS = [
  { to: '/app', label: 'Dashboard', icon: Home },
  { to: '/app/requests/new', label: 'Request something', icon: PlusCircle },
  { to: '/app/requests', label: 'My requests', icon: ClipboardList },
  { to: '/app/orders', label: 'Orders', icon: Package },
  { to: '/app/messages', label: 'Chats', icon: MessageCircle, badge: 'messages' as const },
  { to: '/app/payments', label: 'Payments', icon: CreditCard },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/settings', label: 'Settings', icon: Settings },
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
