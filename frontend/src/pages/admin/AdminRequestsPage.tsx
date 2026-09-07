import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { AdminTable, Td, Th, Tr, formatUgx } from './AdminDetailShell';

export function AdminRequestsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/requests').then((r) => setRows(r.data.requests)).finally(() => setLoading(false)); }, []);

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
      <PageHeader title="Shopping requests" subtitle="Everything customers have asked for, and where each request stands." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No requests yet"
          description="Requests appear here as soon as a customer posts one."
        />
      ) : (
        <AdminTable
          caption="Shopping requests"
          head={
            <>
              <Th>Title</Th>
              <Th>Customer</Th>
              <Th>Status</Th>
              <Th align="right">Budget</Th>
              <Th>Posted</Th>
            </>
          }
        >
          {rows.map((r) => (
            <Tr key={r.id}>
              <Td className="font-medium">{r.title}</Td>
              <Td muted>{r.customer_name}</Td>
              <Td><StatusBadge status={r.status} /></Td>
              <Td numeric>{formatUgx(Number(r.budget_max_ugx))}</Td>
              <Td muted className="whitespace-nowrap">{new Date(r.created_at).toLocaleDateString('en-UG')}</Td>
            </Tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
