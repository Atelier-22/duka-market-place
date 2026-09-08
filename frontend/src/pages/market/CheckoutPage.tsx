import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CheckCircle2, MapPin, Plus, Store as StoreIcon } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';
import { useCart } from '../../market/cart';
import { formatUgx } from '../../market/format';

interface Address { id: string; label: string; line1: string; city: string; landmark: string | null; is_default: boolean }

export function CheckoutPage() {
  usePageMeta({ title: 'Checkout', noindex: true });
  const { user } = useAuth();
  const navigate = useNavigate();
  const { push } = useToast();
  const cart = useCart();
  const [addresses, setAddresses] = useState<Address[] | null>(null);
  const [addressId, setAddressId] = useState('');
  const [adding, setAdding] = useState(false);
  const [newLine1, setNewLine1] = useState('');
  const [newLandmark, setNewLandmark] = useState('');
  const [notes, setNotes] = useState('');
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState<{ id: string; order_number: number; total_ugx: number }[] | null>(null);

  const needsAddress = cart.byStore.some((g) => g.fulfilment === 'delivery');

  useEffect(() => {
    if (!user) { navigate('/login', { replace: true }); return; }
    if (user.role === 'seller') { navigate('/cart', { replace: true }); return; }
    api.get('/addresses').then((r) => {
      const rows: Address[] = r.data.addresses;
      setAddresses(rows);
      const def = rows.find((a) => a.is_default) ?? rows[0];
      if (def) setAddressId(def.id);
      else setAdding(true);
    }).catch(() => setAddresses([]));
  }, [user, navigate]);

  const deliveryTotal = cart.byStore.reduce((s, g) => s + (g.fulfilment === 'delivery' ? g.deliveryFeeUgx : 0), 0);
  const total = cart.subtotal + deliveryTotal;

  async function saveAddress(e: FormEvent) {
    e.preventDefault();
    if (newLine1.trim().length < 3) { push('Enter the delivery address', 'error'); return; }
    try {
      const res = await api.post('/addresses', { line1: newLine1.trim(), landmark: newLandmark.trim() || undefined, isDefault: (addresses?.length ?? 0) === 0 });
      const created: Address = res.data.address;
      setAddresses((a) => [created, ...(a ?? [])]);
      setAddressId(created.id);
      setAdding(false);
      setNewLine1('');
      setNewLandmark('');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  async function placeOrder() {
    if (needsAddress && !addressId) { push('Choose where to deliver', 'error'); return; }
    setPlacing(true);
    try {
      const res = await api.post('/marketplace/orders', {
        items: cart.lines.map((l) => ({ productId: l.productId, variationId: l.variationId, quantity: l.quantity })),
        addressId: needsAddress ? addressId : null,
        notes: notes.trim() || undefined,
      });
      setPlaced(res.data.orders);
      cart.clear();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setPlacing(false);
    }
  }

  if (placed) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <div className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-green-mist text-brand-green"><CheckCircle2 size={34} strokeWidth={1.8} /></span>
          <h1 className="mt-4 font-display text-h1 font-medium text-brand-green-deep">Order placed</h1>
          <p className="mt-2 text-body text-ink-2">{placed.length === 1 ? 'The store will confirm shortly.' : `${placed.length} stores will each confirm separately.`}</p>
        </div>
        <div className="mt-6 flex flex-col gap-3">
          {placed.map((o) => (
            <Link key={o.id} to={`/app/purchases/${o.id}`} className="block">
              <Card padding="md" hover>
                <div className="flex items-center justify-between gap-3">
                  <div><p className="font-medium text-ink">Order #{o.order_number}</p><p className="text-caption text-ink-3">Pay {formatUgx(o.total_ugx)} when you receive it</p></div>
                  <span className="text-sm font-medium text-brand-green">Track</span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Link to="/app/purchases" className="flex-1"><Button fullWidth>My purchases</Button></Link>
          <Link to="/marketplace" className="flex-1"><Button variant="secondary" fullWidth>Keep shopping</Button></Link>
        </div>
      </div>
    );
  }

  if (cart.lines.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12">
        <EmptyState title="Nothing to check out" description="Your cart is empty." action={<Link to="/marketplace"><Button>Browse the marketplace</Button></Link>} />
      </div>
    );
  }

  const canPlace = !placing && (!needsAddress || !!addressId);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-4 sm:px-6 with-action-bar md:pb-16">
      <PageHeader title="Checkout" back="/cart" backLabel="Cart" />
      <div className="grid gap-5 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          {needsAddress ? (
            <Card padding="lg">
              <h2 className="flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep"><MapPin size={18} /> Deliver to</h2>
              {addresses === null ? (
                <p className="mt-2 text-sm text-ink-3">Loading your addresses…</p>
              ) : (
                <div className="mt-3 flex flex-col gap-2">
                  {addresses.map((a) => (
                    <label key={a.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 ${addressId === a.id ? 'border-brand-green bg-brand-green-mist' : 'border-line'}`}>
                      <input type="radio" name="address" checked={addressId === a.id} onChange={() => setAddressId(a.id)} className="mt-1 accent-brand-green" />
                      <span><span className="block text-sm font-medium text-ink">{a.label || 'Address'}</span><span className="block text-sm text-ink-2">{a.line1}{a.landmark ? `, ${a.landmark}` : ''}, {a.city}</span></span>
                    </label>
                  ))}
                  {adding ? (
                    <form onSubmit={saveAddress} className="mt-2 flex flex-col gap-3 rounded-xl border border-dashed border-line p-3">
                      <Input label="Address" placeholder="Street, building, area" value={newLine1} onChange={(e) => setNewLine1(e.target.value)} />
                      <Input label="Landmark (optional)" placeholder="Near…" value={newLandmark} onChange={(e) => setNewLandmark(e.target.value)} />
                      <div className="flex gap-2">
                        <Button type="submit" size="sm">Save address</Button>
                        {addresses.length > 0 && <Button type="button" size="sm" variant="tertiary" onClick={() => setAdding(false)}>Cancel</Button>}
                      </div>
                    </form>
                  ) : (
                    <button type="button" onClick={() => setAdding(true)} className="flex min-h-[44px] items-center gap-2 text-sm font-medium text-brand-green"><Plus size={16} /> Add a new address</button>
                  )}
                </div>
              )}
            </Card>
          ) : (
            <Card padding="lg">
              <h2 className="flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep"><StoreIcon size={18} /> Collect in person</h2>
              <p className="mt-2 text-sm text-ink-2">Nothing in this order is delivered. You collect from each store and pay there.</p>
            </Card>
          )}

          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Items</h2>
            {cart.byStore.map((g) => (
              <div key={g.storeId} className="mt-3 border-t border-line pt-3 first:mt-2">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="font-medium text-ink">{g.storeName}</span>
                  <span className="text-right text-ink-3">{g.fulfilment === 'delivery' ? `Delivery ${formatUgx(g.deliveryFeeUgx)}` : g.fulfilment === 'pickup' ? `Collect from ${g.storeLocation || 'the store'}` : 'No delivery: collect, or send a shopper'}</span>
                </div>
                <ul className="mt-2 flex flex-col gap-1.5 text-sm text-ink-2">
                  {g.lines.map((l) => (
                    <li key={l.key} className="flex justify-between gap-3"><span className="min-w-0 truncate">{l.quantity} × {l.name}{l.variationLabel ? ` (${l.variationLabel})` : ''}</span><span className="shrink-0 tabular-nums">{formatUgx(l.unitPriceUgx * l.quantity)}</span></li>
                  ))}
                </ul>
              </div>
            ))}
          </Card>

          <Card padding="lg">
            <Textarea label="Note for the store (optional)" placeholder="Gate colour, best time, when you will collect…" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={3} />
          </Card>
        </div>

        <div className="md:sticky md:top-20 md:self-start">
          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">{needsAddress ? 'To pay on delivery' : 'To pay at the store'}</h2>
            <dl className="mt-3 flex flex-col gap-2 text-sm">
              <div className="flex justify-between"><dt className="text-ink-2">Items</dt><dd>{formatUgx(cart.subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-ink-2">Delivery</dt><dd>{deliveryTotal ? formatUgx(deliveryTotal) : 'None'}</dd></div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-semibold text-brand-green-deep"><dt>Total</dt><dd>{formatUgx(total)}</dd></div>
            </dl>
            <p className="mt-3 text-caption text-ink-3">Nothing is charged online. The store confirms first, and you can cancel until they do.</p>
            <Button size="lg" fullWidth className="mt-4 hidden md:flex" onClick={placeOrder} disabled={!canPlace}>{placing ? 'Placing…' : 'Place order'}</Button>
          </Card>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-[var(--duka-nav-height,0px)] z-30 border-t border-line bg-surface p-3 md:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
        <div className="flex items-center gap-3">
          <div><p className="text-caption text-ink-3">{needsAddress ? 'Pay on delivery' : 'Pay at the store'}</p><p className="font-display text-lg font-semibold text-brand-green-deep">{formatUgx(total)}</p></div>
          <Button size="lg" className="ml-auto flex-1" onClick={placeOrder} disabled={!canPlace}>{placing ? 'Placing…' : 'Place order'}</Button>
        </div>
      </div>
    </div>
  );
}
