import { useAuth } from '../../context/AuthContext';
import { PublicLayout } from './PublicLayout';
import { CustomerLayout } from './CustomerLayout';
import { ShopperLayout } from './ShopperLayout';
import { SellerLayout } from './SellerLayout';
import { SkeletonAppShell } from '../ui/Skeleton';
import { FloatingCart } from '../market/FloatingCart';

export function MarketLayout() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <SkeletonAppShell />;
  if (user?.role === 'customer') return <CustomerLayout />;
  if (user?.role === 'shopper') return <ShopperLayout />;
  if (user?.role === 'seller') return <SellerLayout />;
  return (
    <>
      <PublicLayout />
      <FloatingCart />
    </>
  );
}
