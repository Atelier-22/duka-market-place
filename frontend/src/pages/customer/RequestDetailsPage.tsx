import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, apiErrorMessage } from '../../services/api';
import { ShoppingRequest, ShopperOffer } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ShopperOfferCard } from '../../components/domain/ShopperOfferCard';
import { useToast } from '../../components/ui/Toast';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function RequestDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [request, setRequest] = useState<ShoppingRequest | null>(null);
  const [items, setItems] = useState<any[]>([]);
  const [offers, setOffers] = useState<ShopperOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acceptingId, setAcceptingId] = useState<string | null>(null);

  function load() {
    api.get(`/requests/${id}`).then((res) => {
      setRequest(res.data.request);
      setItems(res.data.items);
      setOffers(res.data.offers);
    }).finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleAccept(offerId: string) {
    setAcceptingId(offerId);
    try {
      const res = await api.post('/offers/accept', { offerId });
      push('Shopper assigned! Tracking your order now.', 'success');
      navigate(`/app/orders/${res.data.order.id}`);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setAcceptingId(null);
    }
  }

  if (loading) return <LoadingState />;
  if (!request) return <EmptyState title="Request not found" />;

  return (
    <div className="mx-auto max-w-3xl pb-16">
      <button onClick={() => navigate(-1)} className="mb-4 text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep">← Back</button>

      <GlassCard padding="lg" hover={false}>
        <div className="flex items-start justify-between">
          <div>
            <h1 className="font-display text-2xl font-medium text-brand-green-deep">{request.title}</h1>
            <p className="mt-1 text-xs text-brand-ink/40">
              Posted {new Date(request.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <StatusBadge status={request.status} />
        </div>
        {request.description && <p className="mt-4 text-sm text-brand-ink/65">{request.description}</p>}
        <div className="mt-5 grid grid-cols-2 gap-4 border-t border-brand-green/10 pt-4 text-sm">
          <div>
            <p className="text-brand-ink/40">Budget</p>
            <p className="font-semibold text-brand-green-deep">up to {formatUgx(request.budget_max_ugx)}</p>
          </div>
          <div>
            <p className="text-brand-ink/40">Sourcing</p>
            <p className="font-semibold text-brand-green-deep capitalize">{request.sourcing_type.replace(/_/g, ' ')}</p>
          </div>
        </div>
        {items.length > 0 && (
          <div className="mt-4 border-t border-brand-green/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Items</p>
            <ul className="mt-2 flex flex-col gap-1 text-sm text-brand-ink/70">
              {items.map((it) => <li key={it.id}>• {it.quantity}× {it.name}</li>)}
            </ul>
          </div>
        )}
      </GlassCard>

      <div className="mt-8">
        <h2 className="mb-3 font-display text-lg font-medium text-brand-green-deep">
          Shopper offers {offers.length > 0 && `(${offers.length})`}
        </h2>
        {offers.length === 0 ? (
          <EmptyState
            icon="⏳"
            title="Waiting for offers"
            description="Nearby shoppers are reviewing your request. You'll see their offers here as they come in."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {offers.map((offer) => (
              <ShopperOfferCard
                key={offer.id}
                offer={offer}
                onAccept={() => handleAccept(offer.id)}
                accepting={acceptingId === offer.id}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
