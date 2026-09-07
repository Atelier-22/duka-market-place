import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bike, Camera, Check, CheckCircle2, CircleAlert, Footprints, MapPin, MessageCircle, Navigation, PartyPopper, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Order, OrderStatus } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonDetail, SkeletonRegion } from '../../components/ui/Skeleton';
import { OrderTimeline, TimelineAction } from '../../components/domain/OrderTimeline';
import { ActionNeededBanner } from '../../components/domain/ActionNeededBanner';
import { LazyLiveMap } from '../../components/domain/LazyLiveMap';
import { ShoppingDonePanel } from '../../components/domain/ShoppingDonePanel';
import { DisputeButton } from '../../components/domain/DisputeButton';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { RatingStars } from '../../components/ui/RatingStars';
import { useToast } from '../../components/ui/Toast';
import { useBroadcastPosition, useOrderTracking } from '../../hooks/useOrderTracking';

const BROADCAST_STATUSES = ['shopper_assigned', 'shopping', 'item_found', 'awaiting_customer_approval', 'purchased', 'out_for_delivery'];
const DISPUTABLE: OrderStatus[] = ['shopping', 'item_found', 'awaiting_customer_approval', 'purchased', 'out_for_delivery', 'delivered', 'completed'];

interface CustomerDelivery {
  delivery_instructions: string | null;
  delivery_handoff: 'meet' | 'gate' | 'call' | string;
  delivery_contact: 'call' | 'message' | 'either' | string;
}

const HANDOFF_LABEL: Record<string, string> = {
  meet: 'Meet them at the door',
  gate: 'Leave with the gate or reception',
  call: 'Call when you arrive; they will come out',
};
const CONTACT_LABEL: Record<string, string> = {
  call: 'Prefers a call',
  message: 'Prefers a message',
  either: 'Call or message, either is fine',
};

