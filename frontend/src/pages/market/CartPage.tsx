import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, Minus, Plus, ShoppingCart, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';
import { useCart } from '../../market/cart';
import { formatUgx } from '../../market/format';

export function CartPage() {
  usePageMeta({ title: 'Your cart', noindex: true });
  const { user } = useAuth();
  const navigate = useNavigate();
  const cart = useCart();

  function checkout() {
    if (!user) {
      try { sessionStorage.setItem('duka_return_to', '/checkout'); } catch { /* storage unavailable */ }
      navigate('/login');
      return;
    }
    navigate('/checkout');
  }

  return (
    <div className="mx-auto max-w-4xl px-4 pb-24 pt-4 sm:px-6 md:pb-16">
      <PageHeader title="Your cart" subtitle={cart.count ? `${cart.count} item${cart.count === 1 ? '' : 's'} from ${cart.byStore.length} store${cart.byStore.length === 1 ? '' : 's'}` : undefined} back="/marketplace" backLabel="Marketplace" />

      {cart.lines.length === 0 ? (
        <EmptyState icon={<ShoppingCart />} title="Your cart is empty" description="Find something on the marketplace and it will show up here." action={<Link to="/marketplace"><Button>Browse the marketplace</Button></Link>} />
      ) : (
        <div className="grid gap-5 md:grid-cols-[1fr_300px]">
          <div className="flex flex-col gap-4">
            {cart.byStore.map((group) => (
              <Card key={group.storeId} padding="none">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <Link to={`/store/${group.storeSlug}`} className="font-medium text-ink hover:text-brand-green">{group.storeName}</Link>
                  <span className="text-caption text-ink-3">Separate delivery</span>
                </div>
                <ul className="divide-y divide-line">
                  {group.lines.map((line) => (
                    <li key={line.key} className="flex gap-3 px-4 py-3">
                      <Link to={`/product/${line.productId}`} className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface-2">
                        {line.imageUrl && <img src={line.imageUrl} alt="" className="h-full w-full object-cover" />}
                      </Link>
                      <div className="min-w-0 flex-1">
                        <Link to={`/product/${line.productId}`} className="line-clamp-2 text-sm font-medium text-ink">{line.name}</Link>
                        {line.variationLabel && <p className="text-caption text-ink-3">{line.variationLabel}</p>}
                        <p className="mt-1 text-sm font-semibold text-brand-green-deep">{formatUgx(line.unitPriceUgx * line.quantity)}</p>
                      </div>
                      <div className="flex flex-col items-end justify-between">
                        <button type="button" onClick={() => cart.remove(line.key)} className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-brand-red" aria-label={`Remove ${line.name}`}><Trash2 size={16} /></button>
                        <div className="flex items-center rounded-lg border border-line">
                          <button type="button" onClick={() => cart.setQuantity(line.key, line.quantity - 1)} className="flex h-9 w-9 items-center justify-center" aria-label="Decrease"><Minus size={14} /></button>
                          <span className="w-8 text-center text-sm font-semibold tabular-nums">{line.quantity}</span>
                          <button type="button" onClick={() => cart.setQuantity(line.key, line.quantity + 1)} disabled={line.quantity >= line.maxQuantity} className="flex h-9 w-9 items-center justify-center disabled:opacity-40" aria-label="Increase"><Plus size={14} /></button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </Card>
            ))}
          </div>

          <div className="md:sticky md:top-20 md:self-start">
            <Card padding="lg">
              <h2 className="font-display text-h3 font-medium text-brand-green-deep">Summary</h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex justify-between"><dt className="text-ink-2">Items</dt><dd className="text-ink">{formatUgx(cart.subtotal)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-2">Delivery</dt><dd className="text-ink-3">Set by each store at checkout</dd></div>
              </dl>
              <p className="mt-3 text-caption text-ink-3">You pay the store on delivery. Nothing is charged online.</p>
              <Button size="lg" fullWidth className="mt-4 hidden md:flex" onClick={checkout}>Check out <ArrowRight size={16} /></Button>
            </Card>
          </div>
        </div>
      )}

      {cart.lines.length > 0 && (
        <div className="fixed inset-x-0 bottom-[calc(var(--duka-nav-height,0px))] z-30 border-t border-line bg-surface p-3 md:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-3">
            <div><p className="text-caption text-ink-3">Items</p><p className="font-display text-lg font-semibold text-brand-green-deep">{formatUgx(cart.subtotal)}</p></div>
            <Button size="lg" className="ml-auto flex-1" onClick={checkout}>Check out <ArrowRight size={16} /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
