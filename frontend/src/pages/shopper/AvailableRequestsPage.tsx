import { useEffect, useState } from 'react';
import { Map } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { ShoppingRequest } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Modal } from '../../components/ui/Modal';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function AvailableRequestsPage() {
  const { push } = useToast();
  const [requests, setRequests] = useState<ShoppingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<ShoppingRequest | null>(null);
  const [shoppingFee, setShoppingFee] = useState('5000');
  const [deliveryFee, setDeliveryFee] = useState('5000');
  const [estimatedMinutes, setEstimatedMinutes] = useState('45');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [capacity, setCapacity] = useState<{ count: number; limit: number; atCapacity: boolean } | null>(null);

  function load() {
    api.get('/requests/available').then((res) => setRequests(res.data.requests)).finally(() => setLoading(false));
    // Reuses the dashboard payload rather than adding an endpoint just to
    // answer "how many jobs am I already carrying".
    api.get('/shoppers/dashboard')
      .then((res) => setCapacity({
        count: res.data.activeOrders?.length ?? 0,
        limit: res.data.activeJobLimit ?? 5,
        atCapacity: !!res.data.atCapacity,
      }))
      .catch(() => undefined);
  }
  useEffect(load, []);

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
      push('Offer sent! The customer will review it shortly.', 'success');
      setSelected(null);
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Available requests</h1>
      <p className="mt-1 text-sm text-brand-ink/50">
        Requests near you, waiting for a shopper.
        {capacity && ` You're carrying ${capacity.count} of ${capacity.limit} jobs.`}
      </p>

      {/* Say so here rather than letting them write an offer that will be
          refused when the customer tries to accept it. */}
      {capacity?.atCapacity && (
        <p className="mt-4 rounded-xl bg-brand-yellow-soft/60 px-4 py-3 text-sm text-yellow-800">
          You already have the maximum of {capacity.limit} jobs. You can still browse, but finish
          or hand one back before offering on another.
        </p>
      )}

      <div className="mt-6">
        {loading ? (
          <LoadingState />
        ) : requests.length === 0 ? (
          <EmptyState icon={<Map size={40} strokeWidth={1.25} />} title="No open requests right now" description="Check back soon, or make sure you're online." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((r) => (
              <GlassCard key={r.id}>
                <p className="font-display text-lg font-medium text-brand-green-deep">{r.title}</p>
                <p className="mt-1 text-xs uppercase tracking-wide text-brand-ink/40 capitalize">
                  {r.sourcing_type.replace(/_/g, ' ')}
                </p>
                {r.description && <p className="mt-2 line-clamp-2 text-sm text-brand-ink/60">{r.description}</p>}
                <div className="mt-4 flex items-center justify-between border-t border-brand-green/10 pt-3">
                  <span className="text-sm font-semibold text-brand-green-deep">up to {formatUgx(r.budget_max_ugx)}</span>
                  <span className="text-xs text-brand-ink/40">
                    {new Date(r.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <GlassButton size="sm" fullWidth className="mt-3" onClick={() => setSelected(r)}>
                  Make an offer
                </GlassButton>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <Modal open={!!selected} onClose={() => setSelected(null)} title={selected ? `Offer for "${selected.title}"` : ''}>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Input label="Shopping fee (UGX)" type="number" value={shoppingFee} onChange={(e) => setShoppingFee(e.target.value)} />
            <Input label="Delivery fee (UGX)" type="number" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} />
          </div>
          <Input label="Estimated time (minutes)" type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} />
          <Textarea label="Message to customer (optional)" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="I know this market well, I can get this within the hour." />
          <GlassButton disabled={submitting} onClick={handleSubmitOffer} fullWidth>
            {submitting ? 'Sending offer…' : 'Send offer'}
          </GlassButton>
        </div>
      </Modal>
    </div>
  );
}