export function ShoppingWorkflowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
  const [delivery, setDelivery] = useState<CustomerDelivery | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const [actualPrice, setActualPrice] = useState('');
  const [itemPhotoUrl, setItemPhotoUrl] = useState('');
  const [shopName, setShopName] = useState('');
  const [receiptUrl, setReceiptUrl] = useState('');
  const [stars, setStars] = useState(5);
  const [rated, setRated] = useState(false);

  async function submitRating() {
    setActing(true);
    try {
      await api.post(`/ratings/order/${id}`, { stars });
      setRated(true);
      push('Rating saved', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  function load() {
    api.get(`/orders/${id}`).then((res) => {
      setOrder(res.data.order);
      setDelivery(res.data.delivery ?? null);
      if (res.data.myRating != null) {
        setRated(true);
        setStars(res.data.myRating);
      }
    }).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  // The customer's approval arrives without a reload.
  useEffect(() => {
    const interval = setInterval(load, 8000);
    return () => clearInterval(interval);
  }, [id]);

  const broadcasting = !!order && BROADCAST_STATUSES.includes(order.status);

  const recordedPrice = order?.item_price_ugx == null ? null : Number(order.item_price_ugx);
  const { sharing, error: locationError } = useBroadcastPosition(id, broadcasting);
  const { tracking, refresh: refreshTracking } = useOrderTracking(id, broadcasting);

  async function acceptJob() {
    setActing(true);
    try {
      const res = await api.post(`/orders/${id}/assign`);
      setOrder(res.data.order);
      push('Job accepted — the customer has been told', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  async function declineJob() {
    setActing(true);
    try {
      await api.post(`/orders/${id}/cancel`, { reason: 'Shopper declined the job' });
      push('Job declined', 'success');
      navigate('/shopper/available');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  async function goShopping() {
    setActing(true);
    try {
      const res = await api.post(`/orders/${id}/shopping`);
      setOrder(res.data.order);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  async function submitItemFound() {
    if (!actualPrice || !itemPhotoUrl) {
      push('Add a photo and the real price before continuing', 'error');
      return;
    }
    setActing(true);
    try {
      const res = await api.post(`/orders/${id}/item-found`, {
        actualPriceUgx: Number(actualPrice),
        photoUrl: itemPhotoUrl,
        shopName: shopName || undefined,
      });
      setOrder(res.data.order);
      push('Sent to the customer for approval', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  async function submitOutForDelivery() {
    if (!receiptUrl) {
      push('Upload a receipt photo first', 'error');
      return;
    }
    setActing(true);
    try {

      const res = await api.post(`/orders/${id}/out-for-delivery`, {
        receiptPhotoUrl: receiptUrl,
        amountUgx: recordedPrice ?? undefined,
      });
      setOrder(res.data.order);
      push('Marked as out for delivery', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setActing(false);
    }
  }

  if (loading) {
    return (
      <SkeletonRegion label="Loading this job">
        <SkeletonDetail withMap />
      </SkeletonRegion>
    );
  }
  if (!order) {
    return (
      <div className="mx-auto max-w-2xl pb-16">
        <EmptyState
          title="We couldn't open this job"
          description="Check your connection and try again."
          action={<GlassButton size="sm" onClick={() => { setLoading(true); load(); }}>Try again</GlassButton>}
        />
      </div>
    );
  }

  const chat = `/shopper/orders/${order.id}/messages`;
  const at = (step: string, hint: string): Partial<Record<OrderStatus, TimelineAction>> =>
    order.status === step ? { [step]: { targetId: `step-${step}`, hint } } as any : {};

  const timelineActions: Partial<Record<OrderStatus, TimelineAction>> = {

    ...(order.status !== 'requested' && { requested: { to: chat, hint: 'Message the customer' } }),
    ...at('requested', 'Accept or decline'),
    ...at('shopper_assigned', 'Say you are on your way'),
    ...at('shopping', 'Send the photo and price'),

    ...(order.status === 'awaiting_customer_approval'
      && { awaiting_customer_approval: { to: chat, hint: 'Waiting — nudge the customer' } }),
    ...at('purchased', 'Upload your receipt'),
    ...at('out_for_delivery', 'Delivery in progress'),
    ...at('delivered', 'Mark the job complete'),
    ...at('completed', 'Rate this customer'),
    ...(broadcasting && order.status !== 'shopper_assigned'
      && { shopper_assigned: { targetId: 'route-map', hint: 'See your route' } }),
  };

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep"><ArrowLeft size={15} strokeWidth={2} className="inline" /> Back</button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Job #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>

      <ActionNeededBanner
        status={order.status}
        perspective="shopper"
        targetId={`step-${order.status}`}
        rated={rated}
      />

      <GlassCard padding="lg" hover={false} className="mt-6">
        <OrderTimeline status={order.status} perspective="shopper" actions={timelineActions} />
      </GlassCard>

      {broadcasting && (
        <GlassCard id="route-map" padding="lg" hover={false} className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Your route</p>
            <span className={`flex items-center gap-1.5 text-xs font-medium ${sharing ? 'text-brand-green-fresh' : 'text-brand-red'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${sharing ? 'bg-brand-green-fresh' : 'bg-brand-red'}`} />
              {sharing ? 'Sharing location' : 'Location off'}
            </span>
          </div>
          {locationError && <p className="mt-2 text-xs font-medium text-brand-red">{locationError}</p>}
          <div className="mt-3 overflow-hidden rounded-xl2 border border-brand-green/10">

            <LazyLiveMap
              you={tracking?.shopper ? { lat: tracking.shopper.lat, lng: tracking.shopper.lng, label: 'You' } : null}
              them={tracking?.customer ? { lat: tracking.customer.lat, lng: tracking.customer.lng, label: 'Your customer' } : null}
              destination={tracking?.destination ?? null}
            />
          </div>
          {tracking?.distanceMetres !== null && tracking?.distanceMetres !== undefined && (
            <p className="mt-3 text-xs text-brand-ink/45">
              {tracking.distanceMetres < 1000
                ? `${tracking.distanceMetres} m`
                : `${(tracking.distanceMetres / 1000).toFixed(1)} km`}
              {tracking.customer ? ' from your customer' : ' from the delivery address'}
            </p>
          )}

          {tracking?.deliveryAddressLabel && (
            <p className="mt-3 flex items-center gap-2 text-xs text-brand-ink/55">
              <MapPin size={13} strokeWidth={2} className="shrink-0" />
              Deliver to <span className="font-medium text-brand-green-deep">{tracking.deliveryAddressLabel}</span>
            </p>
          )}

          {delivery && (delivery.delivery_instructions || delivery.delivery_handoff) && (
            <div className="mt-3 rounded-xl bg-brand-green-mist/60 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">At the door</p>
              <p className="mt-1 text-sm text-brand-ink/80">
                {HANDOFF_LABEL[delivery.delivery_handoff] ?? delivery.delivery_handoff}
                {' · '}
                {CONTACT_LABEL[delivery.delivery_contact] ?? delivery.delivery_contact}
              </p>
              {delivery.delivery_instructions && (
                <p className="mt-1.5 whitespace-pre-line text-sm text-brand-ink/70">{delivery.delivery_instructions}</p>
              )}
            </div>
          )}

          {!tracking?.customer && !tracking?.destination && (
            <div className="mt-3 rounded-xl bg-brand-yellow-soft/60 px-4 py-3">
              <p className="flex items-start gap-2 text-sm text-yellow-900">
                <CircleAlert size={15} strokeWidth={2} className="mt-0.5 shrink-0" />
                <span>
                  Your customer hasn't put their location on the map yet — only the
                  written address above. Ask them to open this order and tap the
                  "Pin this address" button under Live tracking.
                </span>
              </p>
              <GlassButton
                size="sm"
                variant="secondary"
                className="mt-3"
                onClick={() => navigate(`/shopper/orders/${id}/messages`)}
              >
                <MessageCircle size={15} strokeWidth={2} /> Ask for directions
              </GlassButton>
            </div>
          )}

          {(tracking?.customer || tracking?.destination) && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${
                (tracking.customer ?? tracking.destination)!.lat
              },${(tracking.customer ?? tracking.destination)!.lng}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-brand-green-deep hover:underline"
            >
              <Navigation size={14} strokeWidth={2} />
              Open directions
            </a>
          )}

          {(order.status === 'purchased' || order.status === 'out_for_delivery') && (
            <ShoppingDonePanel
              orderId={order.id}
              shoppingDoneAt={tracking?.shoppingDoneAt ?? null}
              deliveryStartedAt={tracking?.deliveryStartedAt ?? null}
              deliveryDeferredTo={tracking?.deliveryDeferredTo ?? null}
              sharingLocation={sharing}
              locationError={locationError}
              onDone={() => { refreshTracking(); load(); }}
            />
          )}
        </GlassCard>
      )}

      <div className="mt-6">
        {order.status === 'requested' && (
          <GlassCard id="step-requested" glow="yellow" hover={false}>
            <p className="font-medium text-brand-green-deep">This job is waiting for your answer</p>
            <p className="mt-1 text-sm text-brand-ink/60">
              The customer picked you. Accept to take it on, or decline so it goes back to other shoppers.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <GlassButton disabled={acting} onClick={acceptJob}>
                {acting ? 'Accepting…' : <><Check size={17} strokeWidth={2} /> Accept job</>}
              </GlassButton>
              <GlassButton variant="danger" disabled={acting} onClick={declineJob}>
                <X size={17} strokeWidth={2} /> Decline
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {order.status === 'shopper_assigned' && (
          <GlassCard id="step-shopper_assigned" glow="green" hover={false}>
            <p className="font-medium text-brand-green-deep">On your way?</p>
            <p className="mt-1 text-sm text-brand-ink/60">Let the customer know you're headed to the location.</p>
            <GlassButton className="mt-3" disabled={acting} onClick={goShopping} fullWidth>
              {acting ? 'Updating…' : <><Footprints size={17} strokeWidth={2} /> I'm searching for the item</>}
            </GlassButton>
          </GlassCard>
        )}

        {order.status === 'shopping' && (
          <GlassCard id="step-shopping" glow="yellow" hover={false}>
            <p className="font-medium text-brand-green-deep">Found the item?</p>
            <p className="mt-1 text-sm text-brand-ink/60">Upload a real photo and enter the exact price — this is what the customer will see before approving.</p>
            <div className="mt-4 flex flex-col gap-3">
              <ImageUpload folder="item-found" label="Item photo" value={itemPhotoUrl} onChange={setItemPhotoUrl} />
              <Input label="Actual price (UGX)" type="number" value={actualPrice} onChange={(e) => setActualPrice(e.target.value)} />
              <Input label="Shop / stall name (optional)" value={shopName} onChange={(e) => setShopName(e.target.value)} />
              <GlassButton disabled={acting} onClick={submitItemFound} fullWidth>
                {acting ? 'Sending…' : <><Camera size={17} strokeWidth={2} /> Send to customer for approval</>}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {order.status === 'awaiting_customer_approval' && (
          <GlassCard id="step-awaiting_customer_approval" hover={false}>
            <p className="font-medium text-brand-green-deep">Waiting for customer approval</p>
            <p className="mt-1 text-sm text-brand-ink/60">
              We've sent your photo and price ({recordedPrice !== null ? `${recordedPrice.toLocaleString('en-UG')} UGX` : 'the recorded price'}) to the customer. This page updates on its own the moment they approve, so there is no need to refresh.
            </p>
          </GlassCard>
        )}

        {order.status === 'purchased' && (
          <GlassCard id="step-purchased" glow="green" hover={false}>
            <p className="font-medium text-brand-green-deep">Approved. Pay the shop, then upload the receipt</p>
            <p className="mt-1 text-sm text-brand-ink/60">
              The customer said yes. Buy the item with your own money, then upload a photo of the receipt. The customer pays you the full amount when you hand it over.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <ImageUpload folder="receipts" label="Receipt photo" value={receiptUrl} onChange={setReceiptUrl} />
              <GlassButton disabled={acting} onClick={submitOutForDelivery} fullWidth>
                {acting ? 'Updating…' : <><Bike size={17} strokeWidth={2} /> Mark as out for delivery</>}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {order.status === 'out_for_delivery' && (
          <GlassCard id="step-out_for_delivery" hover={false}>
            <p className="font-medium text-brand-green-deep">On the way to the customer</p>
            <p className="mt-1 text-sm text-brand-ink/60">
              Collect {recordedPrice !== null ? `${(recordedPrice + Number(order.shopping_fee_ugx) + Number(order.delivery_fee_ugx) + Number(order.platform_fee_ugx)).toLocaleString('en-UG')} UGX` : 'the full amount'} from the customer at the door. They confirm on their side, and your earnings release right after.
            </p>
          </GlassCard>
        )}

        {order.status === 'delivered' && (
          <GlassCard id="step-delivered" glow="green" hover={false}>
            <p className="font-medium text-brand-green-deep">Delivered — mark this job complete</p>
            <GlassButton
              className="mt-3"
              disabled={acting}
              onClick={async () => {
                setActing(true);
                try {
                  const res = await api.post(`/orders/${id}/complete`);
                  setOrder(res.data.order);
                  push('Job completed — earnings released!', 'success');
                } catch (err) {
                  push(apiErrorMessage(err), 'error');
                } finally {
                  setActing(false);
                }
              }}
              fullWidth
            >
              {acting ? 'Completing…' : <><PartyPopper size={17} strokeWidth={2} /> Mark job as completed</>}
            </GlassButton>
          </GlassCard>
        )}

        {order.status === 'completed' && (
          <GlassCard id="step-completed" glow="yellow" hover={false}>
            <p className="flex items-center gap-2 font-medium text-brand-green-deep">
              <CheckCircle2 size={17} strokeWidth={2} /> Job complete — earnings released to your balance.
            </p>

            {rated ? (
              <p className="mt-4 text-sm text-brand-ink/55">Thanks — your rating was saved.</p>
            ) : (
              <div className="mt-4 border-t border-brand-green/10 pt-4">
                <p className="text-sm font-medium text-brand-ink">How was this customer?</p>
                <p className="mt-0.5 text-xs text-brand-ink/45">Ratings help other shoppers know what to expect.</p>
                <div className="mt-2"><RatingStars value={stars} interactive size="md" onChange={setStars} /></div>
                <GlassButton size="sm" className="mt-3" disabled={acting} onClick={submitRating}>
                  {acting ? 'Saving…' : 'Submit rating'}
                </GlassButton>
              </div>
            )}
          </GlassCard>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {!['completed', 'cancelled', 'refunded', 'disputed'].includes(order.status) && (
          <GlassButton variant="ghost" size="sm" onClick={() => navigate(`/shopper/orders/${id}/messages`)}>
            <MessageCircle size={17} strokeWidth={2} /> Message customer
          </GlassButton>
        )}
        {DISPUTABLE.includes(order.status) && (
          <DisputeButton orderId={order.id} perspective="shopper" onRaised={load} />
        )}
      </div>
    </div>
  );
}
