import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Hourglass, Truck } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { ShoppingRequest, ShopperOffer } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { PageHeader } from '../../components/ui/PageHeader';
import { Bone, BonePill, BoneText, SkeletonRegion, SkeletonRequestCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ShopperOfferCard } from '../../components/domain/ShopperOfferCard';
import { useToast } from '../../components/ui/Toast';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

const POLL_MS = 15_000;

export function RequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [request, setRequest] = useState<ShoppingRequest | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [offers, setOffers] = useState<ShopperOffer[]>([]);
  const [order, setOrder] = useState<{ id: string; status: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  function load() {
    api.get(`/requests/${id}`).then((res) => {
      setRequest(res.data.request);
      setItems(res.data.items);
      setOffers(res.data.offers);
      setOrder(res.data.order ?? null);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  const waiting = request?.status === 'open' || request?.status === 'offer_received';
  useEffect(() => {
    if (!waiting) return;
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [id, waiting]);

  async function handleAccept(offerId: string) {
    setAcceptingId(offerId);
    try {
      const res = await api.post('/offers/accept', { offerId });
      push('Offer accepted. Waiting for the shopper to confirm.', 'success');
      navigate(`/app/orders/${res.data.order.id}`);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setAcceptingId(null);
    }
  }

  async function handleCancel() {
    if (!window.confirm('Cancel this request? Shoppers will stop seeing it.')) return;
    setCancelling(true);
    try {
      const res = await api.post(`/requests/${id}/cancel`);
      setRequest(res.data.request);
      setOffers([]);
      push('Request cancelled', 'success');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <SkeletonRegion label="Loading your request" className="mx-auto max-w-3xl pb-16">
        <BoneText w="w-14" className="mb-4 h-3" />
        <Card padding="lg" hover={false}>
          <div className="flex items-start justify-between">
            <div className="min-w-0 flex-1">
              <Bone className="h-7 w-2/3" />
              <BoneText w="w-32" className="mt-2.5 h-3" />
            </div>
            <BonePill />
          </div>
          <BoneText w="w-full" className="mt-5" />
          <BoneText w="w-4/5" className="mt-2" />
          <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4">
            <div><BoneText w="w-14" className="h-3" /><BoneText w="w-28" className="mt-2" /></div>
            <div><BoneText w="w-14" className="h-3" /><BoneText w="w-28" className="mt-2" /></div>
          </div>
        </Card>
        <Bone className="mt-8 h-6 w-36" />
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <SkeletonRequestCard />
          <SkeletonRequestCard />
        </div>
      </SkeletonRegion>
    );
  }
  if (!request) return <EmptyState title="Request not found" />;

  const assigned = request.status === 'assigned';
  const cancelled = request.status === 'cancelled' || request.status === 'expired';

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <PageHeader back="/app/orders?view=requests" backLabel="Requests" title={request.title} actions={<StatusBadge status={request.status} />} />

      {assigned && order && (
        <Card glow="green" hover={false} className="mb-4">
          <p className="flex items-center gap-2 font-medium text-brand-green-deep">
            <Truck size={17} strokeWidth={2} /> Your shopper is on it
          </p>
          <p className="mt-1 text-sm text-ink-2">
            You chose a shopper for this request. Everything from here on, including approving the price and confirming delivery, happens on the order.
          </p>
          <Button className="mt-3" fullWidth onClick={() => navigate(`/app/orders/${order.id}`)}>
            Track this order <ArrowRight size={16} strokeWidth={2} />
          </Button>
        </Card>
      )}

      <Card padding="lg" hover={false}>
        <p className="text-label font-semibold uppercase text-ink-3">
          Posted {new Date(request.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long' })}
        </p>
        {request.description && <p className="mt-3 text-body text-ink-2">{request.description}</p>}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-line pt-4 text-sm">
          <div>
            <p className="text-ink-3">Budget</p>
            <p className="font-semibold text-brand-green-deep">up to {formatUgx(request.budget_max_ugx)}</p>
          </div>
          <div>
            <p className="text-ink-3">Sourcing</p>
            <p className="font-semibold text-brand-green-deep capitalize">{request.sourcing_type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="mt-4 border-t border-line pt-4">
            <p className="text-label font-semibold uppercase text-ink-3">Items</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-2">
              {items.map((it) => <li key={it.id}>• {it.quantity}× {it.name}</li>)}
            </ul>
          </div>
        )}
      </Card>

      {cancelled && (
        <Card hover={false} className="mt-6">
          <p className="text-sm text-ink-2">
            This request is {request.status}. Shoppers no longer see it. Need it after all?
          </p>
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => navigate('/app/requests/new')}>
            Post it again
          </Button>
        </Card>
      )}

      {!assigned && !cancelled && (
        <div className="mt-8">
          <h2 className="mb-3 font-display text-h3 font-medium text-brand-green-deep">
            Shopper offers {offers.length > 0 && `(${offers.length})`}
          </h2>
          {offers.length === 0 ? (
            <EmptyState
              icon={<Hourglass size={40} strokeWidth={1.25} />}
              title="Waiting for offers"
              description="Most requests get a first offer within about 15 minutes. They will appear here on their own, so there is no need to refresh."
              action={
                <Button size="sm" variant="ghost" disabled={cancelling} onClick={handleCancel}>
                  {cancelling ? 'Cancelling…' : 'Cancel this request'}
                </Button>
              }
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-ink-2">
                Pick the shopper you want. More may still come in while you decide.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                {offers.map((offer) => (
                  <ShopperOfferCard
                    key={offer.id}
                    offer={offer}
                    onAccept={waiting ? () => handleAccept(offer.id) : undefined}
                    accepting={acceptingId === offer.id}
                  />
                ))}
              </div>
              <div className="mt-4">
                <Button size="sm" variant="ghost" disabled={cancelling} onClick={handleCancel}>
                  {cancelling ? 'Cancelling…' : 'Cancel this request instead'}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
