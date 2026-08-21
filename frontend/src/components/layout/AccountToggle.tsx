import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';

const HOME_FOR: Record<UserRole, string> = {
  customer: '/app',
  shopper: '/shopper',
  // Never linked from here — see the admin filter below.
  admin: '/app',
};

const LABEL_FOR: Record<UserRole, string> = {
  customer: 'Customer',
  shopper: 'Shopper',
  admin: 'Admin',
};

/**
 * Shown only when this session proved ownership of a separate account under
 * another role at login. Switching re-issues tokens for that account and drops
 * the user on its dashboard — no logout, no password re-entry.
 */
export function AccountToggle() {
  const { user, linkedAccounts, switchAccount } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // An admin account is never surfaced here. This widget lives in the customer
  // and shopper sidebars, and showing an "Admin" row there would advertise the
  // panel's existence to anyone looking over the user's shoulder.
  const switchable = linkedAccounts.filter((a) => a.role !== 'admin');

  if (!user || switchable.length === 0) return null;

  async function handleSwitch(accountId: string) {
    setError(null);
    setBusy(accountId);
    try {
      const role = await switchAccount(accountId);
      navigate(HOME_FOR[role] ?? '/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch account');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-4 rounded-xl bg-brand-green-mist/60 p-3">
      <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-brand-ink/40">
        Switch account
      </p>

      <div className="mt-2 flex flex-col gap-1">
        <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 shadow-glass">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green" />
          <span className="text-sm font-semibold text-brand-green-deep">{LABEL_FOR[user.role]}</span>
          <span className="ml-auto text-[11px] text-brand-ink/40">Current</span>
        </div>

        {switchable.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => handleSwitch(account.id)}
            disabled={busy !== null}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium text-brand-ink/65 transition-colors hover:bg-white hover:text-brand-green-deep disabled:opacity-50"
          >
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-ink/20" />
            {LABEL_FOR[account.role]}
            <span className="ml-auto text-[11px] text-brand-ink/40">
              {busy === account.id ? (
                'Switching…'
              ) : (
                <ArrowLeftRight size={14} strokeWidth={1.75} />
              )}
            </span>
          </button>
        ))}
      </div>

      {error && <p className="mt-2 px-1 text-xs font-medium text-brand-red">{error}</p>}
    </div>
  );
}
