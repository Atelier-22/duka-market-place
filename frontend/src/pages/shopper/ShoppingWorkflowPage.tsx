import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Bike, Camera, CheckCircle2, Footprints, MessageCircle, PartyPopper } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Order } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { OrderTimeline } from '../../components/domain/OrderTimeline';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { useToast } from '../../components/ui/Toast';

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

  function load() {
    api.get(`/orders/${id}`).then((res) => setOrder(res.data.order)).finally(() => setLoading(false));
  }
  useEffect(load, [id]);

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
    if (!receiptUrl || !actualPrice) {
      push('Upload a receipt photo first', 'error');
      return;
    }
    setActing(true);
    try {
      const res = await api.post(`/orders/${id}/out-for-delivery`, {
        receiptPhotoUrl: receiptUrl,
        amountUgx: Number(actualPrice),
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

      <div className="mt-6">
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
              We've sent your photo and price ({actualPrice ? `${Number(actualPrice).toLocaleString()} UGX` : 'recorded price'}) to the customer. You'll be notified once they approve.
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
            <p className="flex items-center gap-2 font-medium text-brand-green-deep"><CheckCircle2 size={17} strokeWidth={2} /> Job complete — earnings released to your balance.</p>
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
