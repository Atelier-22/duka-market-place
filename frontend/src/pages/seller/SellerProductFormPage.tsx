import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, Plus, Save, Trash2, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { usePageMeta } from '../../hooks/usePageMeta';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import { ImageUpload } from '../../components/ui/ImageUpload';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { STORE_CATEGORIES } from '../../market/types';
import { categoryLabel, formatUgx } from '../../market/format';

interface Variation { name: string; value: string; priceDeltaUgx: string; stockQuantity: string; sku: string }
interface Spec { label: string; value: string }

const EMPTY = {
  name: '', description: '', category: 'general', subcategory: '', brand: '', model: '', condition: 'new',
  priceUgx: '', salePriceUgx: '', sku: '', stockQuantity: '0', lowStockThreshold: '5', deliveryInfo: '', isFeatured: false,
};

export function SellerProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  usePageMeta({ title: editing ? 'Edit product' : 'Add product', noindex: true });
  const navigate = useNavigate();
  const { push } = useToast();
  const [form, setForm] = useState({ ...EMPTY });
  const [images, setImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [variations, setVariations] = useState<Variation[]>([]);
  const [variationName, setVariationName] = useState('Colour');
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [flagged, setFlagged] = useState<string | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    api.get(`/seller/products/${id}`).then((r) => {
      const p = r.data.product;
      setForm({
        name: p.name, description: p.description ?? '', category: p.category, subcategory: p.subcategory ?? '', brand: p.brand ?? '',
        model: p.model ?? '', condition: p.condition, priceUgx: String(p.price_ugx), salePriceUgx: p.sale_price_ugx ? String(p.sale_price_ugx) : '',
        sku: p.sku ?? '', stockQuantity: String(p.stock_quantity), lowStockThreshold: String(p.low_stock_threshold), deliveryInfo: p.delivery_info ?? '', isFeatured: !!p.is_featured,
      });
      setImages(r.data.images.map((i: { url: string }) => i.url));
      setSpecs(p.specifications ?? []);
      const vars = r.data.variations as { name: string; value: string; price_delta_ugx: number; stock_quantity: number; sku: string | null }[];
      setVariations(vars.map((v) => ({ name: v.name, value: v.value, priceDeltaUgx: String(v.price_delta_ugx), stockQuantity: String(v.stock_quantity), sku: v.sku ?? '' })));
      if (vars[0]) setVariationName(vars[0].name);
      setStatus(p.status);
      setFlagged(p.flagged_reason);
    }).catch(() => push('Could not load this product', 'error')).finally(() => setLoading(false));
  }, [id, push]);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => { const { [key]: _drop, ...rest } = e; return rest; });
  }

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (form.name.trim().length < 2) next.name = 'Give the product a name.';
    const price = Number(form.priceUgx);
    if (!Number.isInteger(price) || price < 100) next.priceUgx = 'Enter the price in whole shillings (at least 100).';
    if (form.salePriceUgx) {
      const sale = Number(form.salePriceUgx);
      if (!Number.isInteger(sale) || sale < 100) next.salePriceUgx = 'Enter a whole number.';
      else if (sale >= price) next.salePriceUgx = 'The sale price must be lower than the regular price.';
    }
    if (variations.length === 0 && (!Number.isInteger(Number(form.stockQuantity)) || Number(form.stockQuantity) < 0)) next.stockQuantity = 'Stock cannot be negative.';
    if (!Number.isInteger(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) next.lowStockThreshold = 'Enter 0 or more.';
    for (const v of variations) {
      if (!v.value.trim()) next.variations = 'Every option needs a value, for example Black or Large.';
      if (!Number.isInteger(Number(v.stockQuantity)) || Number(v.stockQuantity) < 0) next.variations = 'Option stock cannot be negative.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function payload() {
    return {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      subcategory: form.subcategory.trim() || null,
      brand: form.brand.trim() || null,
      model: form.model.trim() || null,
      condition: form.condition,
      priceUgx: Number(form.priceUgx),
      salePriceUgx: form.salePriceUgx ? Number(form.salePriceUgx) : null,
      sku: form.sku.trim() || null,
      stockQuantity: Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold),
      specifications: specs.filter((s) => s.label.trim() && s.value.trim()),
      deliveryInfo: form.deliveryInfo.trim() || null,
      isFeatured: form.isFeatured,
      images,
      variations: variations.map((v) => ({ name: variationName.trim() || 'Option', value: v.value.trim(), priceDeltaUgx: Number(v.priceDeltaUgx || 0), stockQuantity: Number(v.stockQuantity || 0), sku: v.sku.trim() || null })),
    };
  }

  async function save(e: FormEvent, publishAfter = false) {
    e.preventDefault();
    if (!validate()) { push('Check the highlighted fields', 'error'); return; }
    if (publishAfter && images.length === 0) { push('Add at least one photo before publishing', 'error'); return; }
    if (publishAfter && form.description.trim().length < 20) { push('Write a short description before publishing', 'error'); return; }
    setSaving(true);
    try {
      const res = editing ? await api.patch(`/seller/products/${id}`, payload()) : await api.post('/seller/products', payload());
      const productId = res.data.product.id as string;
      if (publishAfter) {
        const pub = await api.post(`/seller/products/${productId}/publish`);
        push(pub.data.followersNotified ? `Published. ${pub.data.followersNotified} follower${pub.data.followersNotified === 1 ? '' : 's'} notified.` : 'Published to the marketplace', 'success');
      } else {
        push(editing ? 'Saved' : 'Saved as a draft', 'success');
      }
      navigate('/seller/products');
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SkeletonRegion label="Loading product" className="pb-10"><SkeletonHeading /><div className="mt-6"><SkeletonRows count={5} /></div></SkeletonRegion>;

  const totalVariationStock = variations.reduce((s, v) => s + (Number(v.stockQuantity) || 0), 0);

  return (
    <div className="mx-auto max-w-4xl pb-28 md:pb-10">
      <PageHeader
        back="/seller/products"
        backLabel="Products"
        title={editing ? 'Edit product' : 'Add a product'}
        subtitle={editing ? undefined : 'Save as a draft, or publish straight to the marketplace.'}
        actions={editing ? <div className="flex items-center gap-2"><StatusBadge status={status} />{status === 'published' && <Link to={`/product/${id}`} target="_blank" rel="noreferrer"><Button size="sm" variant="secondary"><Eye size={15} /> View</Button></Link>}</div> : undefined}
      />

      {flagged && (
        <Card tone="danger" padding="md" className="mb-4"><p className="text-sm text-brand-red"><span className="font-semibold">Flagged by Duka:</span> {flagged}. Fix the issue; it can be republished once the flag is cleared.</p></Card>
      )}

      <form onSubmit={(e) => save(e, false)} noValidate className="grid gap-4 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-4">
          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Basics</h2>
            <div className="mt-4 flex flex-col gap-4">
              <Input label="Product name" placeholder="Samsung Galaxy S24, 256GB" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} maxLength={200} />
              <Textarea label="Description" placeholder="What it is, what is in the box, condition, warranty…" value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} maxLength={5000} hint="At least 20 characters to publish." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Category" value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {STORE_CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
                </Select>
                <Input label="Subcategory (optional)" placeholder="Smartphones" value={form.subcategory} onChange={(e) => set('subcategory', e.target.value)} maxLength={80} />
                <Input label="Brand (optional)" placeholder="Samsung" value={form.brand} onChange={(e) => set('brand', e.target.value)} maxLength={80} />
                <Input label="Model (optional)" placeholder="SM-S921" value={form.model} onChange={(e) => set('model', e.target.value)} maxLength={80} />
                <Select label="Condition" value={form.condition} onChange={(e) => set('condition', e.target.value)}>
                  <option value="new">Brand new</option><option value="used">Used</option><option value="refurbished">Refurbished</option>
                </Select>
                <Input label="SKU (optional)" placeholder="Your own code" value={form.sku} onChange={(e) => set('sku', e.target.value)} maxLength={64} />
              </div>
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Photos</h2>
            <p className="mt-1 text-small text-ink-3">Up to 8. The first one is the cover.</p>
            <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
              {images.map((url, i) => (
                <div key={url + i} className="relative aspect-square overflow-hidden rounded-xl bg-surface-2">
                  <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-1.5 top-1.5 rounded-full bg-brand-green px-2 py-0.5 text-[10px] font-semibold text-white">Cover</span>}
                  <button type="button" onClick={() => setImages((im) => im.filter((_, j) => j !== i))} className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-ink/70 text-white" aria-label="Remove photo"><X size={14} /></button>
                  {i > 0 && <button type="button" onClick={() => setImages((im) => [im[i], ...im.filter((_, j) => j !== i)])} className="absolute bottom-1.5 left-1.5 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] font-medium text-white">Make cover</button>}
                </div>
              ))}
              {images.length < 8 && <ImageUpload folder="products" onChange={(url) => setImages((im) => [...im, url])} />}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Options</h2>
            <p className="mt-1 text-small text-ink-3">Sizes, colours, models. Each option keeps its own stock and can adjust the price.</p>
            {variations.length > 0 && (
              <div className="mt-3">
                <Input label="Option type" value={variationName} onChange={(e) => setVariationName(e.target.value)} placeholder="Colour" maxLength={60} />
                <ul className="mt-3 flex flex-col gap-2">
                  {variations.map((v, i) => (
                    <li key={i} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
                      <Input label="Value" placeholder="Black" value={v.value} onChange={(e) => setVariations((vs) => vs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                      <Input label="Price +/- (UGX)" type="number" inputMode="numeric" value={v.priceDeltaUgx} onChange={(e) => setVariations((vs) => vs.map((x, j) => (j === i ? { ...x, priceDeltaUgx: e.target.value } : x)))} />
                      <Input label="Stock" type="number" inputMode="numeric" min={0} value={v.stockQuantity} onChange={(e) => setVariations((vs) => vs.map((x, j) => (j === i ? { ...x, stockQuantity: e.target.value } : x)))} />
                      <Input label="SKU" value={v.sku} onChange={(e) => setVariations((vs) => vs.map((x, j) => (j === i ? { ...x, sku: e.target.value } : x)))} />
                      <button type="button" onClick={() => setVariations((vs) => vs.filter((_, j) => j !== i))} className="mb-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-brand-red" aria-label="Remove option"><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
                {errors.variations && <p className="mt-2 text-small text-brand-red">{errors.variations}</p>}
              </div>
            )}
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setVariations((vs) => [...vs, { name: variationName, value: '', priceDeltaUgx: '0', stockQuantity: '0', sku: '' }])}><Plus size={15} /> Add an option</Button>
          </Card>

          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Specifications</h2>
            <ul className="mt-3 flex flex-col gap-2">
              {specs.map((s, i) => (
                <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <Input label="Label" placeholder="Storage" value={s.label} onChange={(e) => setSpecs((sp) => sp.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} maxLength={60} />
                  <Input label="Value" placeholder="256GB" value={s.value} onChange={(e) => setSpecs((sp) => sp.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} maxLength={200} />
                  <button type="button" onClick={() => setSpecs((sp) => sp.filter((_, j) => j !== i))} className="mb-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-brand-red" aria-label="Remove specification"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setSpecs((sp) => [...sp, { label: '', value: '' }])} disabled={specs.length >= 30}><Plus size={15} /> Add a specification</Button>
          </Card>
        </div>

        <div className="flex flex-col gap-4 md:sticky md:top-20 md:self-start">
          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Price</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Input label="Price (UGX)" type="number" inputMode="numeric" min={100} value={form.priceUgx} onChange={(e) => set('priceUgx', e.target.value)} error={errors.priceUgx} />
              <Input label="Sale price (optional)" type="number" inputMode="numeric" min={100} value={form.salePriceUgx} onChange={(e) => set('salePriceUgx', e.target.value)} error={errors.salePriceUgx} hint={form.salePriceUgx && !errors.salePriceUgx && Number(form.priceUgx) > 0 ? `${Math.round(((Number(form.priceUgx) - Number(form.salePriceUgx)) / Number(form.priceUgx)) * 100)}% off, shows ${formatUgx(form.salePriceUgx)}` : undefined} />
            </div>
          </Card>
          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Stock</h2>
            <div className="mt-3 flex flex-col gap-3">
              {variations.length > 0 ? (
                <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">Stock is tracked per option. Total: <span className="font-semibold text-ink">{totalVariationStock}</span></p>
              ) : (
                <Input label="Quantity in stock" type="number" inputMode="numeric" min={0} value={form.stockQuantity} onChange={(e) => set('stockQuantity', e.target.value)} error={errors.stockQuantity} />
              )}
              <Input label="Low-stock warning at" type="number" inputMode="numeric" min={0} value={form.lowStockThreshold} onChange={(e) => set('lowStockThreshold', e.target.value)} error={errors.lowStockThreshold} hint="You get a notification at or below this number." />
            </div>
          </Card>
          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Delivery and visibility</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Textarea label="Delivery note (optional)" placeholder="Same-day in Kampala, 2 days upcountry" value={form.deliveryInfo} onChange={(e) => set('deliveryInfo', e.target.value)} rows={2} maxLength={500} />
              <label className="flex min-h-[44px] items-center gap-2.5 text-sm text-ink"><input type="checkbox" checked={form.isFeatured} onChange={(e) => set('isFeatured', e.target.checked)} className="h-4 w-4 rounded border-line-strong accent-brand-green" /> Feature on my storefront</label>
            </div>
          </Card>
          <div className="hidden flex-col gap-2 md:flex">
            <Button type="submit" variant="secondary" fullWidth disabled={saving}><Save size={16} /> {status === 'published' ? 'Save changes' : 'Save as draft'}</Button>
            {status !== 'published' && <Button type="button" fullWidth disabled={saving} onClick={(e) => save(e as unknown as FormEvent, true)}><Eye size={16} /> Save and publish</Button>}
          </div>
        </div>

        <div className="fixed inset-x-0 bottom-[calc(var(--duka-nav-height,0px))] z-30 flex gap-2 border-t border-line bg-surface p-3 md:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <Button type="submit" variant="secondary" className="flex-1" disabled={saving}><Save size={16} /> {status === 'published' ? 'Save' : 'Draft'}</Button>
          {status !== 'published' && <Button type="button" className="flex-1" disabled={saving} onClick={(e) => save(e as unknown as FormEvent, true)}><Eye size={16} /> Publish</Button>}
        </div>
      </form>
    </div>
  );
}
