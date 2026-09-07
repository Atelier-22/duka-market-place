import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package } from 'lucide-react';
import { api } from '../../services/api';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonTable } from '../../components/ui/Skeleton';
import { AdminTable, Td, Th, Tr, formatUgx } from './AdminDetailShell';

export function AdminOrdersPage() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => { api.get('/admin/orders').then((r) => setRows(r.data.orders)).finally(() => setLoading(false)); }, []);

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
      <PageHeader title="Orders" subtitle="Every order on the platform. Open one to see its full history." />

      {rows.length === 0 ? (
        <EmptyState
          icon={<Package />}
          title="No orders yet"
          description="Orders appear here as soon as customers accept offers."
        />
      ) : (
        <AdminTable
          caption="Orders"
          head={
            <>
              <Th>Order</Th>
              <Th>Customer</Th>
              <Th>Shopper</Th>
              <Th>Status</Th>
              <Th align="right">Total</Th>
            </>
          }
        >
          {rows.map((o) => (
            <Tr key={o.id} onClick={() => navigate(`/admin/orders/${o.id}`)}>
              <Td className="font-mono text-caption text-ink-2">{o.id.slice(0, 8)}</Td>
              <Td className="font-medium">{o.customer_name}</Td>
              <Td muted>{o.shopper_name}</Td>
              <Td><StatusBadge status={o.status} /></Td>
              <Td numeric>{o.total_amount_ugx ? formatUgx(o.total_amount_ugx) : '—'}</Td>
            </Tr>
          ))}
        </AdminTable>
      )}
    </div>
  );
}
