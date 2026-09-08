import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Eye, Palette, Plus, Save, Sparkles, Trash2, X } from 'lucide-react';
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
import { categoryEntry } from '../../market/categories';
import { Swatch, useProductKnowledge } from '../../market/knowledge';
import { useCanonicalProduct } from '../../market/canonical';
import { CategoryOptions } from '../../components/market/CategoryOptions';
import { formatUgx } from '../../market/format';

interface Version { value: string; priceUgx: string }
interface Colour { name: string; hex: string }
interface Spec { label: string; value: string }


const EMPTY = {
  name: '', description: '', category: 'general', subcategory: '', brand: '', model: '', condition: 'new',
  priceUgx: '', salePriceUgx: '', sku: '', stockQuantity: '0', lowStockThreshold: '5', deliveryInfo: '', isFeatured: false,
};

const NONE = 'none';

function versionHint(category: string): string {
  switch (category) {
    case 'phones': case 'computers': case 'electronics': case 'tv-audio': case 'gaming': case 'cameras':
      return 'Different models or storage sizes at different prices, like Pro and Pro Max, or 128GB and 256GB.';
    case 'cars': case 'motorcycles': case 'bicycles':
      return 'Different trims, engines or years at different prices. Colours go in the next section.';
    case 'fashion': case 'mens': case 'womens': case 'kids-fashion': case 'shoes': case 'sports': case 'baby':
      return 'The sizes you have. Each size can have its own price, and stock is counted per size and colour.';
    case 'groceries': case 'fresh': case 'drinks': case 'agriculture': case 'bakery': case 'ready-food': case 'kitchen': case 'beauty':
      return 'Pack sizes or portions at different prices, like 1kg and 5kg, or Small and Family.';
    case 'services': case 'events': case 'property':
      return 'Packages or types at different prices, like Basic, Standard and Premium.';
    default:
      return 'Only if this comes in more than one version at different prices, like Small and Large.';
  }
}
const key = (v: string, c: string) => `${v}|${c}`;

