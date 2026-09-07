import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check, CheckCircle2, MessageCircle, Package, PartyPopper, Wallet } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Order, OrderStatus } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { ZoomableImage } from '../../components/ui/ZoomableImage';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonDetail, SkeletonRegion } from '../../components/ui/Skeleton';
import { OrderTimeline, TimelineAction } from '../../components/domain/OrderTimeline';
import { ActionNeededBanner } from '../../components/domain/ActionNeededBanner';
import { PricingBreakdown } from '../../components/domain/PricingBreakdown';
import { DeliveryTracker } from '../../components/domain/DeliveryTracker';
import { DisputeButton } from '../../components/domain/DisputeButton';
import { OrderShopper, ShopperSummaryCard } from '../../components/domain/ShopperSummaryCard';
import { RatingStars } from '../../components/ui/RatingStars';
import { useToast } from '../../components/ui/Toast';
import { useBroadcastPosition, useOrderTracking } from '../../hooks/useOrderTracking';

const TRACKABLE_STATUSES = ['shopper_assigned', 'shopping', 'item_found', 'awaiting_customer_approval', 'purchased', 'out_for_delivery'];

/** Mirrors ORDER_TRANSITIONS on the backend: cancelling is only allowed before the shopper has paid. */
const CANCELLABLE: OrderStatus[] = ['requested', 'shopper_assigned', 'shopping', 'item_found', 'awaiting_customer_approval'];
const DISPUTABLE: OrderStatus[] = ['shopping', 'item_found', 'awaiting_customer_approval', 'purchased', 'out_for_delivery', 'delivered', 'completed'];

interface AcceptedOffer {
  estimated_minutes: number | null;
  message: string | null;
}

