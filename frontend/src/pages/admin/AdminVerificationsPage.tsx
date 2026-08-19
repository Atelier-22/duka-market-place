import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

export function AdminVerificationsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api.get('/admin/verifications/pending').then((r) => setRows(r.data.verifications)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function review(id: string, status: 'approved' | 'rejected') {
    try {
      await api.post(`/admin/verifications/${id}/review`, { status });
      push(`Verification ${status}`, 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Shopper verification</h1>
      <div className="mt-6">
        {rows.length === 0 ? (
          <EmptyState title="No pending verifications" />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map((v) => (
              <GlassCard key={v.id} hover={false}>
                <p className="font-medium text-brand-green-deep">{v.full_name}</p>
                <p className="text-xs text-brand-ink/50">{v.phone} · {v.document_type}</p>
                <img src={v.document_url} alt="Verification document" className="mt-3 max-h-48 w-full rounded-lg object-cover" />
                <div className="mt-3 flex gap-2">
                  <GlassButton size="sm" onClick={() => review(v.id, 'approved')}>Approve</GlassButton>
                  <GlassButton size="sm" variant="danger" onClick={() => review(v.id, 'rejected')}>Reject</GlassButton>
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