export function SellerProductFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  usePageMeta({ title: editing ? 'Edit product' : 'Add product', noindex: true });
  const navigate = useNavigate();
  const { push } = useToast();
  const [form, setForm] = useState({ ...EMPTY });
  const [images, setImages] = useState<string[]>([]);
  const [specs, setSpecs] = useState<Spec[]>([]);
  const [versionType, setVersionType] = useState('Option');
  const [versions, setVersions] = useState<Version[]>([]);
  const [colours, setColours] = useState<Colour[]>([]);
  const [stock, setStock] = useState<Record<string, string>>({});
  const [customColour, setCustomColour] = useState<Colour>({ name: '', hex: '#2563EB' });
  const [status, setStatus] = useState<'draft' | 'published' | 'archived'>('draft');
  const [flagged, setFlagged] = useState<string | null>(null);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (id) return;
    api.get('/seller/me').then((r) => {
      const category = r.data.store?.category;
      if (!category) return;
      setForm((f) => (f.category === EMPTY.category ? { ...f, category } : f));
    }).catch(() => undefined);
  }, [id]);

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
      const rows = r.data.variations as { name: string; value: string; price_ugx: number | null; color_name: string | null; color_hex: string | null; stock_quantity: number }[];
      const vs: Version[] = [];
      const cs: Colour[] = [];
      const st: Record<string, string> = {};
      for (const row of rows) {
        if (row.value && !vs.some((v) => v.value === row.value)) vs.push({ value: row.value, priceUgx: row.price_ugx ? String(row.price_ugx) : '' });
        if (row.color_name && !cs.some((c) => c.name === row.color_name)) cs.push({ name: row.color_name, hex: row.color_hex ?? '#9CA3AF' });
        st[key(row.value || NONE, row.color_name || NONE)] = String(row.stock_quantity);
      }
      if (rows[0]?.name && rows[0].value) { setVersionType(rows[0].name); versionTypeTouched.current = true; }
      setVersions(vs);
      setColours(cs);
      setStock(st);
      setStatus(p.status);
      setFlagged(p.flagged_reason);
    }).catch(() => push('Could not load this product', 'error')).finally(() => setLoading(false));
  }, [id, push]);

  function set<K extends keyof typeof form>(k: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: value }));
    setErrors((e) => { const { [k]: _drop, ...rest } = e; return rest; });
  }

  const hasOptions = versions.length > 0 || colours.length > 0;
  const rowsFor = useMemo(() => (versions.length ? versions.map((v) => v.value) : [NONE]), [versions]);
  const colsFor = useMemo(() => (colours.length ? colours.map((c) => c.name) : [NONE]), [colours]);
  const stockAt = (v: string, c: string) => Number(stock[key(v, c)] || 0);
  const totalStock = rowsFor.reduce((s, v) => s + colsFor.reduce((t, c) => t + stockAt(v, c), 0), 0);

  const entry = categoryEntry(form.category);
  const { knowledge: resolved } = useProductKnowledge(form.category, form.subcategory, form.brand);
  const subEntry = resolved.kind && !resolved.kind.isDefault ? resolved.kind : null;
  const versionTypeTouched = useRef(false);
  const requiredSeeded = useRef<string | null>(null);

  useEffect(() => {
    if (!versionTypeTouched.current || !versionType.trim()) setVersionType(resolved.versionType);
  }, [resolved.versionType]);

  useEffect(() => {
    const required = resolved.attributes.filter((a) => a.role === 'required').map((a) => a.name);
    const marker = `${resolved.category}|${resolved.kind?.id ?? ''}`;
    if (required.length === 0 || requiredSeeded.current === marker) return;
    requiredSeeded.current = marker;
    addSpecs(required);
  }, [resolved]);

  function changeCategory(next: string) {
    setForm((f) => ({ ...f, category: next, subcategory: '' }));
    versionTypeTouched.current = false;
  }

  function changeSubcategory(next: string) {
    set('subcategory', next);
    versionTypeTouched.current = false;
  }

  const suggestedDetails = resolved.attributes.map((a) => a.name);
  const { lookup: canonical, state: canonicalState } = useCanonicalProduct(form.brand, form.model, form.category, form.subcategory, !loading);
  const canonicalSpecs = canonical?.product?.specs.filter((s) => s.status !== 'conflict' || s.confidence >= 0.6) ?? [];
  const specValueFor = (label: string) => specs.find((x) => x.label.trim().toLowerCase() === label.trim().toLowerCase())?.value ?? '';
  const applyCanonicalSpec = (label: string, value: string) => {
    setSpecs((sp) => {
      const idx = sp.findIndex((x) => x.label.trim().toLowerCase() === label.trim().toLowerCase());
      if (idx === -1) return [...sp, { label, value }];
      return sp.map((x, i) => (i === idx ? { ...x, value } : x));
    });
  };
  const qualityTotal = Math.min(12, resolved.attributes.length) + 3;
  const qualityDone = resolved.attributes.slice(0, 12).filter((a) => specValueFor(a.name).trim()).length + (images.length > 0 ? 1 : 0) + (form.description.trim().length >= 20 ? 1 : 0) + (Number(form.priceUgx) >= 100 ? 1 : 0);
  const optionsForDetail = (label: string) => resolved.attributes.find((a) => a.name.toLowerCase() === label.trim().toLowerCase())?.options ?? [];

  function addSpecs(labels: string[]) {
    setSpecs((sp) => {
      const have = new Set(sp.map((x) => x.label.trim().toLowerCase()));
      return [...sp, ...labels.filter((l) => !have.has(l.toLowerCase())).map((label) => ({ label, value: '' }))];
    });
  }

  function colourChips(list: Swatch[]) {
    return list.map((c) => {
      const chosen = colours.some((x) => x.name.toLowerCase() === c.name.toLowerCase());
      return (
        <button key={c.name} type="button" onClick={() => (chosen ? setColours((cs) => cs.filter((x) => x.name.toLowerCase() !== c.name.toLowerCase())) : addColour(c))} aria-pressed={chosen} className={`flex min-h-[40px] items-center gap-2 rounded-full border px-3 text-sm transition-colors ${chosen ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}>
          <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: c.hex ?? '#9CA3AF' }} aria-hidden />
          {c.name}
        </button>
      );
    });
  }

  function addVersion(value = '') { setVersions((vs) => [...vs, { value, priceUgx: '' }]); }
  function addSuggestedVersions(values: string[]) {
    setVersions((vs) => {
      const have = new Set(vs.map((v) => v.value.trim().toLowerCase()));
      return [...vs.filter((v) => v.value.trim()), ...values.filter((v) => !have.has(v.toLowerCase())).map((value) => ({ value, priceUgx: '' }))];
    });
  }
  function addColour(c: Swatch) {
    if (!c.name.trim()) { push('Give the colour a name', 'error'); return; }
    if (colours.some((x) => x.name.toLowerCase() === c.name.trim().toLowerCase())) { push('That colour is already added', 'error'); return; }
    setColours((cs) => [...cs, { name: c.name.trim(), hex: c.hex ?? '#9CA3AF' }]);
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
    if (!hasOptions && (!Number.isInteger(Number(form.stockQuantity)) || Number(form.stockQuantity) < 0)) next.stockQuantity = 'Stock cannot be negative.';
    if (!Number.isInteger(Number(form.lowStockThreshold)) || Number(form.lowStockThreshold) < 0) next.lowStockThreshold = 'Enter 0 or more.';
    const typeWord = versionType.trim().toLowerCase() || 'version';
    for (const v of versions) {
      if (!v.value.trim()) next.options = `Every ${typeWord} needs a name, for example Pro or Pro Max.`;
      if (v.priceUgx.trim() && (!Number.isInteger(Number(v.priceUgx)) || Number(v.priceUgx) < 100)) next.options = 'Enter each version price in whole shillings, or leave it empty to use the product price.';
    }
    if (versions.length && new Set(versions.map((v) => v.value.trim().toLowerCase())).size !== versions.length) next.options = 'Two versions have the same name.';
    for (const k of Object.keys(stock)) if (stock[k] && (!Number.isInteger(Number(stock[k])) || Number(stock[k]) < 0)) next.options = 'Stock must be a whole number, 0 or more.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function combos() {
    if (!hasOptions) return [];
    const out: { name: string; value: string; priceUgx: number | null; colorName: string | null; colorHex: string | null; stockQuantity: number }[] = [];
    for (const v of rowsFor) {
      const version = versions.find((x) => x.value === v);
      for (const c of colsFor) {
        const colour = colours.find((x) => x.name === c);
        out.push({
          name: versions.length ? versionType.trim() || 'Version' : 'Colour',
          value: v === NONE ? '' : v.trim(),
          priceUgx: version?.priceUgx.trim() ? Number(version.priceUgx) : null,
          colorName: c === NONE ? null : c,
          colorHex: colour?.hex ?? null,
          stockQuantity: stockAt(v, c),
        });
      }
    }
    return out;
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
      stockQuantity: hasOptions ? totalStock : Number(form.stockQuantity),
      lowStockThreshold: Number(form.lowStockThreshold),
      specifications: specs.filter((s) => s.label.trim() && s.value.trim()),
      deliveryInfo: form.deliveryInfo.trim() || null,
      isFeatured: form.isFeatured,
      images,
      variations: combos(),
    };
  }

  async function save(e: FormEvent, publishAfter = false) {
    e.preventDefault();
    if (!validate()) { push('Check the highlighted fields', 'error'); return; }
    if (publishAfter && images.length === 0) { push('Add at least one photo before publishing', 'error'); return; }
    if (publishAfter && form.description.trim().length < 20) { push('Write a short description before publishing', 'error'); return; }
    if (publishAfter && hasOptions && totalStock === 0) { push('Every option is at 0. Enter how many you have before publishing.', 'error'); return; }
    if (publishAfter) {
      const missing = resolved.attributes.filter((a) => a.role === 'required' && !specs.some((x) => x.label.trim().toLowerCase() === a.name.toLowerCase() && x.value.trim()));
      if (missing.length) { push(`Fill in ${missing.map((a) => a.name).join(', ')} before publishing`, 'error'); return; }
    }
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

  const basePrice = Number(form.salePriceUgx) || Number(form.priceUgx) || 0;
  const typeLabel = versionType.trim() || 'Version';

  return (
    <div className="mx-auto max-w-4xl with-action-bar">
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
              <Input label="Product name" placeholder="iPhone 17" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} maxLength={200} />
              <Textarea label="Description" placeholder="What it is, what is in the box, condition, warranty…" value={form.description} onChange={(e) => set('description', e.target.value)} rows={5} maxLength={5000} hint="At least 20 characters to publish." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Select label="Category" value={form.category} onChange={(e) => changeCategory(e.target.value)} hint="Pick the closest one. Buyers browse by it.">
                  <CategoryOptions />
                </Select>
                <div>
                  <Input label="What kind?" placeholder={resolved.kinds[0]?.name ?? 'Type it in'} value={form.subcategory} onChange={(e) => changeSubcategory(e.target.value)} maxLength={80} list={`subcategories-${entry.key}`} hint="Sizes, details and colours below follow this. Type your own if it is not listed." />
                  <datalist id={`subcategories-${entry.key}`}>{resolved.kinds.map((x) => <option key={x.id} value={x.name} />)}</datalist>
                  {resolved.kinds.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {resolved.kinds.map((x) => (
                        <button key={x.name} type="button" onClick={() => changeSubcategory(form.subcategory === x.name ? '' : x.name)} aria-pressed={form.subcategory === x.name} className={`min-h-[32px] rounded-full border px-2.5 text-caption font-medium transition-colors ${form.subcategory === x.name ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}>{x.name}</button>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Input label="Brand (optional)" placeholder={resolved.brands[0] ?? 'Brand'} value={form.brand} onChange={(e) => set('brand', e.target.value)} maxLength={80} list={`brands-${entry.key}`} />
                  <datalist id={`brands-${entry.key}`}>{resolved.brands.map((b) => <option key={b} value={b} />)}</datalist>
                </div>
                <Input label="Model (optional)" placeholder="A3102" value={form.model} onChange={(e) => set('model', e.target.value)} maxLength={80} hint={form.brand.trim() && form.model.trim() ? undefined : 'Give the brand and model and Duka looks up what it knows.'} />
                <Select label="Condition" value={form.condition} onChange={(e) => set('condition', e.target.value)}>
                  <option value="new">Brand new</option><option value="used">Used</option><option value="refurbished">Refurbished</option>
                </Select>
                <Input label="SKU (optional)" placeholder="Your own code" value={form.sku} onChange={(e) => set('sku', e.target.value)} maxLength={64} />
              </div>
            </div>
          </Card>

          {canonicalState !== 'idle' && (
            <Card padding="lg" data-testid="canonical-card">
              <h2 className="flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep"><Sparkles size={18} /> {canonicalState === 'loading' ? 'Checking what Duka knows…' : canonical?.product ? `Duka knows the ${canonical.product.displayName}` : 'Duka does not know this product yet'}</h2>
              {canonicalState === 'known' && canonicalSpecs.length > 0 && (
                <>
                  <p className="mt-1 text-small text-ink-3">Tap a detail to use it. Everything you pick stays editable below, so change it if your item is different. Price is always yours.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {canonicalSpecs.map((s) => {
                      const used = specValueFor(s.label).trim().toLowerCase() === s.value.trim().toLowerCase();
                      return (
                        <button key={s.key} type="button" onClick={() => applyCanonicalSpec(s.label, s.value)} aria-pressed={used} disabled={used} className={`flex min-h-[40px] items-center gap-2 rounded-full border px-3 text-sm transition-colors ${used ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}>
                          <span className={`h-2 w-2 shrink-0 rounded-full ${s.status === 'verified' ? 'bg-brand-green' : 'bg-brand-yellow'}`} aria-hidden />
                          <span className="text-ink-3">{s.label}:</span> {s.value}
                          <span className="text-caption text-ink-3">{Math.round(s.confidence * 100)}%</span>
                        </button>
                      );
                    })}
                    <button type="button" onClick={() => canonicalSpecs.forEach((s) => applyCanonicalSpec(s.label, s.value))} className="min-h-[40px] rounded-full px-3 text-sm font-semibold text-brand-green hover:bg-brand-green-mist">Use all</button>
                  </div>
                  <p className="mt-2 text-caption text-ink-3">Green dot: verified from several sources or by Duka. Yellow: seen once, check it.</p>
                </>
              )}
              {canonicalState === 'known' && canonicalSpecs.length === 0 && (
                <p className="mt-1 text-small text-ink-3">{canonical?.research?.status === 'queued' || canonical?.research?.status === 'running' ? 'Looking up its specifications in the background. Keep going, they appear here when ready and your listing improves on its own.' : canonical?.research?.status === 'done' ? 'No specifications could be confirmed for it yet. What you enter below teaches Duka.' : 'No verified details for it yet. What you enter below teaches Duka.'}</p>
              )}
              {canonicalState === 'unknown' && <p className="mt-1 text-small text-ink-3">Carry on, publishing works as normal. Duka will look this product up in the background and remember it for the next seller.</p>}
            </Card>
          )}

          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Photos</h2>
            <p className="mt-1 text-small text-ink-3">Up to 8. The first one is the cover. Buyers swipe through them.</p>
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
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Versions</h2>
            <p className="mt-1 text-small text-ink-3">{versionHint(entry.key)}</p>
            {resolved.versions.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="text-caption text-ink-3">{subEntry ? `${subEntry.name} ${resolved.versionType.toLowerCase()}` : `Quick add ${resolved.versionType.toLowerCase()}`}:</span>
                {resolved.versions.map((v) => {
                  const have = versions.some((x) => x.value.trim().toLowerCase() === v.toLowerCase());
                  return <button key={v} type="button" disabled={have} onClick={() => addSuggestedVersions([v])} className={`min-h-[32px] rounded-full border px-2.5 text-caption font-medium transition-colors ${have ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}>{v}</button>;
                })}
                <button type="button" onClick={() => addSuggestedVersions(resolved.versions)} className="min-h-[32px] rounded-full px-2.5 text-caption font-semibold text-brand-green hover:bg-brand-green-mist">Add all</button>
              </div>
            )}
            {versions.length > 0 && (
              <div className="mt-3">
                <Input label="What do you call the versions?" value={versionType} onChange={(e) => setVersionType(e.target.value)} placeholder={resolved.versionType} maxLength={60} hint="Size, Waist, Storage, Model, Trim, Pack size, Package…" />
                <ul className="mt-3 flex flex-col gap-2">
                  {versions.map((v, i) => (
                    <li key={i} className="grid grid-cols-[1fr_auto] items-end gap-2 rounded-xl border border-line p-2 sm:grid-cols-[1.2fr_1fr_auto]">
                      <Input label={`${typeLabel} name`} placeholder="Pro Max" value={v.value} onChange={(e) => setVersions((vs) => vs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                      <Input label="Price for this version (UGX)" type="number" inputMode="numeric" min={100} placeholder={form.priceUgx || 'Same as product'} value={v.priceUgx} onChange={(e) => setVersions((vs) => vs.map((x, j) => (j === i ? { ...x, priceUgx: e.target.value } : x)))} hint={v.priceUgx.trim() ? `Buyers pay ${formatUgx(Number(v.priceUgx))}` : 'Empty = the product price'} />
                      <button type="button" onClick={() => setVersions((vs) => vs.filter((_, j) => j !== i))} className="mb-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-brand-red" aria-label="Remove version"><Trash2 size={16} /></button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => addVersion()}><Plus size={15} /> Add a version</Button>
          </Card>

          <Card padding="lg">
            <h2 className="flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep"><Palette size={18} /> Colours</h2>
            <p className="mt-1 text-small text-ink-3">If it comes in colours, tap them. Buyers pick one and see how many of that colour you have. Skip this for things without a colour.</p>
            {resolved.colours.length > 0 && (
              <>
                <p className="mt-3 text-caption font-semibold uppercase text-ink-3">{resolved.colourTitle}</p>
                <div className="mt-1.5 flex flex-wrap gap-2">{colourChips(resolved.colours)}</div>
                <p className="mt-3 text-caption font-semibold uppercase text-ink-3">More colours</p>
              </>
            )}
            <div className="mt-1.5 flex flex-wrap gap-2">{colourChips(resolved.palette)}</div>
            <div className="mt-3 grid grid-cols-[auto_1fr_auto] items-end gap-2 rounded-xl border border-dashed border-line p-2">
              <label className="flex flex-col gap-1 text-caption text-ink-3">Any colour
                <input type="color" value={customColour.hex} onChange={(e) => setCustomColour((c) => ({ ...c, hex: e.target.value }))} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-surface p-1" aria-label="Pick a custom colour" />
              </label>
              <Input label="Name it" placeholder="Desert titanium" value={customColour.name} onChange={(e) => setCustomColour((c) => ({ ...c, name: e.target.value }))} maxLength={40} />
              <Button type="button" size="sm" variant="secondary" className="mb-1" onClick={() => { addColour(customColour); setCustomColour({ name: '', hex: customColour.hex }); }}><Plus size={14} /> Add</Button>
            </div>
            {colours.length > 0 && (
              <ul className="mt-3 flex flex-wrap gap-2">
                {colours.map((c) => (
                  <li key={c.name} className="flex items-center gap-2 rounded-full bg-surface-2 py-1 pl-1.5 pr-2 text-sm text-ink">
                    <span className="h-6 w-6 rounded-full border border-black/10" style={{ background: c.hex }} aria-hidden />
                    {c.name}
                    <button type="button" onClick={() => setColours((cs) => cs.filter((x) => x.name !== c.name))} className="flex h-6 w-6 items-center justify-center rounded-full text-ink-3 hover:bg-surface hover:text-brand-red" aria-label={`Remove ${c.name}`}><X size={13} /></button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {hasOptions && (
            <Card padding="lg">
              <h2 className="font-display text-h3 font-medium text-brand-green-deep">How many of each</h2>
              <p className="mt-1 text-small text-ink-3">{versions.length && colours.length ? 'Enter the stock for every version in every colour. A 0 shows as sold out.' : versions.length ? 'Enter the stock for each version.' : 'Enter the stock for each colour.'}</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[320px] text-sm">
                  <thead>
                    <tr className="text-left text-label uppercase text-ink-3">
                      <th className="py-2 pr-3 font-semibold">{versions.length ? typeLabel : ''}</th>
                      {colsFor.map((c) => {
                        const colour = colours.find((x) => x.name === c);
                        return <th key={c} className="px-1 py-2 text-center font-semibold"><span className="flex flex-col items-center gap-1">{colour && <span className="h-5 w-5 rounded-full border border-black/10" style={{ background: colour.hex }} aria-hidden />}{c === NONE ? 'Stock' : c}</span></th>;
                      })}
                      <th className="py-2 pl-2 text-right font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rowsFor.map((v, vi) => (
                      <tr key={`${v}-${vi}`} className="border-t border-line">
                        <td className="py-2 pr-3 font-medium text-ink">{v === NONE ? (colours.length ? 'All' : '') : v || <span className="text-ink-3">unnamed</span>}</td>
                        {colsFor.map((c) => (
                          <td key={c} className="px-1 py-1.5 text-center">
                            <input type="number" inputMode="numeric" min={0} value={stock[key(v, c)] ?? ''} onChange={(e) => setStock((s) => ({ ...s, [key(v, c)]: e.target.value }))} placeholder="0" aria-label={`Stock for ${v === NONE ? '' : v} ${c === NONE ? '' : c}`.trim()} className="h-10 w-16 rounded-lg border border-line bg-surface text-center text-sm outline-none focus:border-brand-green focus:shadow-focus" />
                          </td>
                        ))}
                        <td className="py-2 pl-2 text-right tabular-nums text-ink-2">{colsFor.reduce((t, c) => t + stockAt(v, c), 0)}</td>
                      </tr>
                    ))}
                    <tr className="border-t border-line font-semibold text-ink">
                      <td className="py-2 pr-3">Total</td>
                      {colsFor.map((c) => <td key={c} className="px-1 py-2 text-center tabular-nums">{rowsFor.reduce((t, v) => t + stockAt(v, c), 0)}</td>)}
                      <td className="py-2 pl-2 text-right tabular-nums">{totalStock}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              {errors.options && <p className="mt-2 text-small text-brand-red">{errors.options}</p>}
              <div className="mt-3 rounded-xl bg-surface-2 p-3 text-sm">
                <p className="text-caption font-semibold uppercase text-ink-3">Buyers will see</p>
                {versions.length > 0 && <p className="mt-1 text-ink">Choose {typeLabel.toLowerCase()}: {versions.filter((v) => v.value.trim()).map((v) => `${v.value} (${formatUgx(v.priceUgx.trim() ? Number(v.priceUgx) : basePrice)})`).join(' · ') || 'name the versions above'}</p>}
                {colours.length > 0 && <p className="mt-1 text-ink">Then choose a colour: {colours.map((c) => c.name).join(' · ')}, each showing how many are left.</p>}
                {totalStock === 0 && <p className="mt-1 text-caption text-brand-red">Everything is at 0 right now, so nothing can be bought until you enter stock.</p>}
              </div>
            </Card>
          )}

          <Card padding="lg">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-h3 font-medium text-brand-green-deep">Details</h2>
              <span className="flex items-center gap-2 text-caption text-ink-2" data-testid="listing-quality"><span className="h-1.5 w-24 overflow-hidden rounded-full bg-surface-2"><span className="block h-full rounded-full bg-brand-green transition-[width]" style={{ width: `${Math.round((qualityDone / Math.max(1, qualityTotal)) * 100)}%` }} /></span>{qualityDone}/{qualityTotal} complete</span>
            </div>
            <p className="mt-1 text-small text-ink-3">The facts buyers look for on {(subEntry?.name ?? entry.label).toLowerCase()}. Tap one to fill it in. Photos, a description and a price count too.</p>
            {suggestedDetails.length > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                {resolved.attributes.map((a) => {
                  const have = specs.some((x) => x.label.trim().toLowerCase() === a.name.toLowerCase());
                  return <button key={a.key} type="button" disabled={have} onClick={() => addSpecs([a.name])} className={`min-h-[32px] rounded-full border px-2.5 text-caption font-medium transition-colors ${have ? 'border-brand-green bg-brand-green-mist text-brand-green-deep' : a.role === 'required' ? 'border-brand-green/60 bg-surface text-brand-green-deep hover:border-brand-green' : 'border-line bg-surface text-ink-2 hover:border-line-strong'}`}>{a.name}{a.role === 'required' && !have ? ' *' : ''}</button>;
                })}
                <button type="button" onClick={() => addSpecs(suggestedDetails)} className="min-h-[32px] rounded-full px-2.5 text-caption font-semibold text-brand-green hover:bg-brand-green-mist">Add all</button>
              </div>
            )}
            <ul className="mt-3 flex flex-col gap-2">
              {specs.map((s, i) => (
                <li key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
                  <Input label="Detail" placeholder={suggestedDetails[0] ?? 'Storage'} value={s.label} onChange={(e) => setSpecs((sp) => sp.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))} maxLength={60} list={`detail-labels-${entry.key}`} />
                  <div>
                    <Input label="Value" placeholder={optionsForDetail(s.label)[0] ?? '256GB'} value={s.value} onChange={(e) => setSpecs((sp) => sp.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} maxLength={200} list={optionsForDetail(s.label).length ? `detail-values-${i}` : undefined} />
                    {optionsForDetail(s.label).length > 0 && <datalist id={`detail-values-${i}`}>{optionsForDetail(s.label).map((v) => <option key={v} value={v} />)}</datalist>}
                  </div>
                  <button type="button" onClick={() => setSpecs((sp) => sp.filter((_, j) => j !== i))} className="mb-1 flex h-10 w-10 items-center justify-center rounded-full text-ink-3 hover:bg-surface-2 hover:text-brand-red" aria-label="Remove detail"><Trash2 size={16} /></button>
                </li>
              ))}
            </ul>
            <datalist id={`detail-labels-${entry.key}`}>{suggestedDetails.map((l) => <option key={l} value={l} />)}</datalist>
            <Button type="button" variant="secondary" size="sm" className="mt-3" onClick={() => setSpecs((sp) => [...sp, { label: '', value: '' }])} disabled={specs.length >= 30}><Plus size={15} /> Add another detail</Button>
          </Card>
        </div>

        <div className="flex flex-col gap-4 md:sticky md:top-20 md:self-start">
          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Price</h2>
            <div className="mt-3 flex flex-col gap-3">
              <Input label="Price (UGX)" type="number" inputMode="numeric" min={100} value={form.priceUgx} onChange={(e) => set('priceUgx', e.target.value)} error={errors.priceUgx} hint={versions.length ? 'Used for any version without its own price.' : undefined} />
              <Input label="Sale price (optional)" type="number" inputMode="numeric" min={100} value={form.salePriceUgx} onChange={(e) => set('salePriceUgx', e.target.value)} error={errors.salePriceUgx} hint={form.salePriceUgx && !errors.salePriceUgx && Number(form.priceUgx) > 0 ? `${Math.round(((Number(form.priceUgx) - Number(form.salePriceUgx)) / Number(form.priceUgx)) * 100)}% off, shows ${formatUgx(form.salePriceUgx)}` : undefined} />
            </div>
          </Card>
          <Card padding="lg">
            <h2 className="font-display text-h3 font-medium text-brand-green-deep">Stock</h2>
            <div className="mt-3 flex flex-col gap-3">
              {hasOptions ? (
                <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">Counted per version and colour above. Total: <span className="font-semibold text-ink">{totalStock}</span></p>
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

        <div className="fixed inset-x-0 bottom-[var(--duka-nav-height,0px)] z-30 flex gap-2 border-t border-line bg-surface p-3 md:hidden" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
          <Button type="submit" variant="secondary" className="flex-1" disabled={saving}><Save size={16} /> {status === 'published' ? 'Save' : 'Draft'}</Button>
          {status !== 'published' && <Button type="button" className="flex-1" disabled={saving} onClick={(e) => save(e as unknown as FormEvent, true)}><Eye size={16} /> Publish</Button>}
        </div>
      </form>
    </div>
  );
}
