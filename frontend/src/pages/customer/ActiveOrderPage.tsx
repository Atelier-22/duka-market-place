import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, MessageCircle, Package, PartyPopper } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Order } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ZoomableImage } from '../../components/ui/ZoomableImage';
import { LoadingState } from '../../components/ui/LoadingState';
import { OrderTimeline } from '../../components/domain/OrderTimeline';
import { PricingBreakdown } from '../../components/domain/PricingBreakdown';
import { DeliveryTracker } from '../../components/domain/DeliveryTracker';
import { RatingStars } from '../../components/ui/RatingStars';
import { useToast } from '../../components/ui/Toast';
import { useBroadcastPosition, useOrderTracking } from '../../hooks/useOrderTracking';

/** Statuses during which the live map is worth showing the customer. */
const TRACKABLE_STATUSES = ['shopper_assigned', 'shopping', 'item_found', 'awaiting_customer_approval', 'purchased', 'out_for_delivery'];

export function ActiveOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [stars, setStars] = useState(5);
  const [rated, setRated] = useState(false);

  const trackable = !!order && TRACKABLE_STATUSES.includes(order.status);
  const { tracking, refresh: refreshTracking } = useOrderTracking(id, trackable);
  // The customer shares their position too, so the shopper can find them. A
  // typed address like "Mbalwa" is not somewhere you can navigate to, and no
  // address in this system carries coordinates unless someone pins them.
  const { sharing: sharingLocation, error: locationError } = useBroadcastPosition(id, trackable);

  function load() {
    api.get(`/orders/${id}`).then((res) => {
      setOrder(res.data.order);
      setItems(res.data.items);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [id]);
  // Lightweight polling for near-real-time status updates until Socket.IO
  // is wired in (see docs/ROADMAP.md Stage 3).
  useEffect(() => {
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [id]);

  async function act(action: string) {
    setActing(true);
    try {
      const res = await api.post(`/orders/${id}/${action}`);
      setOrder(res.data.order);
      push('Order updated', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  async function submitRating() {
    try {
      await api.post(`/ratings/order/${id}`, { stars });
      setRated(true);
      push('Thanks for rating your shopper!', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  if (loading) return <LoadingState />;
  if (!order) return null;

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep"><ArrowLeft size={15} strokeWidth={2} className="inline" /> Back</button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Order #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>

      <DeliveryTracker
        tracking={tracking}
        sharingLocation={sharingLocation}
        locationError={locationError}
        onPinned={refreshTracking}
      />

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <GlassCard padding="lg" hover={false}>
          <OrderTimeline status={order.status} />
        </GlassCard>

        <div className="flex flex-col gap-4">
          {order.item_price_ugx && (
            <PricingBreakdown
              itemPriceUgx={order.item_price_ugx}
              shoppingFeeUgx={order.shopping_fee_ugx}
              deliveryFeeUgx={order.delivery_fee_ugx}
              platformFeeUgx={order.platform_fee_ugx}
              totalUgx={order.total_amount_ugx ?? undefined}
            />
          )}

          {items.length > 0 && (
            <GlassCard hover={false}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Purchase options</p>
              <div className="flex flex-col gap-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-lg bg-brand-green-mist/60 p-2">
                    {/* You are being asked to approve a purchase from a 48px
                        thumbnail — it has to be openable. */}
                    {it.photo_url && (
                      <ZoomableImage
                        src={it.photo_url}
                        alt={it.name}
                        caption={`${it.name}${it.shop_name ? ` · ${it.shop_name}` : ''}`}
                        wrapperClassName="h-12 w-12 shrink-0 rounded-lg"
                        className="h-12 w-12 rounded-lg object-cover"
                      />
                    )}
                    <div className="flex-1 text-sm">
                      <p className="font-medium text-brand-ink">{it.name}</p>
                      <p className="text-brand-ink/50">{new Intl.NumberFormat('en-UG').format(it.price_ugx)} UGX · {it.shop_name}</p>
                    </div>
                    {it.is_selected && <Check size={16} strokeWidth={2.5} className="text-brand-green-fresh" />}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Customer actions */}
          {order.status === 'awaiting_customer_approval' && (
            <GlassCard glow="yellow" hover={false}>
              <p className="font-medium text-brand-green-deep">Approve this purchase?</p>
              <p className="mt-1 text-sm text-brand-ink/60">Your shopper found the item and is waiting for your go-ahead to buy it.</p>
              <GlassButton className="mt-3" disabled={acting} onClick={() => act('approve')} fullWidth>
                {acting ? 'Approving…' : <><CheckCircle2 size={17} strokeWidth={2} /> Approve purchase</>}
              </GlassButton>
            </GlassCard>
          )}

          {order.status === 'out_for_delivery' && (
            <GlassCard glow="green" hover={false}>
              <p className="font-medium text-brand-green-deep">Received your item?</p>
              <p className="mt-1 text-sm text-brand-ink/60">Confirm delivery once your shopper hands it over.</p>
              <GlassButton className="mt-3" disabled={acting} onClick={() => act('delivered')} fullWidth>
                {acting ? 'Confirming…' : <><Package size={17} strokeWidth={2} /> Confirm delivery</>}
              </GlassButton>
            </GlassCard>
          )}

          {order.status === 'delivered' && (
            <GlassCard glow="green" hover={false}>
              <p className="font-medium text-brand-green-deep">Order complete?</p>
              <p className="mt-1 text-sm text-brand-ink/60">Mark this order as done to release your shopper's earnings.</p>
              <GlassButton className="mt-3" disabled={acting} onClick={() => act('complete')} fullWidth>
                {acting ? 'Completing…' : <><PartyPopper size={17} strokeWidth={2} /> Mark as completed</>}
              </GlassButton>
            </GlassCard>
          )}

          {order.status === 'completed' && !rated && (
            <GlassCard glow="yellow" hover={false}>
              <p className="font-medium text-brand-green-deep">Rate your shopper</p>
              <div className="mt-2"><RatingStars value={stars} interactive size="md" onChange={setStars} /></div>
              <GlassButton className="mt-3" onClick={submitRating} fullWidth>Submit rating</GlassButton>
            </GlassCard>
          )}

          {!['completed', 'cancelled', 'refunded'].includes(order.status) && (
            <div className="flex gap-2">
              <GlassButton variant="ghost" size="sm" onClick={() => navigate(`/app/orders/${id}/messages`)}>
                <MessageCircle size={17} strokeWidth={2} /> Message shopper
              </GlassButton>
              <GlassButton
                variant="danger"
                size="sm"
                disabled={acting}
                onClick={() => act('cancel')}
              >
                Cancel order
              </GlassButton>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
