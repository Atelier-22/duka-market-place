import { useEffect, useState } from 'react';
import { Percent } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';

export function AdminFeesPage() {
  const { push } = useToast();
  const [fees, setFees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [feeType, setFeeType] = useState('platform_percentage');
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    api.get('/admin/fees').then((r) => setFees(r.data.fees)).finally(() => setLoading(false));
  }
  useEffect(load, []);

  async function handleCreate() {
    setSaving(true);
    try {
      await api.post('/admin/fees', { name, feeType, value: Number(value) });
      push('Fee added', 'success');
      setName(''); setValue('');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <SkeletonRegion label="Loading" className="mx-auto max-w-3xl pb-10">
        <SkeletonHeading />
        <div className="mt-6"><SkeletonRows count={4} /></div>
      </SkeletonRegion>
    );
  }

  return (
    <div className="mx-auto max-w-3xl pb-10">
      <PageHeader title="Platform fees" subtitle="The rules that decide what Duka adds to every order." />

      <section>
        <SectionHeader title="Current rules" />
        {fees.length === 0 ? (
          <EmptyState
            size="sm"
            icon={<Percent />}
            title="No fee rules yet"
            description="Add a rule below and it will apply to new orders."
          />
        ) : (
          <Card padding="none" hover={false}>
            <ul>
              {fees.map((f) => (
                <li key={f.id} className="flex items-center justify-between gap-4 border-b border-line px-4 py-3 text-sm last:border-0">
                  <span className="font-medium text-ink">{f.name}</span>
                  <span className="tabular-nums text-ink-2">
                    {f.fee_type === 'platform_percentage' ? `${f.value}%` : `${Number(f.value).toLocaleString()} UGX`}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <Card padding="lg" hover={false} className="mt-6">
        <h2 className="font-display text-h3 font-medium text-brand-green-deep">Add a fee rule</h2>
        <div className="mt-4 flex flex-col gap-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select label="Type" value={feeType} onChange={(e) => setFeeType(e.target.value)}>
            <option value="platform_percentage">Platform percentage</option>
            <option value="flat_delivery">Flat delivery fee</option>
            <option value="per_km_delivery">Per-km delivery fee</option>
          </Select>
          <Input
            label="Value"
            type="number"
            hint={feeType === 'platform_percentage' ? 'A percentage of the order value.' : 'An amount in UGX.'}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <div>
            <Button loading={saving} onClick={handleCreate}>Add fee</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
