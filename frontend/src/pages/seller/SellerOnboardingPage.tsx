import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Store as StoreIcon } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { useToast } from '../../components/ui/Toast';
import { useBrandTransition } from '../../components/ui/BrandTransition';
import { CategoryOptions } from '../../components/market/CategoryOptions';

const STEPS = ['Your store', 'Look and feel', 'Delivery and policies'];

export function SellerOnboardingPage({ onCreated }: { onCreated?: () => void }) {
  usePageMeta({ title: 'Set up your store', noindex: true });
  const navigate = useNavigate();
  const { push } = useToast();
  const { play } = useBrandTransition();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '', tagline: '', category: 'general', city: 'Kampala', location: '', description: '',
    logoUrl: '', coverUrl: '', contactPhone: '', whatsapp: '', contactEmail: '', deliveryFeeUgx: '5000', policies: '', fulfilment: 'delivery',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const { [key]: _drop, ...rest } = e; return rest; });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (step === 0) {
      if (form.name.trim().length < 2) next.name = 'Give your store a name.';
      if (form.city.trim().length < 2) next.city = 'Where is the store based?';
    }
    if (step === 2) {
      const fee = Number(form.deliveryFeeUgx);
      if (!Number.isInteger(fee) || fee < 0) next.deliveryFeeUgx = 'Enter a whole number of shillings, or 0.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    if (step < STEPS.length - 1) { setStep((s) => s + 1); return; }
    setSaving(true);
    try {
      await api.post('/seller/store', {
        name: form.name.trim(),
        tagline: form.tagline.trim() || null,
        category: form.category,
        city: form.city.trim(),
        location: form.location.trim() || null,
        description: form.description.trim() || null,
        logoUrl: form.logoUrl || null,
        coverUrl: form.coverUrl || null,
        contactPhone: form.contactPhone.trim() || null,
        whatsapp: form.whatsapp.trim() || null,
        contactEmail: form.contactEmail.trim() || null,
        fulfilment: form.fulfilment,
        deliveryFeeUgx: Number(form.deliveryFeeUgx),
        policies: form.policies.trim() || null,
      });
      await play({
        label: `${form.name.trim()} is open`,
        task: () => {
          onCreated?.();
          navigate('/seller/products/new', { replace: true });
        },
      });
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-10">
      <div className="mb-6">
        <p className="text-label font-semibold uppercase tracking-wide text-brand-green">Seller setup</p>
        <h1 className="mt-1 font-display text-h1 font-medium text-brand-green-deep">Open your store</h1>
        <p className="mt-1 text-body text-ink-2">Three short steps. You can change all of this later in Store settings.</p>
      </div>

      <ol className="mb-6 flex items-center gap-2" aria-label="Progress">
        {STEPS.map((label, i) => (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${i < step ? 'bg-brand-green text-white' : i === step ? 'bg-brand-green-mist text-brand-green-deep ring-2 ring-brand-green' : 'bg-surface-2 text-ink-3'}`}>
              {i < step ? <Check size={16} strokeWidth={2.5} /> : i + 1}
            </span>
            <span className={`hidden text-sm sm:block ${i === step ? 'font-medium text-ink' : 'text-ink-3'}`}>{label}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-line" />}
          </li>
        ))}
      </ol>

      <form onSubmit={submit} noValidate>
        <Card padding="lg">
          {step === 0 && (
            <div className="flex flex-col gap-4">
              <Input label="Store name" placeholder="TechHub Electronics" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} icon={<StoreIcon size={18} strokeWidth={1.8} />} autoFocus />
              <Input label="One-line tagline (optional)" placeholder="Phones, laptops and accessories in Kampala" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={160} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)} hint="What you mostly sell. Every product can have its own category.">
                  <CategoryOptions />
                </Select>
                <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} error={errors.city} />
              </div>
              <Input label="Location (optional)" placeholder="Kikuubo Lane, shop 12" value={form.location} onChange={(e) => set('location', e.target.value)} hint="Shown on your store page so buyers know where you are." />
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col gap-5">
              <div className="grid gap-4 sm:grid-cols-[160px_1fr]">
                <ImageUpload folder="stores" label="Logo" value={form.logoUrl} onChange={(url) => set('logoUrl', url)} shape="circle" />
                <ImageUpload folder="stores" label="Cover photo" value={form.coverUrl} onChange={(url) => set('coverUrl', url)} />
              </div>
              <Textarea label="About your store" placeholder="What you sell, where your stock comes from, why buyers should trust you." value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} maxLength={3000} />
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <Select label="How buyers get their goods" value={form.fulfilment} onChange={(e) => set('fulfilment', e.target.value)}>
                <option value="delivery">We deliver</option>
                <option value="pickup">Customers collect from our shop</option>
                <option value="shopper">No delivery: customers send a Duka shopper</option>
              </Select>
              {form.fulfilment === 'delivery' && <Input label="Delivery fee (UGX)" type="number" inputMode="numeric" min={0} value={form.deliveryFeeUgx} onChange={(e) => set('deliveryFeeUgx', e.target.value)} error={errors.deliveryFeeUgx} hint="Charged once per order from your store. Set 0 for free delivery." />}
              <Input label="Contact email (optional)" type="email" placeholder="shop@example.com" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} />
              <div className="grid gap-4 sm:grid-cols-2">
                <Input label="Contact phone (optional)" type="tel" placeholder="0700 000 000" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} />
                <Input label="WhatsApp (optional)" type="tel" placeholder="+256 700 000 000" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} />
              </div>
              <Textarea label="Store policies (optional)" placeholder="Returns, warranties, delivery times…" value={form.policies} onChange={(e) => set('policies', e.target.value)} rows={4} maxLength={3000} />
            </div>
          )}
        </Card>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button type="button" variant="tertiary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0 || saving}><ArrowLeft size={16} /> Back</Button>
          <Button type="submit" disabled={saving}>
            {step < STEPS.length - 1 ? <>Continue <ArrowRight size={16} /></> : saving ? 'Opening…' : <>Open my store <Check size={16} /></>}
          </Button>
        </div>
      </form>
    </div>
  );
}
