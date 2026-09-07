import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, LucideIcon, Search, ShoppingBag, Smartphone, Store } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Address, Location, SourcingType } from '../../types';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { Select } from '../../components/ui/Select';
import { Bone, SkeletonRegion } from '../../components/ui/Skeleton';
import { usePreferences } from '../../context/PreferencesContext';
import { useToast } from '../../components/ui/Toast';

const STEPS = ['What', 'Details', 'Where', 'Budget', 'Delivery', 'Review'];

const SOURCING_OPTIONS: { value: SourcingType; label: string; icon: LucideIcon; blurb: string }[] = [
  { value: 'specific_market', label: 'A specific market', icon: Store, blurb: 'e.g. Owino, Kalerwe, Nakasero' },
  { value: 'specific_shop', label: 'A specific shop', icon: ShoppingBag, blurb: 'Name a shop you know' },
  { value: 'social_seller', label: 'A social media seller', icon: Smartphone, blurb: 'Paste a TikTok/Instagram/Facebook link' },
  { value: 'shopper_choice', label: 'Let the shopper decide', icon: Search, blurb: 'Best price & quality nearby' },
];

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

  const [title, setTitle] = useState('');

  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');

  const [sourcingType, setSourcingType] = useState<SourcingType>((preferences.default_sourcing as SourcingType) || 'shopper_choice');
  const [locationId, setLocationId] = useState('');
  const [socialSellerUrl, setSocialSellerUrl] = useState('');

  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');

  const [addressId, setAddressId] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);
  const [notes, setNotes] = useState(preferences.delivery_instructions ?? '');
  const [notesTouched, setNotesTouched] = useState(false);

  // Standing delivery instructions arrive after mount on a fresh device; adopt
  // them unless the customer has already started typing their own.
  useEffect(() => {
    if (!notesTouched && !notes && preferences.delivery_instructions) setNotes(preferences.delivery_instructions);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences.delivery_instructions]);

  const locationsByCity = useMemo(() => {
    const groups = new Map<string, Location[]>();
    for (const l of locations) {
      const city = l.city || 'Other';
      const existing = groups.get(city);
      if (existing) existing.push(l);
      else groups.set(city, [l]);
    }
    // The customer's own town first, then Kampala, then the rest.
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
    title.trim().length >= 3 ? null : 'Tell us what you need first — a few words is enough.',
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
      push('Request posted! Nearby shoppers can now see it.', 'success');
      navigate(`/app/requests/${res.data.request.id}`);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Request something</h1>
      <p className="mt-1 text-sm text-brand-ink/50">Tell us what you need — we'll find someone nearby to get it.</p>

      <div className="mt-6">
        <div className="flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <div key={s} className="flex flex-1 flex-col items-center gap-1.5">
              <div
                className={`h-1.5 w-full rounded-full ${i <= step ? 'bg-brand-green-fresh' : 'bg-brand-green/15'}`}
              />
              <span
                className={`hidden text-[11px] font-medium sm:block ${
                  i === step ? 'text-brand-green-deep' : 'text-brand-ink/35'
                }`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>
        <p className="mt-2 text-sm font-semibold text-brand-green-deep sm:hidden">
          Step {step + 1} of {STEPS.length}
          <span className="font-normal text-brand-ink/50"> · {STEPS[step]}</span>
        </p>
      </div>

      <GlassCard padding="lg" hover={false} className="mt-6 min-h-[360px]">
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <p className="font-display text-lg font-medium text-brand-green-deep">What do you need?</p>
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
          <div className="flex flex-col gap-4">
            <p className="font-display text-lg font-medium text-brand-green-deep">Add product details</p>
            <Input label="Quantity" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            <Textarea
              label="Description (optional)"
              placeholder="Size, color, brand, quality — anything that helps your shopper find the right one."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <p className="font-display text-lg font-medium text-brand-green-deep">Where should the shopper buy it?</p>
            <div className="grid grid-cols-2 gap-3">
              {SOURCING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSourcingType(opt.value)}
                  className={[
                    'rounded-xl2 border p-4 text-left transition-all',
                    sourcingType === opt.value
                      ? 'border-brand-green-fresh bg-brand-green-mist shadow-glass'
                      : 'border-brand-green/15 bg-brand-white hover:bg-brand-green-mist/50',
                  ].join(' ')}
                >
                  <opt.icon size={20} strokeWidth={1.6} className="text-brand-green-fresh" />
                  <p className="mt-2 text-sm font-semibold text-brand-green-deep">{opt.label}</p>
                  <p className="mt-0.5 text-xs text-brand-ink/50">{opt.blurb}</p>
                </button>
              ))}
            </div>

            {(sourcingType === 'specific_market' || sourcingType === 'specific_shop') && (
              <>
                <Select
                  label={`Choose a location${locationsByCity.length ? ` (${locations.length} across ${locationsByCity.length} towns)` : ''}`}
                  value={locationId}
                  disabled={locationsLoading}
                  onChange={(e) => setLocationId(e.target.value)}
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
                {selectedLocation?.description && (
                  <p className="-mt-1 text-xs text-brand-ink/55">
                    {selectedLocation.city} · {selectedLocation.description}
                  </p>
                )}
              </>
            )}

            {sourcingType === 'social_seller' && (
              <Input
                label="Seller link"
                placeholder="https://tiktok.com/@seller/video/..."
                value={socialSellerUrl}
                onChange={(e) => setSocialSellerUrl(e.target.value)}
              />
            )}
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <p className="font-display text-lg font-medium text-brand-green-deep">What's your budget?</p>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Minimum (optional)" type="number" placeholder="0" value={budgetMin} onChange={(e) => setBudgetMin(e.target.value)} />
              <Input label="Maximum" type="number" placeholder="100000" value={budgetMax} onChange={(e) => setBudgetMax(e.target.value)} required />
            </div>
            <p className="text-xs text-brand-ink/45">All amounts are in UGX. Shoppers will try to stay within this range and show you the exact price before buying.</p>
          </div>
        )}

        {step === 4 && (
          <div className="flex flex-col gap-4">
            <p className="font-display text-lg font-medium text-brand-green-deep">Where should we deliver it?</p>
            {addressesLoading && (
              <SkeletonRegion label="Loading your addresses" className="flex flex-col gap-2">
                <Bone className="h-12 w-full rounded-xl" />
                <Bone className="h-12 w-full rounded-xl" />
              </SkeletonRegion>
            )}
            {addresses.length > 0 && (
              <div className="flex flex-col gap-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAddressId(a.id)}
                    className={[
                      'rounded-xl border p-3 text-left text-sm transition-all',
                      addressId === a.id ? 'border-brand-green-fresh bg-brand-green-mist' : 'border-brand-green/15 bg-brand-white',
                    ].join(' ')}
                  >
                    <span className="font-medium text-brand-green-deep">{a.label}</span> — {a.line1}
                  </button>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <Input placeholder="Add a new delivery address" value={newAddressLine} onChange={(e) => setNewAddressLine(e.target.value)} />
              <GlassButton type="button" variant="secondary" size="sm" onClick={handleAddAddress} disabled={addingAddress}>
                Add
              </GlassButton>
            </div>
            <Textarea
              label="Notes for your shopper (optional)"
              value={notes}
              onChange={(e) => { setNotesTouched(true); setNotes(e.target.value); }}
              placeholder="Landmark, which gate to use, a good time to deliver…"
              hint="Your shopper sees this. Only what they need to find you and deliver — your phone number is already shared with them, so there is no need to repeat it here."
            />
          </div>
        )}

        {step === 5 && (
          <div className="flex flex-col gap-4">
            <p className="font-display text-lg font-medium text-brand-green-deep">Review your request</p>
            <div className="flex flex-col gap-3 rounded-xl2 bg-brand-green-mist/60 p-4 text-sm">
              <Row label="Item" value={`${quantity} × ${title}`} />
              {description && <Row label="Details" value={description} />}
              <Row label="Source" value={SOURCING_OPTIONS.find((o) => o.value === sourcingType)?.label ?? ''} />
              <Row label="Budget" value={`${budgetMin ? `${budgetMin} – ` : 'Up to '}${budgetMax} UGX`} />
              <Row label="Deliver to" value={addresses.find((a) => a.id === addressId)?.line1 ?? '—'} />
            </div>
          </div>
        )}
      </GlassCard>

      <div
        className={[
          'sticky bottom-0 z-10 mt-6 -mx-4 border-t border-brand-green/10 bg-brand-white px-4 py-3',
          'sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 ',
        ].join(' ')}
      >

        {blockedReason && step < STEPS.length - 1 && (
          <p className="mb-2 text-center text-xs font-medium text-brand-ink/60" aria-live="polite">
            {blockedReason}
          </p>
        )}
        <div className="flex items-center justify-between gap-3">
          <GlassButton
            variant="ghost"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="min-h-[48px]"
          >
            <ArrowLeft size={15} strokeWidth={2} /> Back
          </GlassButton>
          {step < STEPS.length - 1 ? (
            <GlassButton
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed}
              className="min-h-[48px] flex-1 sm:flex-none"
            >
              Continue <ArrowRight size={15} strokeWidth={2} />
            </GlassButton>
          ) : (
            <GlassButton
              onClick={handleSubmit}
              disabled={submitting}
              className="min-h-[48px] flex-1 sm:flex-none"
            >
              {submitting ? 'Posting request…' : 'Submit request'}
            </GlassButton>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-brand-ink/50">{label}</span>
      <span className="text-right font-medium text-brand-ink">{value}</span>
    </div>
  );
}
