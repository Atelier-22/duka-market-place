import { FormEvent, ReactNode, useEffect, useState } from 'react';
import { MapPin, Pencil, Plus, Trash2, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Address } from '../../types';
import { Button } from '../ui/Button';
import { EmptyState } from '../ui/EmptyState';
import { Input } from '../ui/Input';
import { Bone, SkeletonRegion } from '../ui/Skeleton';
import { useToast } from '../ui/Toast';

interface Draft {
  id: string | null;
  label: string;
  line1: string;
  landmark: string;
  city: string;
}

const EMPTY: Draft = { id: null, label: 'Home', line1: '', landmark: '', city: 'Kampala' };

function IconButton({
  label, onClick, tone = 'default', children,
}: { label: string; onClick: () => void; tone?: 'default' | 'danger'; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={[
        'flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink-3',
        'transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-focus',
        tone === 'danger'
          ? 'hover:bg-danger-soft/50 hover:text-brand-red'
          : 'hover:bg-brand-green-mist hover:text-brand-green-deep',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

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
      <SkeletonRegion label="Loading addresses" className="flex flex-col gap-2">
        {[0, 1].map((i) => (
          <Bone key={i} className="h-20 w-full rounded-xl" />
        ))}
      </SkeletonRegion>
    );
  }

  const addButton = (
    <Button type="button" size="sm" variant="secondary" onClick={() => setDraft(EMPTY)}>
      <Plus size={15} strokeWidth={2} /> Add an address
    </Button>
  );

  return (
    <div>
      {addresses.length === 0 && !draft && (
        <EmptyState
          size="sm"
          icon={<MapPin strokeWidth={1.75} />}
          title="No saved addresses yet"
          description="Add one here and it will be ready the next time you order."
          action={addButton}
        />
      )}

      {addresses.length > 0 && (
        <ul className="overflow-hidden rounded-xl border border-line bg-surface">
          {addresses.map((a) => (
            <li key={a.id} className="border-b border-line last:border-0">
              {confirmDelete === a.id ? (
                <div className="px-4 py-3">
                  <p className="text-body font-medium text-ink">Remove this address?</p>
                  <p className="mt-1 text-caption text-ink-3">
                    It disappears from your list and from the order form. Orders already delivered
                    here keep showing it.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" variant="destructive" onClick={() => remove(a.id)}>Remove</Button>
                    <Button size="sm" variant="tertiary" onClick={() => setConfirmDelete(null)}>Keep it</Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green">
                    <MapPin size={17} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-body font-medium text-ink">
                      {a.label}
                      {a.is_default && (
                        <span className="rounded-full bg-brand-green-mist px-2 py-0.5 text-caption font-semibold text-brand-green-deep">
                          Default
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 break-words text-small text-ink-2">{a.line1}</p>
                    <p className="text-caption text-ink-3">
                      {a.landmark ? `Near ${a.landmark} · ` : ''}{a.city}
                    </p>
                    {!a.is_default && (
                      <Button variant="link" onClick={() => makeDefault(a.id)} className="mt-1.5">
                        Make default
                      </Button>
                    )}
                  </div>
                  <div className="-mr-2 flex shrink-0 items-center">
                    <IconButton
                      label={`Edit ${a.label}`}
                      onClick={() => setDraft({
                        id: a.id,
                        label: a.label,
                        line1: a.line1,
                        landmark: a.landmark ?? '',
                        city: a.city,
                      })}
                    >
                      <Pencil size={16} strokeWidth={2} />
                    </IconButton>
                    <IconButton label={`Remove ${a.label}`} tone="danger" onClick={() => setConfirmDelete(a.id)}>
                      <Trash2 size={16} strokeWidth={2} />
                    </IconButton>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {draft ? (
        <form onSubmit={save} className="mt-4 flex flex-col gap-3 rounded-xl border border-line p-4">
          <h3 className="font-display text-h3 font-medium text-brand-green-deep">
            {draft.id ? 'Edit address' : 'New address'}
          </h3>
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
          <div className="flex flex-wrap gap-2">
            <Button type="submit" size="sm" loading={saving} disabled={draft.line1.trim().length < 3}>
              {saving ? 'Saving…' : 'Save address'}
            </Button>
            <Button type="button" size="sm" variant="tertiary" onClick={() => setDraft(null)}>
              <X size={14} strokeWidth={2} /> Cancel
            </Button>
          </div>
        </form>
      ) : (
        addresses.length > 0 && <div className="mt-4">{addButton}</div>
      )}
    </div>
  );
}
