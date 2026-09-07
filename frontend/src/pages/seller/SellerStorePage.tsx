import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BadgeCheck, ExternalLink, Eye, EyeOff, Save } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { SellerOnboardingPage } from './SellerOnboardingPage';
import { STORE_CATEGORIES, SellerProfile, SellerStore } from '../../market/types';
import { categoryLabel } from '../../market/format';

export function SellerStorePage() {
  usePageMeta({ title: 'Store settings', noindex: true });
  const { push } = useToast();
  const [store, setStore] = useState<SellerStore | null | undefined>(undefined);
  const [profile, setProfile] = useState<SellerProfile | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  function load() {
    api.get('/seller/me').then((r) => {
      setStore(r.data.store);
      setProfile(r.data.profile);
      const s = r.data.store;
      if (s) setForm({ name: s.name, slug: s.slug, tagline: s.tagline ?? '', description: s.description ?? '', category: s.category, city: s.city, location: s.location ?? '', contactPhone: s.contact_phone ?? '', contactEmail: s.contact_email ?? '', whatsapp: s.whatsapp ?? '', logoUrl: s.logo_url ?? '', coverUrl: s.cover_url ?? '', policies: s.policies ?? '', deliveryFeeUgx: String(s.delivery_fee_ugx) });
    }).catch(() => setStore(null));
  }
  useEffect(load, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await api.patch('/seller/store', {
        name: form.name.trim(), slug: form.slug.trim() || undefined, tagline: form.tagline.trim() || null, description: form.description.trim() || null,
        category: form.category, city: form.city.trim(), location: form.location.trim() || null, contactPhone: form.contactPhone.trim() || null,
        contactEmail: form.contactEmail.trim() || null, whatsapp: form.whatsapp.trim() || null, logoUrl: form.logoUrl || null, coverUrl: form.coverUrl || null,
        policies: form.policies.trim() || null, deliveryFeeUgx: Number(form.deliveryFeeUgx),
      });
      setStore(res.data.store);
      setForm((f) => ({ ...f, slug: res.data.store.slug }));
      push('Store saved', 'success');
    } catch (err) { push(apiErrorMessage(err), 'error'); } finally { setSaving(false); }
  }

  async function toggleVisibility() {
    if (!store) return;
    try {
      const res = await api.patch('/seller/store', { status: store.status === 'active' ? 'hidden' : 'active' });
      setStore(res.data.store);
      push(res.data.store.status === 'active' ? 'Your store is visible again' : 'Your store is hidden from the marketplace', 'success');
    } catch (err) { push(apiErrorMessage(err), 'error'); }
  }

  if (store === undefined) return <SkeletonRegion label="Loading store" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={4} /></div></SkeletonRegion>;
  if (store === null) return <SellerOnboardingPage onCreated={load} />;

  return (
    <div className="mx-auto max-w-4xl pb-28 md:pb-10">
      <PageHeader
        title="Store"
        subtitle={<span className="flex flex-wrap items-center gap-2">{profile?.verification_status === 'verified' ? <span className="flex items-center gap-1 text-brand-green"><BadgeCheck size={15} /> Verified</span> : <Link to="/seller/settings/verification" className="text-brand-green underline">Get verified</Link>}<span>· dukashoppers.com/store/{store.slug}</span></span>}
        actions={<div className="flex gap-2"><Link to={`/store/${store.slug}`} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><ExternalLink size={15} /> View</Button></Link><Button size="sm" variant={store.status === 'active' ? 'secondary' : 'primary'} onClick={toggleVisibility}>{store.status === 'active' ? <><EyeOff size={15} /> Hide store</> : <><Eye size={15} /> Show store</>}</Button></div>}
      />
      {store.status === 'hidden' && <Card tone="warning" padding="md" className="mb-4"><p className="text-sm text-brand-green-deep">Your store is hidden. Products stay saved but nobody can see them until you show the store again.</p></Card>}
      {store.status === 'suspended' && <Card tone="danger" padding="md" className="mb-4"><p className="text-sm text-brand-red">Your store is suspended by Duka{profile?.suspended_reason ? `: ${profile.suspended_reason}` : ''}.</p></Card>}

      <form onSubmit={save} noValidate className="flex flex-col gap-4">
        <Card padding="lg">
          <h2 className="font-display text-h3 font-medium text-brand-green-deep">Identity</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-[140px_1fr]">
            <ImageUpload folder="stores" label="Logo" value={form.logoUrl} onChange={(url) => set('logoUrl', url)} shape="circle" />
            <ImageUpload folder="stores" label="Cover photo" value={form.coverUrl} onChange={(url) => set('coverUrl', url)} />
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="Store name" value={form.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />
            <Input label="Store address" value={form.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} hint="dukashoppers.com/store/…" maxLength={60} />
            <Input label="Tagline" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} maxLength={160} />
            <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>{STORE_CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}</Select>
          </div>
          <Textarea className="mt-4" label="About" value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} maxLength={3000} />
        </Card>
        <Card padding="lg">
          <h2 className="font-display text-h3 font-medium text-brand-green-deep">Location and contact</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Input label="City" value={form.city} onChange={(e) => set('city', e.target.value)} maxLength={80} />
            <Input label="Location" value={form.location} onChange={(e) => set('location', e.target.value)} maxLength={200} />
            <Input label="Contact phone" type="tel" value={form.contactPhone} onChange={(e) => set('contactPhone', e.target.value)} maxLength={30} />
            <Input label="WhatsApp" type="tel" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} maxLength={30} />
            <Input label="Contact email" type="email" value={form.contactEmail} onChange={(e) => set('contactEmail', e.target.value)} maxLength={255} />
            <Input label="Delivery fee (UGX)" type="number" inputMode="numeric" min={0} value={form.deliveryFeeUgx} onChange={(e) => set('deliveryFeeUgx', e.target.value)} />
          </div>
        </Card>
        <Card padding="lg">
          <h2 className="font-display text-h3 font-medium text-brand-green-deep">Policies</h2>
          <Textarea className="mt-3" label="Returns, warranty, delivery times" value={form.policies} onChange={(e) => set('policies', e.target.value)} rows={5} maxLength={3000} />
        </Card>
        <div className="hidden justify-end md:flex"><Button type="submit" disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save store'}</Button></div>
        <div className="fixed inset-x-0 bottom-[calc(var(--duka-nav-height,0px))] z-30 border-t border-line bg-surface p-3 md:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}><Button type="submit" fullWidth disabled={saving}><Save size={16} /> {saving ? 'Saving…' : 'Save store'}</Button></div>
      </form>
    </div>
  );
}
