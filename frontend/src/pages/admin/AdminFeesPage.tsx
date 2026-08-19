import { useEffect, useState } from 'react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { LoadingState } from '../../components/ui/LoadingState';
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

  if (loading) return <LoadingState />;

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Platform fees</h1>

      <GlassCard hover={false} className="mt-6">
        <div className="flex flex-col gap-3">
          {fees.map((f) => (
            <div key={f.id} className="flex items-center justify-between rounded-lg bg-brand-green-mist/60 p-3 text-sm">
              <span className="font-medium">{f.name}</span>
              <span className="text-brand-ink/60">{f.fee_type === 'platform_percentage' ? `${f.value}%` : `${Number(f.value).toLocaleString()} UGX`}</span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard padding="lg" hover={false} className="mt-6">
        <p className="font-medium text-brand-green-deep">Add a fee rule</p>
        <div className="mt-4 flex flex-col gap-3">
          <Input label="Name" value={name} onChange={(e) => setName(e.target.value)} />
          <Select label="Type" value={feeType} onChange={(e) => setFeeType(e.target.value)}>
            <option value="platform_percentage">Platform percentage</option>
            <option value="flat_delivery">Flat delivery fee</option>
            <option value="per_km_delivery">Per-km delivery fee</option>
          </Select>
          <Input label="Value" type="number" value={value} onChange={(e) => setValue(e.target.value)} />
          <GlassButton disabled={saving} onClick={handleCreate}>{saving ? 'Saving…' : 'Add fee'}</GlassButton>
        </div>
      </GlassCard>
    </div>
  );
}