function toNumber(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function ActiveOrderPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [shopper, setShopper] = useState<OrderShopper | null>(null);
  const [offer, setOffer] = useState<AcceptedOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [stars, setStars] = useState(5);
  const [rated, setRated] = useState(false);

  const trackable = !!order && TRACKABLE_STATUSES.includes(order.status);
  const { tracking, refresh: refreshTracking } = useOrderTracking(id, trackable);
  const { sharing: sharingLocation, error: locationError } = useBroadcastPosition(id, trackable);

  function load() {
    api.get(`/orders/${id}`).then((res) => {
      setOrder(res.data.order);
      setItems(res.data.items);
      setShopper(res.data.shopper ?? null);
      setOffer(res.data.offer ?? null);
      if (res.data.myRating != null) {
        setRated(true);
        setStars(res.data.myRating);
      }
    }).finally(() => setLoading(false));
  }

  useEffect(load, [id]);

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

  if (loading) {
    return (
      <SkeletonRegion label="Loading your order">
        <SkeletonDetail withMap />
      </SkeletonRegion>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-3xl pb-16">
        <EmptyState
          title="We couldn't open this order"
          description="Check your connection and try again."
          action={<GlassButton size="sm" onClick={() => { setLoading(true); load(); }}>Try again</GlassButton>}
        />
      </div>
    );
  }

  const chat = `/app/orders/${order.id}/messages`;
  const mine = (step: string, hint: string): Partial<Record<OrderStatus, TimelineAction>> =>
    order.status === step ? { [step]: { targetId: `step-${step}`, hint } } as any : {};

  const timelineActions: Partial<Record<OrderStatus, TimelineAction>> = {
    ...(trackable && { shopper_assigned: { targetId: 'live-tracking', hint: 'See where your shopper is' } }),
    ...(trackable && { shopping: { to: chat, hint: 'Message your shopper' } }),
    ...mine('awaiting_customer_approval', 'Approve the purchase'),
    ...mine('out_for_delivery', 'Confirm when it arrives'),
    ...mine('delivered', 'Mark the order complete'),
    ...(order.status === 'completed' && !rated && { completed: { targetId: 'step-completed', hint: 'Rate your shopper' } }),
  };

  const hasPrice = toNumber(order.item_price_ugx) > 0;
  const payable = toNumber(order.total_amount_ugx) ||
    toNumber(order.item_price_ugx) + toNumber(order.shopping_fee_ugx) + toNumber(order.delivery_fee_ugx) + toNumber(order.platform_fee_ugx);

  const pricing = hasPrice && (
    <PricingBreakdown
      itemPriceUgx={order.item_price_ugx}
      shoppingFeeUgx={order.shopping_fee_ugx}
      deliveryFeeUgx={order.delivery_fee_ugx}
      platformFeeUgx={order.platform_fee_ugx}
      totalUgx={order.total_amount_ugx ?? undefined}
    />
  );

  const payLine = (text: string) => (
    <p className="mt-3 flex items-start gap-2 rounded-xl bg-brand-yellow-soft/60 px-3 py-2.5 text-sm text-yellow-900">
      <Wallet size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
      <span>{text}</span>
    </p>
  );

  // The thing the customer must do, kept directly under the banner so it is
  // never buried beneath the map and the timeline on a phone.
  const actionCard = (
    <>
      {order.status === 'awaiting_customer_approval' && (
        <GlassCard id="step-awaiting_customer_approval" glow="yellow" hover={false} className="mt-4">
          <p className="font-medium text-brand-green-deep">Approve this purchase?</p>
          <p className="mt-1 text-sm text-brand-ink/60">
            Your shopper found it. Check the photo and the price, then approve so they can buy it.
          </p>
          {pricing && <div className="mt-3">{pricing}</div>}
          {payLine(`You will pay ${formatUgx(payable)} in cash or mobile money when your shopper arrives. Nothing is charged now.`)}
          <GlassButton className="mt-3" disabled={acting} onClick={() => act('approve')} fullWidth>
            {acting ? 'Approving…' : <><CheckCircle2 size={17} strokeWidth={2} /> Approve purchase</>}
          </GlassButton>
        </GlassCard>
      )}

      {order.status === 'out_for_delivery' && (
        <GlassCard id="step-out_for_delivery" glow="green" hover={false} className="mt-4">
          <p className="font-medium text-brand-green-deep">Received your item?</p>
          <p className="mt-1 text-sm text-brand-ink/60">Confirm delivery once your shopper hands it over.</p>
          {payable > 0 && payLine(`Have ${formatUgx(payable)} ready. You pay your shopper when they hand it over.`)}
          <GlassButton className="mt-3" disabled={acting} onClick={() => act('delivered')} fullWidth>
            {acting ? 'Confirming…' : <><Package size={17} strokeWidth={2} /> Confirm delivery</>}
          </GlassButton>
        </GlassCard>
      )}

      {order.status === 'delivered' && (
        <GlassCard id="step-delivered" glow="green" hover={false} className="mt-4">
          <p className="font-medium text-brand-green-deep">Order complete?</p>
          <p className="mt-1 text-sm text-brand-ink/60">Mark this order as done to release your shopper's earnings.</p>
          <GlassButton className="mt-3" disabled={acting} onClick={() => act('complete')} fullWidth>
            {acting ? 'Completing…' : <><PartyPopper size={17} strokeWidth={2} /> Mark as completed</>}
          </GlassButton>
        </GlassCard>
      )}

      {order.status === 'completed' && !rated && (
        <GlassCard id="step-completed" glow="yellow" hover={false} className="mt-4">
          <p className="font-medium text-brand-green-deep">Rate your shopper</p>
          <p className="mt-1 text-sm text-brand-ink/60">Ratings are what other customers see when they choose a shopper.</p>
          <div className="mt-2"><RatingStars value={stars} interactive size="md" onChange={setStars} /></div>
          <GlassButton className="mt-3" onClick={submitRating} fullWidth>Submit rating</GlassButton>
        </GlassCard>
      )}

      {order.status === 'completed' && rated && (
        <GlassCard hover={false} className="mt-4">
          <p className="flex items-center gap-2 text-sm text-brand-ink/70">
            <CheckCircle2 size={16} strokeWidth={2} className="text-brand-green-fresh" />
            All done. You rated this shopper {stars} star{stars === 1 ? '' : 's'}.
          </p>
        </GlassCard>
      )}
    </>
  );

  const canCancel = CANCELLABLE.includes(order.status);
  const canDispute = DISPUTABLE.includes(order.status);
  const finished = ['completed', 'cancelled', 'refunded', 'disputed'].includes(order.status);

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep">
        <ArrowLeft size={15} strokeWidth={2} className="inline" /> Back
      </button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Order #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>

      <ActionNeededBanner
        status={order.status}
        perspective="customer"
        targetId={`step-${order.status}`}
        estimateMinutes={offer?.estimated_minutes}
        rated={rated}
      />

      {actionCard}

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
          {shopper && (
            <ShopperSummaryCard
              shopper={shopper}
              onMessage={() => navigate(chat)}
            />
          )}

          {order.status !== 'awaiting_customer_approval' && pricing}

          {items.length > 0 && (
            <GlassCard hover={false}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">What your shopper found</p>
              <div className="flex flex-col gap-2">
                {items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3 rounded-lg bg-brand-green-mist/60 p-2">
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
                      <p className="text-brand-ink/50">{formatUgx(toNumber(it.price_ugx))}{it.shop_name ? ` · ${it.shop_name}` : ''}</p>
                    </div>
                    {it.is_selected && <Check size={16} strokeWidth={2.5} className="text-brand-green-fresh" />}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}

          {!finished && (
            <div className="flex flex-wrap gap-2">
              <GlassButton variant="ghost" size="sm" onClick={() => navigate(chat)}>
                <MessageCircle size={17} strokeWidth={2} /> Message shopper
              </GlassButton>
              {canCancel && (
                <GlassButton variant="danger" size="sm" disabled={acting} onClick={() => act('cancel')}>
                  Cancel order
                </GlassButton>
              )}
              {canDispute && <DisputeButton orderId={order.id} perspective="customer" onRaised={load} />}
            </div>
          )}
          {order.status === 'completed' && (
            <div className="flex flex-wrap gap-2">
              <DisputeButton orderId={order.id} perspective="customer" onRaised={load} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
