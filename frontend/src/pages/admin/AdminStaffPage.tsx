import { useCallback, useEffect, useState } from 'react';
import { KeyRound, Plus, ShieldCheck, ShieldOff, Trash2, UserCog } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonStats, SkeletonTable } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { AdminTable, Pill, StatTile, Td, Th, Tr, formatDate } from './AdminDetailShell';

function Capacity({ label, used, limit }: { label: string; used: number; limit: number }) {
  const full = used >= limit;
  return (
    <StatTile label={label} value={used} sub={`of ${limit}`} tone={full ? 'danger' : 'default'}>
      <div
        className="mt-3 h-1.5 overflow-hidden rounded-full bg-line"
        role="progressbar"
        aria-label={`${label} used`}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={used}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-200 ease-standard ${full ? 'bg-brand-red' : 'bg-brand-green-fresh'}`}
          style={{ width: `${Math.min(100, (used / limit) * 100)}%` }}
        />
      </div>
    </StatTile>
  );
}

export function AdminStaffPage() {
  const { push } = useToast();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  /** 'create' or `${staffId}:${action}` while a request is in flight. */
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

  async function act(key: string, label: string, fn: () => Promise<unknown>) {
    setBusy(key);
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
    act(`${s.id}:suspend`, `${s.full_name} suspended`, () =>
      api.post(`/admin/staff/${s.id}/suspend`, { reason: reason.trim() }));
  }

  async function reset(s: any) {
    if (!window.confirm(`Reset ${s.full_name}'s password? Theirs stops working immediately.`)) return;
    setBusy(`${s.id}:reset`);
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
    act(`${s.id}:remove`, `${s.full_name} removed`, () => api.delete(`/admin/staff/${s.id}`));
  }

  if (loading && !data) {
    return (
      <SkeletonRegion label="Loading" className="pb-10">
        <SkeletonHeading />
        <div className="mt-6"><SkeletonStats count={2} /></div>
        <div className="mt-6"><SkeletonTable rows={5} cols={5} /></div>
      </SkeletonRegion>
    );
  }
  if (!data) {
    return (
      <div className="pb-10">
        <PageHeader title="Admins" />
        <EmptyState
          title="Could not load this page"
          description="Check your connection and try again."
          action={<Button variant="secondary" onClick={load}>Try again</Button>}
        />
      </div>
    );
  }

  const { staff, capacity, me } = data;
  const adminsFull = capacity.admins.remaining === 0;
  const supersFull = capacity.superAdmins.remaining === 0;

  return (
    <div className="pb-10">
      <PageHeader
        title="Admins"
        subtitle="Only a super admin can see this page. Admins cannot list it, add to it, or tell it exists."
      />

      <div className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Capacity label="Admins" used={capacity.admins.used} limit={capacity.admins.limit} />
        <Capacity label="Super admins" used={capacity.superAdmins.used} limit={capacity.superAdmins.limit} />
      </div>
      <p className="mt-3 text-caption text-ink-3">
        The {capacity.admins.limit} admin places are shared between both super admins, not one set each.
        Removing an admin frees a place.
      </p>

      {temporary && (
        <Card padding="lg" hover={false} tone="warning" className="mt-6 max-w-md">
          <p className="text-label font-semibold uppercase text-ink-3">
            Temporary password for {temporary.name} — shown once
          </p>
          <p className="mt-2 select-all font-mono text-h2 font-semibold text-brand-green-deep">
            {temporary.password}
          </p>
          <p className="mt-2 text-small text-ink-2">
            Give it to them directly. They must change it on first sign-in.
          </p>
          <Button variant="tertiary" size="sm" className="-ml-3.5 mt-3" onClick={() => setTemporary(null)}>
            I have passed it on — hide it
          </Button>
        </Card>
      )}

      <Card padding="lg" hover={false} className="mt-6 max-w-3xl">
        <h2 className="font-display text-h3 font-medium text-brand-green-deep">Create a staff account</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Input label="Full name" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Phone (they sign in with this)" value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Input label="Email (optional)" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <label className="mt-4 flex min-h-[44px] items-center gap-2.5 text-sm text-ink">
          <input
            type="checkbox"
            checked={makeSuper}
            disabled={supersFull}
            onChange={(e) => setMakeSuper(e.target.checked)}
            className="h-4 w-4 rounded border-line-strong accent-brand-green"
          />
          Make this a super admin
          {supersFull && <span className="text-caption text-ink-3">— both places are taken</span>}
        </label>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button
            loading={busy === 'create'}
            disabled={!name.trim() || !phone.trim() || (adminsFull && !makeSuper)}
            onClick={create}
          >
            <Plus size={16} strokeWidth={2} /> Create account
          </Button>
          {adminsFull && !makeSuper && (
            <p role="alert" className="text-caption font-medium text-brand-red">
              All {capacity.admins.limit} admin places are taken. Remove one to free a place.
            </p>
          )}
        </div>
      </Card>

      <div className="mt-6">
        <AdminTable
          caption="Staff accounts"
          minWidth="min-w-[760px]"
          head={
            <>
              <Th>Who</Th>
              <Th>Role</Th>
              <Th>Last signed in</Th>
              <Th align="right">Actions taken</Th>
              <Th align="right"><span className="sr-only">Manage</span></Th>
            </>
          }
        >
          {staff.map((s: any) => {
            const rowBusy = busy?.startsWith(`${s.id}:`) ?? false;
            return (
              <Tr key={s.id}>
                <Td>
                  <span className="font-medium">
                    {s.full_name}
                    {s.id === me && <span className="ml-2 text-caption font-normal text-ink-3">you</span>}
                  </span>
                  <span className="block text-caption text-ink-3">{s.phone}</span>
                  {!s.is_active && (
                    <Pill tone="danger" className="mt-1.5">
                      Suspended{s.suspended_reason ? ` · ${s.suspended_reason}` : ''}
                    </Pill>
                  )}
                  {s.created_by_name && (
                    <span className="block text-caption text-ink-3">added by {s.created_by_name}</span>
                  )}
                </Td>
                <Td>
                  <Pill tone={s.role === 'super_admin' ? 'warning' : 'brand'}>
                    <UserCog size={12} strokeWidth={2} />
                    {s.role === 'super_admin' ? 'Super admin' : 'Admin'}
                  </Pill>
                </Td>
                <Td muted className="whitespace-nowrap text-caption">
                  {s.last_login_at ? formatDate(s.last_login_at) : 'Never'}
                </Td>
                <Td numeric>
                  {s.actions}
                  {s.last_action_at && (
                    <span className="block text-caption font-normal text-ink-3">last {formatDate(s.last_action_at)}</span>
                  )}
                </Td>
                <Td align="right">
                  {s.id !== me && (
                    <div className="flex flex-wrap justify-end gap-1.5">
                      {s.is_active ? (
                        <Button
                          size="sm" variant="secondary"
                          loading={busy === `${s.id}:suspend`} disabled={rowBusy}
                          onClick={() => suspend(s)}
                        >
                          <ShieldOff size={14} strokeWidth={2} /> Suspend
                        </Button>
                      ) : (
                        <Button
                          size="sm" variant="secondary"
                          loading={busy === `${s.id}:reactivate`} disabled={rowBusy}
                          onClick={() => act(`${s.id}:reactivate`, `${s.full_name} reinstated`, () => api.post(`/admin/staff/${s.id}/reactivate`))}
                        >
                          <ShieldCheck size={14} strokeWidth={2} /> Reinstate
                        </Button>
                      )}
                      <Button
                        size="sm" variant="secondary"
                        loading={busy === `${s.id}:reset`} disabled={rowBusy}
                        onClick={() => reset(s)}
                      >
                        <KeyRound size={14} strokeWidth={2} /> Reset
                      </Button>
                      <Button
                        size="sm" variant="destructive"
                        loading={busy === `${s.id}:remove`} disabled={rowBusy}
                        onClick={() => remove(s)}
                      >
                        <Trash2 size={14} strokeWidth={2} /> Remove
                      </Button>
                    </div>
                  )}
                </Td>
              </Tr>
            );
          })}
        </AdminTable>
      </div>
    </div>
  );
}
