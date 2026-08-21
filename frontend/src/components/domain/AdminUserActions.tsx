import { useState } from 'react';
import { KeyRound, ShieldOff, ShieldCheck, UserCog } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassButton } from '../ui/GlassButton';
import { useToast } from '../ui/Toast';

interface AdminUserActionsProps {
  userId: string;
  name: string;
  role: string;
  isActive: boolean;
  onChanged: () => void;
}

/**
 * The moderation controls, on a person's detail page rather than in a list.
 *
 * Deliberately here and not in the tables: suspending someone or resetting
 * their password should require having looked at their account first, not be
 * a button you can hit by mistake while scanning rows.
 */
export function AdminUserActions({ userId, name, role, isActive, onChanged }: AdminUserActionsProps) {
  const { push } = useToast();
  const [busy, setBusy] = useState(false);
  const [temporary, setTemporary] = useState<string | null>(null);

  async function run(label: string, fn: () => Promise<unknown>) {
    setBusy(true);
    try {
      await fn();
      push(label, 'success');
      onChanged();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  function suspend() {
    const reason = window.prompt(`Why is ${name} being suspended?\n\nThey will be told this, so write it for them to read.`);
    if (!reason?.trim()) return;
    run(`${name} suspended`, () => api.post(`/admin/users/${userId}/suspend`, { reason: reason.trim() }));
  }

  function reactivate() {
    if (!window.confirm(`Let ${name} sign in again?`)) return;
    run(`${name} reinstated`, () => api.post(`/admin/users/${userId}/reactivate`));
  }

  async function resetPassword() {
    if (!window.confirm(`Reset ${name}'s password?\n\nTheir current one stops working immediately, and you will get a temporary one to pass on.`)) return;
    setBusy(true);
    try {
      const res = await api.post(`/admin/users/${userId}/reset-password`);
      // Held on screen rather than toasted: this is shown once and they have
      // to be able to read it out or copy it.
      setTemporary(res.data.temporaryPassword);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(false);
    }
  }

  function changeRole(next: string) {
    if (!window.confirm(`Make ${name} ${next === 'admin' ? 'an admin' : `a ${next}`}?`)) return;
    run(`${name} is now ${next}`, () => api.post(`/admin/users/${userId}/role`, { role: next }));
  }

  function revoke() {
    const reason = window.prompt(`Why is ${name}'s verification being withdrawn?`);
    if (!reason?.trim()) return;
    run('Verification withdrawn', () =>
      api.post(`/admin/shoppers/${userId}/revoke-verification`, { reason: reason.trim() }));
  }

  return (
    <div className="rounded-xl2 border border-brand-red/20 bg-brand-red/5 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red/70">Admin actions</p>
      <p className="mt-1 text-xs text-brand-ink/50">
        Every one of these is recorded against your name in the audit log.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {isActive ? (
          <GlassButton size="sm" variant="danger" disabled={busy} onClick={suspend}>
            <ShieldOff size={14} strokeWidth={2} /> Suspend
          </GlassButton>
        ) : (
          <GlassButton size="sm" disabled={busy} onClick={reactivate}>
            <ShieldCheck size={14} strokeWidth={2} /> Reinstate
          </GlassButton>
        )}

        <GlassButton size="sm" variant="secondary" disabled={busy} onClick={resetPassword}>
          <KeyRound size={14} strokeWidth={2} /> Reset password
        </GlassButton>

        {role === 'shopper' && (
          <GlassButton size="sm" variant="secondary" disabled={busy} onClick={revoke}>
            <ShieldOff size={14} strokeWidth={2} /> Withdraw verification
          </GlassButton>
        )}

        {role !== 'admin' && (
          <GlassButton size="sm" variant="secondary" disabled={busy} onClick={() => changeRole('admin')}>
            <UserCog size={14} strokeWidth={2} /> Make admin
          </GlassButton>
        )}
      </div>

      {temporary && (
        <div className="mt-4 rounded-xl bg-brand-white/80 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/45">
            Temporary password — shown once
          </p>
          <p className="mt-1 select-all font-mono text-lg font-semibold text-brand-green-deep">{temporary}</p>
          <p className="mt-1 text-xs text-brand-ink/50">
            Give this to {name} directly. They will be asked to change it.
          </p>
          <button
            type="button"
            onClick={() => setTemporary(null)}
            className="mt-2 text-xs font-medium text-brand-ink/50 hover:text-brand-green-deep"
          >
            I have passed it on — hide it
          </button>
        </div>
      )}
    </div>
  );
}
