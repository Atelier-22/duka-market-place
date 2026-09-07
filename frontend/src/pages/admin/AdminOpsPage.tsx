import { useCallback, useEffect, useState } from 'react';
import { Eye, EyeOff, MapPin, Megaphone, Plus, ScrollText } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input, labelClasses } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import { PageHeader } from '../../components/ui/PageHeader';
import { Tabs } from '../../components/ui/Tabs';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonHeading, SkeletonRegion, SkeletonRows } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { AdminTable, Td, Th, Tr, formatDate } from './AdminDetailShell';

type Tab = 'announce' | 'places' | 'audit';
type Audience = 'all' | 'customers' | 'shoppers';

const AUDIENCES: { value: Audience; label: string }[] = [
  { value: 'all', label: 'Everyone' },
  { value: 'customers', label: 'Customers' },
  { value: 'shoppers', label: 'Shoppers' },
];

export function AdminOpsPage() {
  const { push } = useToast();
  const [tab, setTab] = useState<Tab>('announce');

  const [audience, setAudience] = useState<Audience>('all');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  const [locations, setLocations] = useState<any[]>([]);
  const [newName, setNewName] = useState('');
  const [newCity, setNewCity] = useState('Kampala');
  const [adding, setAdding] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
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
    setAdding(true);
    try {
      await api.post('/admin/locations', { name: newName.trim(), city: newCity.trim() || 'Kampala' });
      setNewName('');
      push('Place added', 'success');
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setAdding(false);
    }
  }

  async function toggle(id: string) {
    setToggling(id);
    try {
      await api.post(`/admin/locations/${id}/toggle`);
      load();
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setToggling(null);
    }
  }

  if (loading) {
    return (
      <SkeletonRegion label="Loading" className="pb-10">
        <SkeletonHeading />
        <div className="mt-6"><SkeletonRows count={4} /></div>
      </SkeletonRegion>
    );
  }

  return (
    <div className="pb-10">
      <PageHeader
        title="Operations"
        subtitle="Announcements, the places shoppers can be sent to, and the audit log."
      />

      <Tabs
        ariaLabel="Operations"
        value={tab}
        onChange={setTab}
        className="mb-5"
        items={[
          { value: 'announce', label: 'Announce' },
          { value: 'places', label: 'Places', count: locations.length },
          { value: 'audit', label: 'Audit log', count: entries.length },
        ]}
      />

      {tab === 'announce' && (
        <Card padding="lg" hover={false} className="max-w-3xl">
          <h2 className="flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep">
            <Megaphone size={18} strokeWidth={1.75} className="text-brand-green" /> Send an announcement
          </h2>
          <p className="mt-1 text-small text-ink-2">
            Goes to everyone in the audience who has not turned announcements off, and who is not
            suspended. It lands in their notification bell.
          </p>

          <div className="mt-5 flex flex-col gap-4">
            <div>
              <p className={labelClasses}>Audience</p>
              <Tabs
                ariaLabel="Audience"
                value={audience}
                onChange={setAudience}
                items={AUDIENCES.map((a) => ({ value: a.value, label: a.label }))}
              />
            </div>
            <Input label="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
            <Textarea label="Message (optional)" rows={3} value={body} onChange={(e) => setBody(e.target.value)} />
            <div>
              <Button loading={sending} disabled={!title.trim()} onClick={send}>
                <Megaphone size={16} strokeWidth={2} /> Send announcement
              </Button>
            </div>
          </div>
        </Card>
      )}

      {tab === 'places' && (
        <div className="flex flex-col gap-5">
          <Card padding="lg" hover={false} className="max-w-3xl">
            <h2 className="flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep">
              <MapPin size={18} strokeWidth={1.75} className="text-brand-green" /> Add a market or shop
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Input label="Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
              <Input label="City" value={newCity} onChange={(e) => setNewCity(e.target.value)} />
              <Button loading={adding} disabled={!newName.trim()} onClick={addLocation}>
                <Plus size={16} strokeWidth={2} /> Add
              </Button>
            </div>
          </Card>

          {locations.length === 0 ? (
            <EmptyState
              icon={<MapPin />}
              title="No places yet"
              description="Add the markets and shops shoppers can be sent to."
            />
          ) : (
            <AdminTable
              caption="Places"
              head={
                <>
                  <Th>Place</Th>
                  <Th>City</Th>
                  <Th align="right">Requests</Th>
                  <Th align="right"><span className="sr-only">Visibility</span></Th>
                </>
              }
            >
              {locations.map((l) => (
                <Tr key={l.id}>
                  <Td>
                    <span className={l.is_active ? 'font-medium' : 'text-ink-3 line-through'}>{l.name}</span>
                    <span className="ml-2 text-caption capitalize text-ink-3">{l.type}</span>
                  </Td>
                  <Td muted>{l.city}</Td>
                  <Td numeric muted>{l.request_count}</Td>
                  <Td align="right">
                    <Button size="sm" variant="secondary" loading={toggling === l.id} onClick={() => toggle(l.id)}>
                      {l.is_active
                        ? <><EyeOff size={16} strokeWidth={2} /> Hide</>
                        : <><Eye size={16} strokeWidth={2} /> Show</>}
                    </Button>
                  </Td>
                </Tr>
              ))}
            </AdminTable>
          )}
        </div>
      )}

      {tab === 'audit' && (
        entries.length === 0 ? (
          <EmptyState
            icon={<ScrollText />}
            title="Nothing has been done yet"
            description="Every admin action is recorded here as it happens."
          />
        ) : (
          <Card padding="none" hover={false}>
            <ul>
              {entries.map((e) => (
                <li key={e.id} className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-0">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-fresh" />
                  <div className="min-w-0 flex-1">
                    <p className="text-small text-ink">{e.summary}</p>
                    <p className="mt-0.5 text-caption text-ink-3">
                      {e.admin_name} · {e.action} · {formatDate(e.created_at)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        )
      )}
    </div>
  );
}
