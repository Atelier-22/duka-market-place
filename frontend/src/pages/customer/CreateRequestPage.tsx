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
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [locations, setLocations] = useState<Location[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  // Step 1: what
  const [title, setTitle] = useState('');
  // Step 2: details
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState('1');
  // Step 3: where
  const [sourcingType, setSourcingType] = useState<SourcingType>('shopper_choice');
  const [locationId, setLocationId] = useState('');
  const [socialSellerUrl, setSocialSellerUrl] = useState('');
  // Step 4: budget
  const [budgetMin, setBudgetMin] = useState('');
  const [budgetMax, setBudgetMax] = useState('');
  // Step 5: delivery
  const [addressId, setAddressId] = useState('');
  const [newAddressLine, setNewAddressLine] = useState('');
  const [addingAddress, setAddingAddress] = useState(false);
  const [notes, setNotes] = useState('');

  /**
   * Locations grouped by town, in the order the server sent them — it already
   * orders by city then name, so the grouping only has to preserve that.
   * Kampala first regardless, because most orders are still there and it
   * should not sit under "Jinja" purely by alphabet.
   */
  const locationsByCity = useMemo(() => {
    const groups = new Map<string, Location[]>();
    for (const l of locations) {
      const city = l.city || 'Other';
      const existing = groups.get(city);
      if (existing) existing.push(l);
      else groups.set(city, [l]);
    }
    return [...groups.entries()].sort(([a], [b]) =>
      a === 'Kampala' ? -1 : b === 'Kampala' ? 1 : a.localeCompare(b)
    );
  }, [locations]);

  const selectedLocation = locations.find((l) => l.id === locationId);

  useEffect(() => {
    api.get('/locations').then((res) => setLocations(res.data.locations));
    api.get('/addresses').then((res) => {
      setAddresses(res.data.addresses);
      const def = res.data.addresses.find((a: Address) => a.is_default);
      if (def) setAddressId(def.id);
    });
  }, []);

  /**
   * Why Continue is not available yet, in words — or null when it is.
   *
   * This was a list of booleans, so the button simply went grey and the reason
   * lived only in the code. A disabled button is also `pointer-events-none`,
   * so there was not even a tooltip to go looking for: you either guessed
   * which field was wrong or gave up. The reason is now shown next to it.
   *
   * The location check covers 'specific_shop' as well. The picker has always
   * been shown for both, but only 'specific_market' was ever required, so
   * naming a shop and choosing nothing walked past this step and posted a
   * request no shopper could act on.
   */
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

  /**
   * Ask the browser where we are, if it will say.
   *
   * A typed line like "Mbalwa" is not somewhere a shopper can navigate to, and
   * every address in the database was stored without coordinates — which is why
   * delivery pins never appeared on anyone's map. This attaches them at the one
   * moment the customer is most likely to be standing at the address. It is
   * best-effort: a refused prompt saves the address anyway.
   */
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

      {/* Progress.
          Six 11px captions across a 360px phone are unreadable, and unreadable
          labels are why the flow felt like it had hidden steps. On a phone the
          position is stated in words — which step, of how many, and what it is
          called — and the captions only appear once there is room for them. */}
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
                      : 'border-brand-green/15 bg-white/50 hover:bg-brand-green-mist/50',
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
                  onChange={(e) => setLocationId(e.target.value)}
                >
                  <option value="">Select a location…</option>
                  {/* Grouped by town, and a native select on purpose: the OS
                      picker gives full-size touch targets and a scroll people
                      already know, which no custom dropdown matches on a phone. */}
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
            {addresses.length > 0 && (
              <div className="flex flex-col gap-2">
                {addresses.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => setAddressId(a.id)}
                    className={[
                      'rounded-xl border p-3 text-left text-sm transition-all',
                      addressId === a.id ? 'border-brand-green-fresh bg-brand-green-mist' : 'border-brand-green/15 bg-white/50',
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
            <Textarea label="Notes for your shopper (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Gate code, landmark, preferred delivery time…" />
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

      {/* Sticky on a phone: the step content is long enough to scroll, and a
          Continue button parked below the fold reads as a dead end. It stays
          in normal flow once the viewport is tall enough not to need it. */}
      <div
        className={[
          'sticky bottom-0 z-10 mt-6 -mx-4 border-t border-brand-green/10 bg-white/85 px-4 py-3',
          'backdrop-blur-md sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:px-0 sm:backdrop-blur-none',
        ].join(' ')}
      >
        {/* The reason Continue is unavailable, where the thumb already is.
            aria-live so it is announced rather than silently appearing. */}
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
