import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, LucideIcon, MapPin, Search, ShoppingBag, Smartphone, Store } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Address, Location, SourcingType } from '../../types';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { PageHeader } from '../../components/ui/PageHeader';
import { Bone, SkeletonRegion } from '../../components/ui/Skeleton';
import { usePreferences } from '../../context/PreferencesContext';
import { useToast } from '../../components/ui/Toast';

const STEPS = ['What', 'Details', 'Where', 'Budget', 'Delivery', 'Review'];

const SOURCING_OPTIONS: { value: SourcingType; label: string; icon: LucideIcon; blurb: string }[] = [
  { value: 'specific_market', label: 'A specific market', icon: Store, blurb: 'Owino, Kalerwe, Nakasero…' },
  { value: 'specific_shop', label: 'A specific shop', icon: ShoppingBag, blurb: 'Name a shop you know' },
  { value: 'social_seller', label: 'A social media seller', icon: Smartphone, blurb: 'Paste a TikTok, Instagram or Facebook link' },
  { value: 'shopper_choice', label: 'Let the shopper decide', icon: Search, blurb: 'Best price and quality nearby' },
];

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

export function CreateRequestPage() {
  const navigate = useNavigate();
  const { push } = useToast();
  const { preferences } = usePreferences();
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(true);
  const [addressesLoading, setAddressesLoading] = useState(true);

  const [prefill] = useSearchParams();
  const [title, setTitle] = useState(prefill.get('title')?.slice(0, 200) ?? '');
  const [description, setDescription] = useState(prefill.get('description')?.slice(0, 2000) ?? '');
  const [quantity, setQuantity] = useState('1');

  const [sourcingType, setSourcingType] = useState<SourcingType>((preferences.default_sourcing as SourcingType) || 'shopper_choice');
  const [locationId, setLocationId] = useState('');
  const [socialSellerUrl, setSocialSellerUrl] = useState('');

  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState(/^\d+$/.test(prefill.get('budget') ?? '') ? String(prefill.get('budget')) : '');

  const [addressId, setAddressId] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);
  const [notes, setNotes] = useState(preferences.delivery_instructions ?? '');
  const [notesTouched, setNotesTouched] = useState(false);

  useEffect(() => {
    if (!notesTouched && !notes && preferences.delivery_instructions) setNotes(preferences.delivery_instructions);
  }, [preferences.delivery_instructions]);

  const locationsByCity = useMemo(() => {
    const groups = new Map<string, Location[]>();
    for (const l of locations) {
      const city = l.city || 'Other';
      const existing = groups.get(city);
      if (existing) existing.push(l);
      else groups.set(city, [l]);
    }
    const home = preferences.default_city;
    return [...groups.entries()].sort(([a], [b]) =>
      a === home ? -1 : b === home ? 1 : a === 'Kampala' ? -1 : b === 'Kampala' ? 1 : a.localeCompare(b)
    );
  }, [locations, preferences.default_city]);

  const selectedLocation = locations.find((l) => l.id === locationId);

  useEffect(() => {
    api.get('/locations')
      .then((res) => setLocations(res.data.locations))
      .finally(() => setLocationsLoading(false));
    api.get('/addresses')
      .then((res) => {
        setAddresses(res.data.addresses);
        const def = res.data.addresses.find((a: Address) => a.is_default);
        if (def) setAddressId(def.id);
      })
      .finally(() => setAddressesLoading(false));
  }, []);

  const blockedReason: string | null = [
    title.trim().length >= 3 ? null : 'Tell us what you need first. A few words is enough.',
    null,
    (sourcingType === 'specific_market' || sourcingType === 'specific_shop') && !locationId
      ? 'Choose where the shopper should buy it.'
      : sourcingType === 'social_seller' && !socialSellerUrl.trim()
        ? "Paste the link to the seller's post."
        : null,
    Number(budgetMax) > 0 ? null : 'Enter the most you want to spend.',
    addressId ? null : 'Choose where it should be delivered.',
    null,
  ][step];

  const canProceed = !blockedReason;

  function currentCoords(): Promise<{ lat: number; lng: number } | null> {
    if (!('geolocation' in navigator)) return Promise.resolve(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8_000, maximumAge: 60_000 }
      );
    });
  }

  async function handleAddAddress() {
    if (!newAddressLine.trim()) return;
    setAddingAddress(true);
    try {
      const coords = await currentCoords();
      const res = await api.post('/addresses', {
        line1: newAddressLine,
        isDefault: addresses.length === 0,
        ...(coords ?? {}),
      });
      setAddresses((a) => [...a, res.data.address]);
      setAddressId(res.data.address.id);
      setNewAddressLine('');
      if (!coords) {
        push('Address saved. Allow location access to pin it on the map for your shopper.', 'info');
      }
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setAddingAddress(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await api.post('/requests', {
        title,
        description: description || undefined,
        sourcingType,
        locationId: sourcingType === 'specific_market' || sourcingType === 'specific_shop' ? locationId || undefined : undefined,
        socialSellerUrl: sourcingType === 'social_seller' ? socialSellerUrl : undefined,
        budgetMinUgx: budgetMin ? Number(budgetMin) : undefined,
        budgetMaxUgx: Number(budgetMax),
        deliveryAddressId: addressId,
        notesForShopper: notes || undefined,
        items: [{ name: title, quantity, description: description || undefined }],
      });
      push('Request posted. Nearby shoppers can now see it.', 'success');
      navigate(`/app/requests/${res.data.request.id}`);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  const stepTitle = [
    'What do you need?',
    'Add the details',
    'Where should the shopper buy it?',
    "What's your budget?",
    'Where should we deliver it?',
    'Review your request',
  ][step];

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <PageHeader title="Request something" subtitle="Tell us what you need. We'll find someone nearby to get it." />

      <div>
        <ol className="flex items-center gap-1.5" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex flex-1 flex-col items-center gap-1.5" aria-current={i === step ? 'step' : undefined}>
              <div className={`h-1.5 w-full rounded-full transition-colors duration-300 ${i <= step ? 'bg-brand-green' : 'bg-line'}`} />
              <span className={`hidden text-caption font-medium sm:block ${i === step ? 'text-brand-green-deep' : 'text-ink-3'}`}>
                {s}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-small font-semibold text-brand-green-deep sm:hidden">
          Step {step + 1} of {STEPS.length}
          <span className="font-normal text-ink-3"> · {STEPS[step]}</span>
        </p>
      </div>

      <Card padding="lg" className="mt-5 min-h-[340px]">
        <h2 className="font-display text-h3 font-medium text-brand-green-deep">{stepTitle}</h2>

        {step === 0 && (
          <div className="mt-4 flex flex-col gap-4">
            <Input
              label="Item"
              placeholder="e.g. Black leather shoes, size 42"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {step === 1 && (
          <div className="mt-4 flex flex-col gap-4">
            <Input label="Quantity" inputMode="numeric" value={quantity} onChange={(e) => setQuantity(e.target.value)} className="max-w-[160px]" />
            <Textarea
              label="Description (optional)"
              placeholder="Size, colour, brand, quality. Anything that helps your shopper find the right one."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Where to buy">
              {SOURCING_OPTIONS.map((opt) => {
                const selected = sourcingType === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setSourcingType(opt.value)}
                    className={[
                      'flex items-start gap-3 rounded-xl border p-4 text-left transition-[background-color,border-color,box-shadow] duration-150',
                      selected
                        ? 'border-brand-green bg-brand-green-mist shadow-focus'
                        : 'border-line bg-surface hover:border-line-strong',
                    ].join(' ')}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${selected ? 'bg-brand-green text-white' : 'bg-surface-2 text-brand-green'}`}>
                      <opt.icon size={17} strokeWidth={1.8} />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold text-brand-green-deep">{opt.label}</span>
                      <span className="mt-0.5 block text-caption text-ink-3">{opt.blurb}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            {(sourcingType === 'specific_market' || sourcingType === 'specific_shop') && (
              <Select
                label={`Choose a location${locationsByCity.length ? ` (${locations.length} across ${locationsByCity.length} towns)` : ''}`}
                value={locationId}
                disabled={locationsLoading}
                onChange={(e) => setLocationId(e.target.value)}
                hint={selectedLocation?.description ? `${selectedLocation.city} · ${selectedLocation.description}` : undefined}
              >
                <option value="">{locationsLoading ? 'Loading places…' : 'Select a location…'}</option>
                {locationsByCity.map(([city, inCity]) => (
                  <optgroup key={city} label={city}>
                    {inCity.map((l) => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </optgroup>
                ))}
              </Select>
            )}

            {sourcingType === 'social_seller' && (
              <Input
                label="Seller link"
                type="url"
                inputMode="url"
                placeholder="https://tiktok.com/@seller/video/..."
                value={socialSellerUrl}
                onChange={(e) => setSocialSellerUrl(e.target.value)}
              />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Minimum (optional)" type="number" inputMode="numeric" placeholder="0" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
              <Input label="Maximum" type="number" inputMode="numeric" placeholder="100000" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} required />
            </div>
            <p className="text-caption text-ink-3">
              All amounts are in UGX. Shoppers stay within this range and show you the exact price before buying.
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="mt-4 flex flex-col gap-4">
            {addressesLoading && (
              <SkeletonRegion label="Loading your addresses" className="flex flex-col gap-2">
                <Bone className="h-14 w-full rounded-xl" />
                <Bone className="h-14 w-full rounded-xl" />
              </SkeletonRegion>
            )}
            {addresses.length > 0 && (
              <div className="flex flex-col gap-2" role="radiogroup" aria-label="Delivery address">
                {addresses.map((a) => {
                  const selected = addressId === a.id;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setAddressId(a.id)}
                      className={[
                        'flex min-h-[56px] items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-[background-color,border-color,box-shadow] duration-150',
                        selected ? 'border-brand-green bg-brand-green-mist shadow-focus' : 'border-line bg-surface hover:border-line-strong',
                      ].join(' ')}
                    >
                      <MapPin size={17} strokeWidth={1.8} className={selected ? 'shrink-0 text-brand-green' : 'shrink-0 text-ink-3'} />
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-brand-green-deep">{a.label}</span>
                        <span className="block truncate text-caption text-ink-3">{a.line1}{a.landmark ? ` · ${a.landmark}` : ''}</span>
                      </span>
                      {selected && <Check size={17} strokeWidth={2.5} className="shrink-0 text-brand-green" />}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="Add a new delivery address" value={newAddressLine} onChange={(e) => setNewAddressLine(e.target.value)} aria-label="New delivery address" />
              <Button type="button" variant="secondary" onClick={handleAddAddress} loading={addingAddress}>
                Add
              </Button>
            </div>
            <Textarea
              label="Notes for your shopper (optional)"
              value={notes}
              onChange={(e) => { setNotesTouched(true); setNotes(e.target.value); }}
              placeholder="Landmark, which gate to use, a good time to deliver…"
              hint="Your shopper sees this. Your phone number is already shared with them, so there is no need to repeat it."
            />
          </div>
        )}

        {step === 5 && (
          <div className="mt-4 flex flex-col gap-4">
            <dl className="divide-y divide-line rounded-xl border border-line">
              <Row label="Item" value={`${quantity} × ${title}`} />
              {description && <Row label="Details" value={description} />}
              <Row label="Source" value={SOURCING_OPTIONS.find((o) => o.value === sourcingType)?.label ?? ''} />
              {selectedLocation && <Row label="Location" value={`${selectedLocation.name}, ${selectedLocation.city}`} />}
              {sourcingType === 'social_seller' && <Row label="Seller link" value={socialSellerUrl} />}
              <Row label="Budget" value={`${budgetMin ? `${formatUgx(Number(budgetMin))} – ` : 'Up to '}${formatUgx(Number(budgetMax) || 0)}`} />
              <Row label="Deliver to" value={addresses.find((a) => a.id === addressId)?.line1 ?? '—'} />
              {notes && <Row label="Notes" value={notes} />}
            </dl>
            <p className="text-caption text-ink-3">
              Nothing is charged now. You approve the exact price once your shopper finds the item.
            </p>
          </div>
        )}
      </Card>

      <div
        className={[
          'sticky bottom-0 z-10 mt-5 -mx-4 border-t border-line bg-surface px-4 py-3',
          'sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0',
        ].join(' ')}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        {blockedReason && step < STEPS.length - 1 && (
          <p className="mb-2 text-center text-caption font-medium text-ink-2" aria-live="polite">
            {blockedReason}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <Button variant="tertiary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft size={15} strokeWidth={2} /> Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep((s) => s + 1)} disabled={!canProceed} className="flex-1 sm:flex-none">
              Continue <ArrowRight size={15} strokeWidth={2} />
            </Button>
          ) : (
            <Button onClick={handleSubmit} loading={submitting} className="flex-1 sm:flex-none">
              {submitting ? 'Posting request…' : 'Post request'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 px-4 py-3 text-sm">
      <dt className="shrink-0 text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right font-medium text-ink">{value}</dd>
    </div>
  );
}
