import { useCallback, useEffect, useState } from 'react';
import {
  KeyRound, Plus, ShieldCheck, ShieldOff, Trash2, UserCog,
} from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { LoadingState } from '../../components/ui/LoadingState';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from './AdminDetailShell';

function Capacity({ label, used, limit }: { label: string; used: number; limit: number }) {
  const full = used >= limit;
  return (
    <GlassCard padding="sm" hover={false}>
      <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">{label}</p>
      <p className={`mt-1 font-display text-xl font-medium ${full ? 'text-brand-red' : 'text-brand-green-deep'}`}>
        {used} <span className="text-sm font-normal text-brand-ink/40">of {limit}</span>
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-ink/10">
        <div
          className={`h-full rounded-full ${full ? 'bg-brand-red' : 'bg-brand-green-fresh'}`}
          style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
        />
      </div>
    </GlassCard>
  );
}

/**
 * Staff management, visible only to a super admin.
 *
 * Every account here can suspend people and move money, so the page leads with
 * how many places are left rather than hiding it behind a failed attempt — the
 * cap on admins is shared between the super admins, and you should be able to
 * see the pool before you try to draw from it.
 */
export function AdminStaffPage() {
  const { push } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [temporary, setTemporary] = useState<{ name: string; password: string } | null>(null);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [makeSuper, setMakeSuper] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    api.get('/admin/staff')
      .then((r) => setData(r.data))
      .catch((err) => push(apiErrorMessage(err), 'error'))
      .finally(() => setLoading(false));
  }, [push]);
  useEffect(load, [load]);

  async function create() {
    if (!name.trim() || !phone.trim()) return;
    setBusy('create');
    try {
      const res = await api.post('/admin/staff', {
        role: makeSuper ? 'super_admin' : 'admin',
        fullName: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
      });
      setTemporary({ name: name.trim(), password: res.data.temporaryPassword });
      setName(''); setPhone(''); setEmail(''); setMakeSuper(false);
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  async function act(id: string, label: string, fn: () => Promise<unknown>) {
    setBusy(id);
    try {
      await fn();
      push(label, 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  function suspend(s: any) {
    const reason = window.prompt(`Why is ${s.full_name} being suspended?`);
    if (!reason?.trim()) return;
    act(s.id, `${s.full_name} suspended`, () =>
      api.post(`/admin/staff/${s.id}/suspend`, { reason: reason.trim() }));
  }

  async function reset(s: any) {
    if (!window.confirm(`Reset ${s.full_name}'s password? Theirs stops working immediately.`)) return;
    setBusy(s.id);
    try {
      const res = await api.post(`/admin/staff/${s.id}/reset-password`);
      setTemporary({ name: s.full_name, password: res.data.temporaryPassword });
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  function remove(s: any) {
    if (!window.confirm(`Remove ${s.full_name} completely?\n\nThis frees their place. What they did stays in the audit log.`)) return;
    act(s.id, `${s.full_name} removed`, () => api.delete(`/admin/staff/${s.id}`));
  }

  if (loading && !data) return <LoadingState label="Loading staff…" />;
  if (!data) return null;

  const { staff, capacity, me } = data;
  const adminsFull = capacity.admins.remaining === 0;
  const supersFull = capacity.superAdmins.remaining === 0;

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Admins</h1>
      <p className="mt-1 text-sm text-brand-ink/50">
        Only a super admin can see this page. Admins cannot list it, add to it, or tell it exists.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:max-w-md">
        <Capacity label="Admins" used={capacity.admins.used} limit={capacity.admins.limit} />
        <Capacity label="Super admins" used={capacity.superAdmins.used} limit={capacity.superAdmins.limit} />
      </div>
      <p className="mt-2 text-xs text-brand-ink/45">
        The {capacity.admins.limit} admin places are shared between both super admins, not one set each.
        Removing an admin frees a place.
      </p>

      {temporary && (
        <GlassCard padding="lg" hover={false} glow="yellow" className="mt-5 max-w-md">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/45">
            Temporary password for {temporary.name} — shown once
          </p>
          <p className="mt-2 select-all font-mono text-xl font-semibold text-brand-green-deep">
            {temporary.password}
          </p>
          <p className="mt-2 text-xs text-brand-ink/55">
            Give it to them directly. They must change it on first sign-in.
          </p>
          <button
            type="button"
            onClick={() => setTemporary(null)}
            className="mt-3 text-xs font-medium text-brand-ink/50 hover:text-brand-green-deep"
          >
            I have passed it on — hide it
          </button>
        </GlassCard>
      )}

      <GlassCard padding="lg" hover={false} className="mt-5 max-w-2xl">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Create a staff account</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Phone (they sign in with this)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm text-brand-ink/70">
          <input
            type="checkbox"
            checked={makeSuper}
            disabled={supersFull}
            onChange={(e) => setMakeSuper(e.target.checked)}
            className="h-4 w-4 rounded border-brand-green/30"
          />
          Make this a super admin
          {supersFull && <span className="text-xs text-brand-ink/40">— both places are taken</span>}
        </label>
        <div className="mt-4">
          <GlassButton
            disabled={busy === 'create' || !name.trim() || !phone.trim() || (adminsFull && !makeSuper)}
            onClick={create}
          >
            <Plus size={15} strokeWidth={2} />
            {busy === 'create' ? 'Creating…' : 'Create account'}
          </GlassButton>
          {adminsFull && !makeSuper && (
            <p className="mt-2 text-xs font-medium text-brand-red">
              All {capacity.admins.limit} admin places are taken. Remove one to free a place.
            </p>
          )}
        </div>
      </GlassCard>

      <GlassCard padding="sm" hover={false} className="mt-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-green/10 text-left text-xs uppercase tracking-wide text-brand-ink/40">
              <th className="px-3 py-3">Who</th>
              <th className="px-3 py-3">Role</th>
              <th className="px-3 py-3">Last signed in</th>
              <th className="px-3 py-3">Actions taken</th>
              <th className="px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {staff.map((s: any) => (
              <tr key={s.id} className="border-b border-brand-green/5 last:border-0">
                <td className="px-3 py-3">
                  <span className="font-medium text-brand-ink">
                    {s.full_name}
                    {s.id === me && <span className="ml-2 text-xs text-brand-ink/40">you</span>}
                  </span>
                  <span className="block text-xs text-brand-ink/40">{s.phone}</span>
                  {!s.is_active && (
                    <span className="mt-1 inline-block rounded-full bg-brand-red/10 px-2 py-0.5 text-[11px] font-semibold text-brand-red">
                      Suspended{s.suspended_reason ? ` · ${s.suspended_reason}` : ''}
                    </span>
                  )}
                  {s.created_by_name && (
                    <span className="block text-[11px] text-brand-ink/35">added by {s.created_by_name}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                    s.role === 'super_admin'
                      ? 'bg-brand-yellow-soft text-yellow-800'
                      : 'bg-brand-green-mist text-brand-green-deep'
                  }`}>
                    <UserCog size={12} strokeWidth={2} />
                    {s.role === 'super_admin' ? 'Super admin' : 'Admin'}
                  </span>
                </td>
                <td className="px-3 py-3 text-xs text-brand-ink/50">
                  {s.last_login_at ? formatDate(s.last_login_at) : 'Never'}
                </td>
                <td className="px-3 py-3">
                  <span className="text-brand-ink/70">{s.actions}</span>
                  {s.last_action_at && (
                    <span className="block text-[11px] text-brand-ink/35">last {formatDate(s.last_action_at)}</span>
                  )}
                </td>
                <td className="px-3 py-3">
                  {s.id !== me && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {s.is_active ? (
                        <button
                          type="button" disabled={busy === s.id} onClick={() => suspend(s)}
                          className="inline-flex items-center gap-1 rounded-full border border-brand-green/15 px-2.5 py-1.5 text-xs font-medium text-brand-ink/60 hover:bg-brand-green-mist disabled:opacity-50"
                        >
                          <ShieldOff size={12} strokeWidth={2} /> Suspend
                        </button>
                      ) : (
                        <button
                          type="button" disabled={busy === s.id}
                          onClick={() => act(s.id, `${s.full_name} reinstated`, () => api.post(`/admin/staff/${s.id}/reactivate`))}
                          className="inline-flex items-center gap-1 rounded-full border border-brand-green/15 px-2.5 py-1.5 text-xs font-medium text-brand-green-deep hover:bg-brand-green-mist disabled:opacity-50"
                        >
                          <ShieldCheck size={12} strokeWidth={2} /> Reinstate
                        </button>
                      )}
                      <button
                        type="button" disabled={busy === s.id} onClick={() => reset(s)}
                        className="inline-flex items-center gap-1 rounded-full border border-brand-green/15 px-2.5 py-1.5 text-xs font-medium text-brand-ink/60 hover:bg-brand-green-mist disabled:opacity-50"
                      >
                        <KeyRound size={12} strokeWidth={2} /> Reset
                      </button>
                      <button
                        type="button" disabled={busy === s.id} onClick={() => remove(s)}
                        className="inline-flex items-center gap-1 rounded-full border border-brand-red/25 px-2.5 py-1.5 text-xs font-medium text-brand-red hover:bg-brand-red/10 disabled:opacity-50"
                      >
                        <Trash2 size={12} strokeWidth={2} /> Remove
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </GlassCard>
    </div>
  );
}
