import { FormEvent, useEffect, useState } from 'react';
import { Check, MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Address } from '../../types';
import { GlassButton } from '../ui/GlassButton';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

interface Draft {
  id: string | null;
  label: string;
  line1: string;
  landmark: string;
  city: string;
}

const EMPTY: Draft = { id: null, label: 'Home', line1: '', landmark: '', city: 'Kampala' };

export function AddressBook() {
  const { push } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get('/addresses');
      setAddresses(res.data.addresses);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!draft) return;
    setSaving(true);
    try {
      const body = {
        label: draft.label.trim() || 'Home',
        line1: draft.line1.trim(),
        landmark: draft.landmark.trim() || undefined,
        city: draft.city.trim() || undefined,
      };
      if (draft.id) {
        const res = await api.patch(`/addresses/${draft.id}`, body);
        push(res.data.replaced
          ? 'Saved as a new address. The old one is kept on your past orders.'
          : 'Address updated.', 'success');
      } else {
        await api.post('/addresses', body);
        push('Address added.', 'success');
      }
      setDraft(null);
      await load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await api.delete(`/addresses/${id}`);
      setConfirmDelete(null);
      push('Address removed.', 'success');
      await load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  async function makeDefault(id: string) {
    try {
      await api.patch(`/addresses/${id}/default`);
      await load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-2" aria-busy="true">
        {[0, 1].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl2 bg-brand-green-mist/60" />
        ))}
      </div>
    );
  }

  return (
    <div>
      {addresses.length === 0 && !draft && (
        <p className="text-sm text-brand-ink/55">
          No saved addresses yet. Add one here and it will be ready the next time you order.
        </p>
      )}

      <div className="flex flex-col gap-2">
        {addresses.map((a) => (
          <div key={a.id} className="rounded-xl2 border border-brand-green/12 p-3">
            {confirmDelete === a.id ? (
              <div>
                <p className="text-sm font-medium text-brand-ink">Remove this address?</p>
                <p className="mt-1 text-xs text-brand-ink/55">
                  It disappears from your list and from the order form. Orders already delivered
                  here keep showing it.
                </p>
                <div className="mt-3 flex gap-2">
                  <GlassButton size="sm" variant="danger" onClick={() => remove(a.id)}>Remove</GlassButton>
                  <GlassButton size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>Keep it</GlassButton>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex w-5 shrink-0 items-center justify-center">
                  <MapPin size={18} strokeWidth={1.75} className="text-brand-ink/45" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-brand-green-deep">
                    {a.label}
                    {a.is_default && (
                      <span className="rounded-full bg-brand-green-mist px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand-green-deep">
                        Default
                      </span>
                    )}
                  </p>
                  <p className="mt-0.5 break-words text-sm text-brand-ink/70">{a.line1}</p>
                  {a.landmark && <p className="text-xs text-brand-ink/50">Near {a.landmark}</p>}
                  <p className="text-xs text-brand-ink/40">{a.city}</p>

                  <div className="mt-2 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setDraft({
                        id: a.id,
                        label: a.label,
                        line1: a.line1,
                        landmark: a.landmark ?? '',
                        city: a.city,
                      })}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-brand-green/15 px-3 text-xs font-medium text-brand-green-deep hover:bg-brand-green-mist"
                    >
                      <Pencil size={13} strokeWidth={2} /> Edit
                    </button>
                    {!a.is_default && (
                      <button
                        type="button"
                        onClick={() => makeDefault(a.id)}
                        className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-brand-green/15 px-3 text-xs font-medium text-brand-green-deep hover:bg-brand-green-mist"
                      >
                        <Check size={13} strokeWidth={2} /> Make default
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(a.id)}
                      className="flex min-h-[36px] items-center gap-1.5 rounded-xl border border-brand-red/20 px-3 text-xs font-medium text-brand-red hover:bg-brand-red/10"
                    >
                      <Trash2 size={13} strokeWidth={2} /> Remove
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {draft ? (
        <form onSubmit={save} className="mt-4 flex flex-col gap-3 rounded-xl2 border border-brand-green/15 p-3">
          <p className="text-sm font-semibold text-brand-green-deep">
            {draft.id ? 'Edit address' : 'New address'}
          </p>
          <Input
            label="Name for it"
            placeholder="Home, Work, Mum's place"
            value={draft.label}
            onChange={(e) => setDraft({ ...draft, label: e.target.value })}
          />
          <Input
            label="Address"
            placeholder="Plot and street, or how you would describe it"
            value={draft.line1}
            onChange={(e) => setDraft({ ...draft, line1: e.target.value })}
            required
          />
          <Input
            label="Landmark (optional)"
            placeholder="The shop, school or junction nearby"
            value={draft.landmark}
            onChange={(e) => setDraft({ ...draft, landmark: e.target.value })}
          />
          <Input
            label="Town"
            value={draft.city}
            onChange={(e) => setDraft({ ...draft, city: e.target.value })}
          />
          <div className="flex gap-2">
            <GlassButton type="submit" size="sm" disabled={saving || draft.line1.trim().length < 3}>
              {saving ? 'Saving…' : 'Save address'}
            </GlassButton>
            <GlassButton type="button" size="sm" variant="ghost" onClick={() => setDraft(null)}>
              <X size={14} strokeWidth={2} /> Cancel
            </GlassButton>
          </div>
        </form>
      ) : (
        <GlassButton
          type="button"
          size="sm"
          variant="secondary"
          className="mt-4"
          onClick={() => setDraft(EMPTY)}
        >
          <Plus size={15} strokeWidth={2} /> Add an address
        </GlassButton>
      )}
    </div>
  );
}
