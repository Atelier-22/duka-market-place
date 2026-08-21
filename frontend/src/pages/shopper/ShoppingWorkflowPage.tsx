import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bike, Camera, Check, CheckCircle2, Footprints, MessageCircle, PartyPopper, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Order } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { OrderTimeline } from '../../components/domain/OrderTimeline';
import { LazyLiveMap } from '../../components/domain/LazyLiveMap';
import { ShoppingDonePanel } from '../../components/domain/ShoppingDonePanel';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { RatingStars } from '../../components/ui/RatingStars';
import { useToast } from '../../components/ui/Toast';
import { useBroadcastPosition, useOrderTracking } from '../../hooks/useOrderTracking';

/** While in these statuses the shopper's browser publishes its position. */
const BROADCAST_STATUSES = ['shopper_assigned', 'shopping', 'item_found', 'awaiting_customer_approval', 'purchased', 'out_for_delivery'];

/**
 * This screen guides the shopper through the workflow described in the
 * product brief: accept → travel → search → found (photo + real price) →
 * awaiting approval → purchased (receipt) → out for delivery → delivered
 * (customer confirms) → completed (earnings released).
 *
 * Every button here calls a specific guarded endpoint in
 * backend/src/controllers/order.controller.ts — there is no client-side
 * status field the shopper can set arbitrarily.
 */
export function ShoppingWorkflowPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [order, setOrder] = useState<Order | null>(null);
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
    api.get(`/orders/${id}`).then((res) => setOrder(res.data.order)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

  const broadcasting = !!order && BROADCAST_STATUSES.includes(order.status);

  /**
   * The price the customer approved, read off the order rather than off form
   * state, so it survives a reload and coming back to the job later.
   */
  const recordedPrice = order?.item_price_ugx == null ? null : Number(order.item_price_ugx);
  const { sharing, error: locationError } = useBroadcastPosition(id, broadcasting);
  const { tracking, refresh: refreshTracking } = useOrderTracking(id, broadcasting);

  /**
   * A customer accepting an offer creates the order as `requested` — the
   * shopper still has to say yes. Without these two buttons the job simply
   * sat there with no way to move it forward.
   */
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
      // The amount comes from the order, not from `actualPrice`. That field
      // belongs to the earlier "item found" step, so it is empty on any reload
      // — which made this button reject a perfectly good receipt with a
      // message about the photo. The price the customer approved is on the
      // order; the server falls back to it when this is omitted.
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

  if (loading) return <LoadingState />;
  if (!order) return null;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep"><ArrowLeft size={15} strokeWidth={2} className="inline" /> Back</button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Job #{order.id.slice(0, 8)}</h1>
        <StatusBadge status={order.status} />
      </div>

      <GlassCard padding="lg" hover={false} className="mt-6">
        <OrderTimeline status={order.status} perspective="shopper" />
      </GlassCard>

      {broadcasting && (
        <GlassCard padding="lg" hover={false} className="mt-6">
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
              shopper={tracking?.shopper ? { lat: tracking.shopper.lat, lng: tracking.shopper.lng, label: 'You' } : null}
              destination={tracking?.destination ?? null}
            />
          </div>
          {tracking?.distanceMetres !== null && tracking?.distanceMetres !== undefined && (
            <p className="mt-3 text-xs text-brand-ink/45">
              {tracking.distanceMetres < 1000
                ? `${tracking.distanceMetres} m from the delivery address`
                : `${(tracking.distanceMetres / 1000).toFixed(1)} km from the delivery address`}
            </p>
          )}

          <ShoppingDonePanel
            orderId={order.id}
            shoppingDoneAt={tracking?.shoppingDoneAt ?? null}
            deliveryStartedAt={tracking?.deliveryStartedAt ?? null}
            deliveryDeferredTo={tracking?.deliveryDeferredTo ?? null}
            sharingLocation={sharing}
            locationError={locationError}
            onDone={() => { refreshTracking(); load(); }}
          />
        </GlassCard>
      )}

      <div className="mt-6">
        {order.status === 'requested' && (
          <GlassCard glow="yellow" hover={false}>
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
          <GlassCard glow="green" hover={false}>
            <p className="font-medium text-brand-green-deep">On your way?</p>
            <p className="mt-1 text-sm text-brand-ink/60">Let the customer know you're headed to the location.</p>
            <GlassButton className="mt-3" disabled={acting} onClick={goShopping} fullWidth>
              {acting ? 'Updating…' : <><Footprints size={17} strokeWidth={2} /> I'm searching for the item</>}
            </GlassButton>
          </GlassCard>
        )}

        {order.status === 'shopping' && (
          <GlassCard glow="yellow" hover={false}>
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
          <GlassCard hover={false}>
            <p className="font-medium text-brand-green-deep">Waiting for customer approval</p>
            <p className="mt-1 text-sm text-brand-ink/60">
              We've sent your photo and price ({recordedPrice !== null ? `${recordedPrice.toLocaleString('en-UG')} UGX` : 'the recorded price'}) to the customer. You'll be notified once they approve.
            </p>
          </GlassCard>
        )}

        {order.status === 'purchased' && (
          <GlassCard glow="green" hover={false}>
            <p className="font-medium text-brand-green-deep">Purchased! Upload your receipt</p>
            <p className="mt-1 text-sm text-brand-ink/60">A photo of the receipt keeps everything transparent and protects both of you.</p>
            <div className="mt-4 flex flex-col gap-3">
              <ImageUpload folder="receipts" label="Receipt photo" value={receiptUrl} onChange={setReceiptUrl} />
              <GlassButton disabled={acting} onClick={submitOutForDelivery} fullWidth>
                {acting ? 'Updating…' : <><Bike size={17} strokeWidth={2} /> Mark as out for delivery</>}
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {order.status === 'out_for_delivery' && (
          <GlassCard hover={false}>
            <p className="font-medium text-brand-green-deep">On the way to the customer</p>
            <p className="mt-1 text-sm text-brand-ink/60">The customer will confirm once they receive the item — your earnings release right after.</p>
          </GlassCard>
        )}

        {order.status === 'delivered' && (
          <GlassCard glow="green" hover={false}>
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
          <GlassCard glow="yellow" hover={false}>
            <p className="flex items-center gap-2 font-medium text-brand-green-deep">
              <CheckCircle2 size={17} strokeWidth={2} /> Job complete — earnings released to your balance.
            </p>

            {/* Rating runs both ways: the shopper rates the customer too. */}
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

      {!['completed', 'cancelled', 'refunded'].includes(order.status) && (
        <GlassButton variant="ghost" size="sm" className="mt-4" onClick={() => navigate(`/shopper/orders/${id}/messages`)}>
          <MessageCircle size={17} strokeWidth={2} /> Message customer
        </GlassButton>
      )}
    </div>
  );
}
