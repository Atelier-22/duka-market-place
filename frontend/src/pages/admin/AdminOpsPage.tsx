import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, Megaphone, MapPin, Plus, ScrollText } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { LoadingState } from '../../components/ui/LoadingState';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from './AdminDetailShell';

type Tab = 'announce' | 'places' | 'audit';

const AUDIENCES = [
  { value: 'all', label: 'Everyone' },
  { value: 'customers', label: 'Customers' },
  { value: 'shoppers', label: 'Shoppers' },
] as const;

/**
 * The three operational tools that are not about one person or one order:
 * telling everybody something, curating the markets people can shop in, and
 * reading back what admins have done.
 */
export function AdminOpsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('announce');

  const [audience, setAudience] = useState<'all' | 'customers' | 'shoppers'>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const [locations, setLocations] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('Kampala');
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get('/admin/locations').then((r) => setLocations(r.data.locations)),
      api.get('/admin/audit?limit=150').then((r) => setEntries(r.data.entries)),
    ]).finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  async function send() {
    if (!title.trim()) return;
    if (!window.confirm(`Send "${title.trim()}" to ${AUDIENCES.find((a) => a.value === audience)?.label.toLowerCase()}?`)) return;
    setSending(true);
    try {
      const res = await api.post('/admin/broadcast', {
        audience, title: title.trim(), body: body.trim() || undefined,
      });
      push(`Sent to ${res.data.reached} ${res.data.reached === 1 ? 'person' : 'people'}`, 'success');
      setTitle('');
      setBody('');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  }

  async function addLocation() {
    if (!newName.trim()) return;
    try {
      await api.post('/admin/locations', { name: newName.trim(), city: newCity.trim() || 'Kampala' });
      setNewName('');
      push('Place added', 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  async function toggle(id: string) {
    try {
      await api.post(`/admin/locations/${id}/toggle`);
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    }
  }

  if (loading) return <LoadingState label="Loading operations…" />;

  const TABS: { id: Tab; label: string; icon: typeof Megaphone }[] = [
    { id: 'announce', label: 'Announce', icon: Megaphone },
    { id: 'places', label: 'Places', icon: MapPin },
    { id: 'audit', label: 'Audit log', icon: ScrollText },
  ];

  return (
    <div className="pb-10">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Operations</h1>

      <div className="mt-5 flex gap-1 rounded-full border border-brand-green/15 p-1">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                tab === t.id ? 'bg-brand-green text-white' : 'text-brand-ink/55 hover:bg-brand-green-mist'
              }`}
            >
              <Icon size={15} strokeWidth={1.9} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'announce' && (
        <GlassCard padding="lg" hover={false} className="mt-5 max-w-2xl">
          <p className="text-sm text-brand-ink/60">
            Goes to everyone in the audience who has not turned announcements off, and who is not
            suspended. It lands in their notification bell.
          </p>

          <div className="mt-4 flex gap-1 rounded-full border border-brand-green/15 p-1">
            {AUDIENCES.map((a) => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAudience(a.value)}
                className={`flex-1 rounded-full px-3 py-2 text-sm font-medium transition-colors ${
                  audience === a.value ? 'bg-brand-green-mist text-brand-green-deep' : 'text-brand-ink/55'
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3">
            <Input label="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea label="Message (optional)" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <div>
              <GlassButton disabled={sending || !title.trim()} onClick={send}>
                <Megaphone size={15} strokeWidth={2} /> {sending ? 'Sending…' : 'Send announcement'}
              </GlassButton>
            </div>
          </div>
        </GlassCard>
      )}

      {tab === 'places' && (
        <>
          <GlassCard padding="lg" hover={false} className="mt-5 max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">Add a market or shop</p>
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
              <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input label="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
              <GlassButton disabled={!newName.trim()} onClick={addLocation}>
                <Plus size={15} strokeWidth={2} /> Add
              </GlassButton>
            </div>
          </GlassCard>

          <GlassCard padding="sm" hover={false} className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-green/10 text-left text-xs uppercase tracking-wide text-brand-ink/40">
                  <th className="px-3 py-3">Place</th>
                  <th className="px-3 py-3">City</th>
                  <th className="px-3 py-3">Requests</th>
                  <th className="px-3 py-3" />
                </tr>
              </thead>
              <tbody>
                {locations.map((l) => (
                  <tr key={l.id} className="border-b border-brand-green/5 last:border-0">
                    <td className="px-3 py-3">
                      <span className={l.is_active ? 'font-medium text-brand-ink' : 'text-brand-ink/40 line-through'}>
                        {l.name}
                      </span>
                      <span className="ml-2 text-xs capitalize text-brand-ink/40">{l.type}</span>
                    </td>
                    <td className="px-3 py-3 text-brand-ink/60">{l.city}</td>
                    <td className="px-3 py-3 text-brand-ink/60">{l.request_count}</td>
                    <td className="px-3 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => toggle(l.id)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/15 px-3 py-1.5 text-xs font-medium text-brand-ink/60 hover:bg-brand-green-mist"
                      >
                        {l.is_active
                          ? <><EyeOff size={13} strokeWidth={2} /> Hide</>
                          : <><Eye size={13} strokeWidth={2} /> Show</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </GlassCard>
        </>
      )}

      {tab === 'audit' && (
        <GlassCard padding="sm" hover={false} className="mt-5">
          {entries.length === 0 ? (
            <p className="px-3 py-10 text-center text-sm text-brand-ink/40">Nothing has been done yet.</p>
          ) : (
            <div className="flex flex-col">
              {entries.map((e) => (
                <div key={e.id} className="flex items-start gap-3 border-b border-brand-green/5 px-3 py-3 last:border-0">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green/40" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-brand-ink/80">{e.summary}</p>
                    <p className="mt-0.5 text-xs text-brand-ink/40">
                      {e.admin_name} · {e.action} · {formatDate(e.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
