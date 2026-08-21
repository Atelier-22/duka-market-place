import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, MessageCircle, Package, PartyPopper } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Order, OrderStatus } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ZoomableImage } from '../../components/ui/ZoomableImage';
import { LoadingState } from '../../components/ui/LoadingState';
import { OrderTimeline, TimelineAction } from '../../components/domain/OrderTimeline';
import { ActionNeededBanner } from '../../components/domain/ActionNeededBanner';
import { PricingBreakdown } from '../../components/domain/PricingBreakdown';
import { DeliveryTracker } from '../../components/domain/DeliveryTracker';
import { OrderShopper, ShopperSummaryCard } from '../../components/domain/ShopperSummaryCard';
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
  const [shopper, setShopper] = useState<OrderShopper | null>(null);
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
      setShopper(res.data.shopper ?? null);
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

  /**
   * Where each stage of the order lives on this page.
   *
   * "Awaiting your approval" was the stage people could not act on: they read
   * it in the timeline and then had to find the approve card themselves,
   * somewhere further down a page that also holds a map, a price breakdown and
   * a list of options. Now the step is the way there.
   */
  const chat = `/app/orders/${order.id}/messages`;
  const mine = (step: string, hint: string): Partial<Record<OrderStatus, TimelineAction>> =>
    order.status === step ? { [step]: { targetId: `step-${step}`, hint } } as any : {};

  const timelineActions: Partial<Record<OrderStatus, TimelineAction>> = {
    // The stages the shopper drives are not things the customer can act on, so
    // they lead to the two places worth looking: where the shopper is, and the
    // conversation with them.
    ...(trackable && { shopper_assigned: { targetId: 'live-tracking', hint: 'See where your shopper is' } }),
    ...(trackable && { shopping: { to: chat, hint: 'Message your shopper' } }),
    ...mine('awaiting_customer_approval', 'Approve the purchase'),
    ...mine('out_for_delivery', 'Confirm when it arrives'),
    ...mine('delivered', 'Mark the order complete'),
    ...(order.status === 'completed' && !rated && { completed: { targetId: 'step-completed', hint: 'Rate your shopper' } }),
  };

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep"><ArrowLeft size={15} strokeWidth={2} className="inline" /> Back</button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Order #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>

      {/* Ahead of the tracker and the timeline — this is the whole page's
          purpose whenever the order is waiting on the customer. */}
      <ActionNeededBanner
        status={order.status}
        perspective="customer"
        targetId={`step-${order.status}`}
      />

      <div id="live-tracking">
      <DeliveryTracker
        tracking={tracking}
        sharingLocation={sharingLocation}
        locationError={locationError}
        onPinned={refreshTracking}
      />
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <GlassCard padding="lg" hover={false}>
          <OrderTimeline status={order.status} actions={timelineActions} />
        </GlassCard>

        <div className="flex flex-col gap-4">
          {/* Who is doing this, first — before prices and options. */}
          {shopper && (
            <ShopperSummaryCard
              shopper={shopper}
              onMessage={() => navigate(`/app/orders/${order.id}/messages`)}
            />
          )}

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
            <GlassCard id="step-awaiting_customer_approval" glow="yellow" hover={false}>
              <p className="font-medium text-brand-green-deep">Approve this purchase?</p>
              <p className="mt-1 text-sm text-brand-ink/60">Your shopper found the item and is waiting for your go-ahead to buy it.</p>
              <GlassButton className="mt-3" disabled={acting} onClick={() => act('approve')} fullWidth>
                {acting ? 'Approving…' : <><CheckCircle2 size={17} strokeWidth={2} /> Approve purchase</>}
              </GlassButton>
            </GlassCard>
          )}

          {order.status === 'out_for_delivery' && (
            <GlassCard id="step-out_for_delivery" glow="green" hover={false}>
              <p className="font-medium text-brand-green-deep">Received your item?</p>
              <p className="mt-1 text-sm text-brand-ink/60">Confirm delivery once your shopper hands it over.</p>
              <GlassButton className="mt-3" disabled={acting} onClick={() => act('delivered')} fullWidth>
                {acting ? 'Confirming…' : <><Package size={17} strokeWidth={2} /> Confirm delivery</>}
              </GlassButton>
            </GlassCard>
          )}

          {order.status === 'delivered' && (
            <GlassCard id="step-delivered" glow="green" hover={false}>
              <p className="font-medium text-brand-green-deep">Order complete?</p>
              <p className="mt-1 text-sm text-brand-ink/60">Mark this order as done to release your shopper's earnings.</p>
              <GlassButton className="mt-3" disabled={acting} onClick={() => act('complete')} fullWidth>
                {acting ? 'Completing…' : <><PartyPopper size={17} strokeWidth={2} /> Mark as completed</>}
              </GlassButton>
            </GlassCard>
          )}

          {order.status === 'completed' && !rated && (
            <GlassCard id="step-completed" glow="yellow" hover={false}>
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
