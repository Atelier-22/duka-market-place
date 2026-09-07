import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftRight } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types';
import { useBrandTransition } from '../ui/BrandTransition';

const HOME_FOR: Record<UserRole, string> = {
  customer: '/app',
  shopper: '/shopper',

  admin: '/app',
  super_admin: '/app',
};

const LABEL_FOR: Record<UserRole, string> = {
  customer: 'Customer',
  shopper: 'Shopper',
  admin: 'Admin',
  super_admin: 'Super admin',
};

export function AccountToggle() {
  const { user, linkedAccounts, switchAccount } = useAuth();
  const navigate = useNavigate();
  const { play } = useBrandTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const switchable = linkedAccounts.filter((a) => a.role !== 'admin');

  if (!user || switchable.length === 0) return null;

  async function handleSwitch(accountId: string) {
    setError(null);
    setBusy(accountId);
    const target = switchable.find((a) => a.id === accountId);
    try {
      await play({
        label: target ? `Switching to ${LABEL_FOR[target.role]}` : 'Switching account',
        task: async () => {
          const role = await switchAccount(accountId);
          navigate(HOME_FOR[role] ?? '/app');
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not switch account');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="surface-2 mt-4 rounded-xl p-3">
      <p className="px-1 text-label font-semibold uppercase text-ink-3">
        Switch account
      </p>

      <div className="mt-2 flex flex-col gap-1">
        <div className="surface flex min-h-[44px] items-center gap-2.5 rounded-lg px-3 py-2 shadow-card">
          <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-brand-green" />
          <span className="truncate text-small font-semibold text-brand-green-deep">{LABEL_FOR[user.role]}</span>
          <span className="ml-auto shrink-0 text-caption text-ink-3">Current</span>
        </div>

        {switchable.map((account) => (
          <button
            key={account.id}
            type="button"
            onClick={() => handleSwitch(account.id)}
            disabled={busy !== null}
            className={[
              'flex min-h-[44px] w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-small font-medium text-ink-2',
              'transition-colors duration-150 hover:bg-surface hover:text-brand-green-deep',
              'focus-visible:outline-none focus-visible:shadow-focus disabled:opacity-50',
            ].join(' ')}
          >
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-line-strong" />
            <span className="truncate">{LABEL_FOR[account.role]}</span>
            <span className="ml-auto flex shrink-0 items-center text-caption text-ink-3">
              {busy === account.id ? (
                'Switching…'
              ) : (
                <ArrowLeftRight size={14} strokeWidth={1.75} aria-hidden />
              )}
            </span>
          </button>
        ))}
      </div>

      {error && <p role="alert" className="mt-2 px-1 text-caption font-medium text-brand-red">{error}</p>}
    </div>
  );
}
