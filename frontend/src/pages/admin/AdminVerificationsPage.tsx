import { useEffect, useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonHeading, SkeletonRegion, SkeletonRequestCard } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { ZoomableImage } from '../../components/ui/ZoomableImage';
import { useToast } from '../../components/ui/Toast';
import { Pill } from './AdminDetailShell';

export function AdminVerificationsPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api.get('/admin/verifications/pending').then((r) => setRows(r.data.verifications)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function review(id: string, status: 'approved' | 'rejected') {
    setBusy(`${id}:${status}`);
    try {
      await api.post(`/admin/verifications/${id}/review`, { status });
      push(`Verification ${status}`, 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <SkeletonRegion label="Loading" className="pb-10">
        <SkeletonHeading />
        <div className="mt-6 grid gap-4 md:grid-cols-2"><SkeletonRequestCard /><SkeletonRequestCard /></div>
      </SkeletonRegion>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Shopper verification"
        subtitle="Documents waiting for a decision. Approving lets the shopper take jobs."
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={<BadgeCheck />}
          title="No pending verifications"
          description="You are all caught up. New shopper documents will appear here for review."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((v) => {
            const rowBusy = busy?.startsWith(`${v.id}:`) ?? false;
            return (
              <Card key={v.id} hover={false}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-green-deep">{v.full_name}</p>
                    <p className="mt-0.5 text-caption text-ink-3">{v.phone} · {v.document_type}</p>
                  </div>
                  <Pill tone="warning" dot>Pending review</Pill>
                </div>

                <ZoomableImage
                  src={v.document_url}
                  alt="Verification document"
                  caption={`${v.full_name} · ${v.document_type}`}
                  wrapperClassName="mt-4 w-full rounded-lg"
                  className="max-h-48 w-full rounded-lg object-cover"
                />

                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    loading={busy === `${v.id}:approved`}
                    disabled={rowBusy}
                    onClick={() => review(v.id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    loading={busy === `${v.id}:rejected`}
                    disabled={rowBusy}
                    onClick={() => review(v.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
