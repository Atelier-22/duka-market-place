import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { ShoppingRequest } from '../../types';
import { RequestCard } from '../../components/domain/RequestCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { GlassButton } from '../../components/ui/GlassButton';

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Pending' },
  { key: 'assigned', label: 'Active' },
  { key: 'cancelled', label: 'Cancelled' },
];

export function MyRequestsPage() {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<ShoppingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('all');

  useEffect(() => {
    api.get('/requests/mine').then((res) => setRequests(res.data.requests)).finally(() => setLoading(false));
  }, []);

  const filtered = tab === 'all' ? requests : requests.filter((r) => r.status === tab);

  return (
    <div className="pb-10">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">My requests</h1>
        <GlassButton size="sm" onClick={() => navigate('/app/requests/new')}>➕ New request</GlassButton>
      </div>

      <div className="mt-4 flex gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={[
              'rounded-full px-4 py-1.5 text-sm font-medium transition-colors',
              tab === t.key ? 'bg-brand-green text-white' : 'glass text-brand-ink/60',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {loading ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState title="No requests here" description="Try a different tab, or create a new request." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <RequestCard key={r.id} request={r} onClick={() => navigate(`/app/requests/${r.id}`)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
