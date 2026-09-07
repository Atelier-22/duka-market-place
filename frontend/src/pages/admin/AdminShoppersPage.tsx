import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { AdminTable, Td, Th, Tr } from './AdminDetailShell';

export function AdminShoppersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/shoppers').then((r) => setRows(r.data.shoppers)).finally(() => setLoading(false)); }, []);

  if (loading) {
    return (
      <SkeletonRegion label="Loading" className="pb-10">
        <SkeletonHeading />
        <div className="mt-6"><SkeletonTable rows={7} cols={5} /></div>
      </SkeletonRegion>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader title="Shoppers" subtitle="Everyone who shops for customers. Open a shopper to see their documents, jobs and earnings." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag />}
          title="No shoppers yet"
          description="Shoppers appear here as soon as they sign up."
        />
      ) : (
        <AdminTable
          caption="Shoppers"
          head={
            <>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th>Verification</Th>
              <Th align="right">Rating</Th>
              <Th align="right">Jobs</Th>
            </>
          }
        >
          {rows.map((s) => (
            <Tr key={s.id} onClick={() => navigate(`/admin/shoppers/${s.id}`)}>
              <Td className="font-medium">{s.full_name}</Td>
              <Td muted>{s.phone}</Td>
              <Td><StatusBadge status={s.verification_status} /></Td>
              <Td numeric>
                {s.rating_avg || '—'} <span className="text-brand-yellow" aria-hidden>★</span>
              </Td>
              <Td numeric>{s.completed_jobs}</Td>
            </Tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
