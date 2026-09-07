import { useEffect, useState } from 'react';
import { Map } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { ShoppingRequest } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonRegion, SkeletonRequestGrid } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

const SOURCING_LABEL: Record<string, string> = {
  specific_market: 'Specific market',
  specific_shop: 'Specific shop',
  social_seller: 'Social media seller',
  shopper_choice: 'Shopper’s choice',
};

const POLL_MS = 20_000;

export function AvailableRequestsPage() {
  const { push } = useToast();
  const [requests, setRequests] = useState<ShoppingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<ShoppingRequest | null>(null);
  const [shoppingFee, setShoppingFee] = useState('5000');
  const [deliveryFee, setDeliveryFee] = useState('5000');
  const [estimatedMinutes, setEstimatedMinutes] = useState('45');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [capacity, setCapacity] = useState<{ count: number; limit: number; atCapacity: boolean } | null>(null);
  const [freshIds, setFreshIds] = useState<Set<string>>(new Set());

  function load() {
    api.get('/requests/available')
      .then((res) => {
        const incoming: ShoppingRequest[] = res.data.requests;
        setFailed(false);
        setRequests((current) => {
          const known = new Set(current.map((r) => r.id));
          if (current.length > 0) {
            const fresh = incoming.filter((r) => !known.has(r.id)).map((r) => r.id);
            if (fresh.length) setFreshIds((f) => new Set([...f, ...fresh]));
          }
          return incoming;
        });
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));

    api.get('/shoppers/dashboard')
      .then((res) => setCapacity({
        count: res.data.activeOrders?.length ?? 0,
        limit: res.data.activeJobLimit ?? 5,
        atCapacity: !!res.data.atCapacity,
      }))
      .catch(() => undefined);
  }
  useEffect(load, []);

  useEffect(() => {
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, []);

  async function handleSubmitOffer() {
    if (!selected) return;
    setSubmitting(true);
    try {
      await api.post('/offers', {
        requestId: selected.id,
        shoppingFeeUgx: Number(shoppingFee),
        deliveryFeeUgx: Number(deliveryFee),
        estimatedMinutes: Number(estimatedMinutes),
        message: message || undefined,
      });
      push('Offer sent. The customer will review it shortly.', 'success');
      setSelected(null);
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const totalFee = Number(shoppingFee || 0) + Number(deliveryFee || 0);

  return (
    <div className="mx-auto max-w-5xl pb-10">
      <PageHeader
        title="Available requests"
        subtitle={
          <>
            Requests near you, waiting for a shopper.
            {capacity && ` You're carrying ${capacity.count} of ${capacity.limit} jobs.`}
          </>
        }
      />

      {capacity?.atCapacity && (
        <p className="mb-5 rounded-lg border border-brand-yellow/40 bg-warning-soft/50 px-4 py-3 text-small text-ink">
          You already have the maximum of {capacity.limit} jobs. You can still browse, but finish or hand one back before offering on another.
        </p>
      )}

      {loading ? (
        <SkeletonRegion label="Loading open requests"><SkeletonRequestGrid count={3} /></SkeletonRegion>
      ) : failed && requests.length === 0 ? (
        <EmptyState
          title="We couldn't load requests"
          description="Check your connection and try again."
          action={<Button size="sm" onClick={() => { setLoading(true); load(); }}>Try again</Button>}
        />
      ) : requests.length === 0 ? (
        <EmptyState
          icon={<Map strokeWidth={1.5} />}
          title="No open requests right now"
          description="New requests appear here on their own. Make sure you are online so customers can pick you."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {requests.map((r) => (
            <Card key={r.id} tone={freshIds.has(r.id) ? 'brand' : 'default'} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-display text-h3 font-medium text-brand-green-deep">{r.title}</p>
                  <p className="mt-1 text-caption uppercase tracking-wide text-ink-3">{SOURCING_LABEL[r.sourcing_type] ?? r.sourcing_type}</p>
                </div>
                {freshIds.has(r.id) && (
                  <span className="shrink-0 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">New</span>
                )}
              </div>
              {r.description && <p className="mt-2 line-clamp-2 text-small text-ink-2">{r.description}</p>}
              <div className="mt-4 flex items-center justify-between border-t border-line pt-3">
                <span className="text-sm font-semibold tabular-nums text-brand-green-deep">Up to {formatUgx(r.budget_max_ugx)}</span>
                <span className="text-caption text-ink-3">
                  {new Date(r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                </span>
              </div>
              <Button size="sm" fullWidth className="mt-3" onClick={() => setSelected(r)}>
                Make an offer
              </Button>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `Offer for "${selected.title}"` : ''}
        description="The customer sees your fees, your estimate and your rating, then picks a shopper."
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shopping fee (UGX)" type="number" inputMode="numeric" value={shoppingFee} onChange={(e) => setShoppingFee(e.target.value)} />
            <Input label="Delivery fee (UGX)" type="number" inputMode="numeric" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
          </div>
          <Input label="Estimated time (minutes)" type="number" inputMode="numeric" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} />
          <Textarea
            label="Message to customer (optional)"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="I know this market well, I can get this within the hour."
          />
          <div className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm">
            <span className="text-ink-2">Your fee in total</span>
            <span className="font-semibold tabular-nums text-brand-green-deep">{formatUgx(totalFee)}</span>
          </div>
          <Button loading={submitting} onClick={handleSubmitOffer} fullWidth>
            {submitting ? 'Sending offer…' : 'Send offer'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
