import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Scale } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { EmptyState } from '../../components/ui/EmptyState';
import { useToast } from '../../components/ui/Toast';

export function AdminDisputesPage() {
  const { push } = useToast();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  /** `${id}:${outcome}` while a decision is being saved. */
  const [busy, setBusy] = useState<string | null>(null);

  function load() {
    api.get('/disputes').then((r) => setRows(r.data.disputes)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function resolve(id: string, outcome: string, finalOrderStatus?: string) {
    const note = window.prompt('Why? Both the customer and the shopper will be shown this.');
    if (!note?.trim()) return;
    setBusy(`${id}:${outcome}`);
    try {
      await api.post(`/admin/disputes/${id}/resolve`, {
        outcome, note: note.trim(), finalOrderStatus,
      });
      push('Dispute decided — both sides have been told', 'success');
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
        <div className="mt-6"><SkeletonRows count={3} /></div>
      </SkeletonRegion>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader title="Disputes" subtitle="Complaints raised on orders, and how each one was decided." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Scale />}
          title="No disputes"
          description="All clear — nothing is waiting for a decision right now."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {rows.map((d) => {
            const rowBusy = busy?.startsWith(`${d.id}:`) ?? false;
            const open = ['open', 'under_review'].includes(d.status);
            return (
              <Card key={d.id} hover={false}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-green-deep">{d.reason}</p>
                    <p className="mt-0.5 text-caption text-ink-3">
                      <Link to={`/admin/orders/${d.order_id}`} className="font-medium text-brand-green hover:underline">
                        Order #{d.order_id.slice(0, 8)}
                      </Link>
                      {' · '}Order status: {d.order_status}
                    </p>
                  </div>
                  <StatusBadge status={d.status} />
                </div>

                <p className="mt-3 whitespace-pre-line text-small text-ink-2">{d.description}</p>

                {d.resolution_note && (
                  <div className="mt-4 rounded-lg border border-line bg-surface-2 px-4 py-3">
                    <p className="text-label font-semibold uppercase text-ink-3">Decision</p>
                    <p className="mt-1 text-small text-ink-2">{d.resolution_note}</p>
                  </div>
                )}

                {open && (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy === `${d.id}:resolved_customer`}
                      disabled={rowBusy}
                      onClick={() => resolve(d.id, 'resolved_customer', 'refunded')}
                    >
                      Side with customer (refund)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy === `${d.id}:resolved_shopper`}
                      disabled={rowBusy}
                      onClick={() => resolve(d.id, 'resolved_shopper', 'completed')}
                    >
                      Side with shopper (complete)
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      loading={busy === `${d.id}:resolved_split`}
                      disabled={rowBusy}
                      onClick={() => resolve(d.id, 'resolved_split')}
                    >
                      Settle between them
                    </Button>
                    <Button
                      size="sm"
                      variant="tertiary"
                      loading={busy === `${d.id}:closed`}
                      disabled={rowBusy}
                      onClick={() => resolve(d.id, 'closed')}
                    >
                      Close without action
                    </Button>
                    {d.status === 'open' && (
                      <Button
                        size="sm"
                        variant="tertiary"
                        loading={busy === `${d.id}:under_review`}
                        disabled={rowBusy}
                        onClick={() => resolve(d.id, 'under_review')}
                      >
                        Mark under review
                      </Button>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
