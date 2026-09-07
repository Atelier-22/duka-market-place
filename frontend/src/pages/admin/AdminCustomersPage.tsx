import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users } from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { AdminTable, Td, Th, Tr, formatUgx } from './AdminDetailShell';

export function AdminCustomersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/customers').then((r) => setRows(r.data.customers)).finally(() => setLoading(false)); }, []);

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
      <PageHeader title="Customers" subtitle="Everyone who has signed up to shop. Open a customer to see their orders and requests." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="No customers yet"
          description="Customers appear here as soon as they sign up."
        />
      ) : (
        <AdminTable
          caption="Customers"
          head={
            <>
              <Th>Name</Th>
              <Th>Phone</Th>
              <Th align="right">Orders</Th>
              <Th align="right">Total spent</Th>
              <Th>Joined</Th>
            </>
          }
        >
          {rows.map((c) => (
            <Tr key={c.id} onClick={() => navigate(`/admin/customers/${c.id}`)}>
              <Td className="font-medium">{c.full_name}</Td>
              <Td muted>{c.phone}</Td>
              <Td numeric>{c.total_orders}</Td>
              <Td numeric>{formatUgx(Number(c.total_spent_ugx))}</Td>
              <Td muted className="whitespace-nowrap">{new Date(c.created_at).toLocaleDateString('en-UG')}</Td>
            </Tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
