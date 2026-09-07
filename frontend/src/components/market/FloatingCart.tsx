import { Link, useLocation } from 'react-router-dom';
import { ShoppingCart } from 'lucide-react';
import { useCart } from '../../market/cart';
import { formatUgx } from '../../market/format';

export function FloatingCart() {
  const { count, subtotal } = useCart();
  const { pathname } = useLocation();
  if (count === 0 || pathname === '/cart' || pathname === '/checkout' || pathname.startsWith('/product/')) return null;
  return (
    <Link
      to="/cart"
      className="fixed bottom-5 right-4 z-30 flex items-center gap-2 rounded-full bg-brand-green-deep px-4 py-3 text-sm font-semibold text-white shadow-raised transition-transform active:scale-95"
      style={{ bottom: 'calc(20px + env(safe-area-inset-bottom))' }}
      aria-label={`Cart, ${count} item${count === 1 ? '' : 's'}`}
    >
      <ShoppingCart size={18} strokeWidth={2} />
      {count} · {formatUgx(subtotal)}
    </Link>
  );
}
