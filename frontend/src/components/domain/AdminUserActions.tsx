import { useState } from 'react';
import { KeyRound, ShieldOff, ShieldCheck, UserCog } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useToast } from '../ui/Toast';

interface AdminUserActionsProps {
  userId: string;
  name: string;
  role: string;
  isActive: boolean;
  onChanged: () => void;
}

type Action = 'suspend' | 'reactivate' | 'reset' | 'role' | 'revoke';

export function AdminUserActions({ userId, name, role, isActive, onChanged }: AdminUserActionsProps) {
  const { push } = useToast();
  const [busy, setBusy] = useState<Action | null>(null);
  const [temporary, setTemporary] = useState<string | null>(null);

  async function run(action: Action, label: string, fn: () => Promise<unknown>) {
    setBusy(action);
    try {
      await fn();
      push(label, 'success');
      onChanged();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  function suspend() {
    const reason = window.prompt(`Why is ${name} being suspended?\n\nThey will be told this, so write it for them to read.`);
    if (!reason?.trim()) return;
    run('suspend', `${name} suspended`, () => api.post(`/admin/users/${userId}/suspend`, { reason: reason.trim() }));
  }

  function reactivate() {
    if (!window.confirm(`Let ${name} sign in again?`)) return;
    run('reactivate', `${name} reinstated`, () => api.post(`/admin/users/${userId}/reactivate`));
  }

  async function resetPassword() {
    if (!window.confirm(`Reset ${name}'s password?\n\nTheir current one stops working immediately, and you will get a temporary one to pass on.`)) return;
    setBusy('reset');
    try {
      const res = await api.post(`/admin/users/${userId}/reset-password`);

      setTemporary(res.data.temporaryPassword);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setBusy(null);
    }
  }

  function changeRole(next: string) {
    if (!window.confirm(`Make ${name} ${next === 'admin' ? 'an admin' : `a ${next}`}?`)) return;
    run('role', `${name} is now ${next}`, () => api.post(`/admin/users/${userId}/role`, { role: next }));
  }

  function revoke() {
    const reason = window.prompt(`Why is ${name}'s verification being withdrawn?`);
    if (!reason?.trim()) return;
    run('revoke', 'Verification withdrawn', () =>
      api.post(`/admin/shoppers/${userId}/revoke-verification`, { reason: reason.trim() }));
  }

  const anyBusy = busy !== null;

  return (
    <Card padding="lg" hover={false} tone="danger">
      <h2 className="font-display text-h3 font-medium text-brand-green-deep">Admin actions</h2>
      <p className="mt-1 text-small text-ink-2">
        Every one of these is recorded against your name in the audit log.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {isActive ? (
          <Button size="sm" variant="destructive" loading={busy === 'suspend'} disabled={anyBusy} onClick={suspend}>
            <ShieldOff size={16} strokeWidth={2} /> Suspend
          </Button>
        ) : (
          <Button size="sm" loading={busy === 'reactivate'} disabled={anyBusy} onClick={reactivate}>
            <ShieldCheck size={16} strokeWidth={2} /> Reinstate
          </Button>
        )}

        <Button size="sm" variant="secondary" loading={busy === 'reset'} disabled={anyBusy} onClick={resetPassword}>
          <KeyRound size={16} strokeWidth={2} /> Reset password
        </Button>

        {role === 'shopper' && (
          <Button size="sm" variant="secondary" loading={busy === 'revoke'} disabled={anyBusy} onClick={revoke}>
            <ShieldOff size={16} strokeWidth={2} /> Withdraw verification
          </Button>
        )}

        {role !== 'admin' && (
          <Button size="sm" variant="secondary" loading={busy === 'role'} disabled={anyBusy} onClick={() => changeRole('admin')}>
            <UserCog size={16} strokeWidth={2} /> Make admin
          </Button>
        )}
      </div>

      {temporary && (
        <div className="mt-5 rounded-xl border border-line bg-surface-2 p-4">
          <p className="text-label font-semibold uppercase text-ink-3">
            Temporary password — shown once
          </p>
          <p className="mt-1.5 select-all font-mono text-h3 font-semibold text-brand-green-deep">{temporary}</p>
          <p className="mt-1.5 text-caption text-ink-2">
            Give this to {name} directly. They will be asked to change it.
          </p>
          <Button variant="tertiary" size="sm" className="-ml-3.5 mt-2" onClick={() => setTemporary(null)}>
            I have passed it on — hide it
          </Button>
        </div>
      )}
    </Card>
  );
}
