import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Coins, FileText, Handshake, LucideIcon, Package,
  Radio, Scale, Search, ShieldCheck, ShoppingBag, Star, UserPlus, Users,
} from 'lucide-react';
import { api } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Input } from '../../components/ui/Input';
import { PageHeader, SectionHeader } from '../../components/ui/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { Bone, SkeletonHeading, SkeletonRegion, SkeletonRows, SkeletonStats } from '../../components/ui/Skeleton';
import { formatUgx } from './AdminDetailShell';

interface ActivityItem {
  type: string;
  at: string;
  actor_id: string | null;
  actor_name: string | null;
  actor_role: string | null;
  order_id: string | null;
  subject_id: string | null;
  summary: string;
}

interface Presence {
  shoppersOnline: number;
  shoppersTotal: number;
  ordersInFlight: number;
  ordersByStatus: { status: string; count: number }[];
  transitionsLast15Min: number;
}

const POLL_MS = 12_000;

const ICON_FOR: Record<string, LucideIcon> = {
  user_registered: UserPlus,
  request_created: FileText,
  offer_created: Handshake,
  order_status: Package,
  dispute_opened: Scale,
  rating_left: Star,
  verification_submitted: ShieldCheck,
};

const TONE_FOR: Record<string, string> = {
  user_registered: 'text-brand-green-fresh',
  request_created: 'text-ink-3',
  offer_created: 'text-ink-3',
  order_status: 'text-brand-green',
  dispute_opened: 'text-brand-red',
  rating_left: 'text-warning',
  verification_submitted: 'text-brand-green-fresh',
};

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${Math.max(0, secs)}s ago`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
}

function linkFor(item: ActivityItem): string | null {
  if (item.order_id) return `/admin/orders/${item.order_id}`;
  if (item.type === 'user_registered' && item.actor_id) {
    return item.actor_role === 'shopper'
      ? `/admin/shoppers/${item.actor_id}`
      : `/admin/customers/${item.actor_id}`;
  }
  if (item.type === 'verification_submitted' && item.actor_id) return `/admin/shoppers/${item.actor_id}`;
  return null;
}

const RESULT_ROW =
  'flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left transition-colors last:border-0 hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none';
const RESULT_GROUP = 'border-b border-line bg-surface-2 px-4 py-2 text-label font-semibold uppercase text-ink-3';

function GlobalSearch() {
  const navigate = useNavigate();
  const [q, setQ] = useState('');
  const [results, setResults] = useState<{ users: any[]; orders: any[] } | null>(null);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  useEffect(() => {
    clearTimeout(timer.current);
    if (q.trim().length < 2) { setResults(null); return; }
    timer.current = setTimeout(() => {
      api.get(`/admin/search?q=${encodeURIComponent(q.trim())}`)
        .then((res) => { setResults(res.data); setOpen(true); })
        .catch(() => setResults(null));
    }, 250);
    return () => clearTimeout(timer.current);
  }, [q]);

  function go(path: string) {
    setOpen(false);
    setQ('');
    navigate(path);
  }

  const empty = results && results.users.length === 0 && results.orders.length === 0;

  return (
    <div className="relative" ref={boxRef}>
      <Input
        aria-label="Search people and orders"
        icon={<Search size={18} strokeWidth={1.75} />}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Search any user by name, phone or email — or an order by its ID…"
        autoComplete="off"
      />

      {open && results && (
        <Card elevated padding="none" className="absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto">
          {empty && <p className="px-4 py-6 text-center text-sm text-ink-3">Nothing matches "{q}".</p>}

          {results.users.length > 0 && (
            <>
              <p className={RESULT_GROUP}>People</p>
              {results.users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => go(u.role === 'shopper' ? `/admin/shoppers/${u.id}` : `/admin/customers/${u.id}`)}
                  className={RESULT_ROW}
                >
                  {u.role === 'shopper'
                    ? <ShoppingBag size={16} strokeWidth={1.75} className="shrink-0 text-ink-3" />
                    : <Users size={16} strokeWidth={1.75} className="shrink-0 text-ink-3" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-brand-green-deep">{u.full_name}</span>
                    <span className="block truncate text-caption text-ink-3">{u.phone}{u.email ? ` · ${u.email}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-label font-semibold uppercase text-ink-3">{u.role}</span>
                </button>
              ))}
            </>
          )}

          {results.orders.length > 0 && (
            <>
              <p className={RESULT_GROUP}>Orders</p>
              {results.orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => go(`/admin/orders/${o.id}`)}
                  className={RESULT_ROW}
                >
                  <Package size={16} strokeWidth={1.75} className="shrink-0 text-ink-3" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-brand-green-deep">
                      #{o.id.slice(0, 8)} — {o.request_title ?? 'Order'}
                    </span>
                    <span className="block truncate text-caption text-ink-3">
                      {o.customer_name} → {o.shopper_name ?? 'unassigned'}
                    </span>
                  </span>
                  <span className="shrink-0 text-label font-semibold uppercase text-ink-3">{o.status.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </>
          )}
        </Card>
      )}
    </div>
  );
}

function LiveFigure({ value, label, sub, tone = 'default' }: {
  value: number; label: string; sub?: string; tone?: 'default' | 'danger';
}) {
  return (
    <div>
      <p className={`font-display text-2xl font-semibold tracking-tight ${tone === 'danger' ? 'text-brand-red' : 'text-brand-green-deep'}`}>
        {value}
        {sub && <span className="ml-1 font-sans text-small font-normal text-ink-3">{sub}</span>}
      </p>
      <p className="mt-0.5 text-caption text-ink-3">{label}</p>
    </div>
  );
}

export function AdminOverviewPage() {
  const [stats, setStats] = useState<any>(null);
  const [presence, setPresence] = useState<Presence | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<number>(() => Date.now());

  const load = useCallback(async () => {
    try {
      const [d, p, a] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/presence'),
        api.get('/admin/activity?limit=50'),
      ]);
      setStats(d.data);
      setPresence(p.data);
      setActivity(a.data.activity);
      setLastRefresh(Date.now());
    } catch {

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const busiest = useMemo(
    () => presence?.ordersByStatus.slice(0, 6) ?? [],
    [presence]
  );

  if (loading) {
    return (
      <SkeletonRegion label="Loading" className="pb-16">
        <SkeletonHeading />
        <Bone className="mt-6 h-11 w-full rounded-lg" />
        <div className="mt-6"><SkeletonStats /></div>
        <div className="mt-6"><SkeletonRows count={5} /></div>
      </SkeletonRegion>
    );
  }

  return (
    <div className="pb-16">
      <PageHeader title="Control centre" subtitle="Everything happening across the platform, right now." />

      <div className="flex flex-col gap-6">
        <GlobalSearch />

        <Card padding="lg" hover={false}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-2 text-label font-semibold uppercase text-ink-3">
              <Radio size={14} strokeWidth={2} className="text-brand-green-fresh" />
              In motion now
            </p>
            <span className="text-caption text-ink-3">
              updated {timeAgo(new Date(lastRefresh).toISOString())}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
            <LiveFigure value={presence?.shoppersOnline ?? 0} sub={`/ ${presence?.shoppersTotal ?? 0}`} label="shoppers online" />
            <LiveFigure value={presence?.ordersInFlight ?? 0} label="orders in flight" />
            <LiveFigure value={presence?.transitionsLast15Min ?? 0} label="status changes / 15 min" />
            <LiveFigure value={stats?.openDisputes ?? 0} label="open disputes" tone="danger" />
          </div>

          {busiest.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-4">
              {busiest.map((s) => (
                <span key={s.status} className="rounded-full bg-brand-green-mist px-3 py-1 text-caption font-medium text-brand-green-deep">
                  {s.count} {s.status.replace(/_/g, ' ')}
                </span>
              ))}
            </div>
          )}
        </Card>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <DashboardStat label="Customers" value={String(stats?.customers ?? 0)} icon={<Users size={18} strokeWidth={1.75} />} />
          <DashboardStat label="Shoppers" value={String(stats?.shoppers ?? 0)} icon={<ShoppingBag size={18} strokeWidth={1.75} />} />
          <DashboardStat label="Completed today" value={String(stats?.completedToday ?? 0)} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} />
          <DashboardStat label="GMV (completed)" value={formatUgx(stats?.grossMerchandiseValueUgx ?? 0)} icon={<Coins size={18} strokeWidth={1.75} />} accent="yellow" />
        </div>

        {(stats?.pendingVerifications ?? 0) > 0 && (
          <Link to="/admin/verifications" className="block rounded-2xl focus-visible:outline-none focus-visible:shadow-focus">
            <Card tone="warning" padding="md" hover>
              <p className="flex items-center gap-2 text-sm font-medium text-brand-green-deep">
                <AlertTriangle size={16} strokeWidth={2} className="shrink-0 text-warning" />
                {stats.pendingVerifications} shopper verification{stats.pendingVerifications === 1 ? '' : 's'} waiting for review
              </p>
            </Card>
          </Link>
        )}

        <section>
          <SectionHeader title="Activity" />
          {activity.length === 0 ? (
            <EmptyState
              size="sm"
              title="Nothing has happened yet"
              description="Sign-ups, requests, offers and order updates will show here as they happen."
            />
          ) : (
            <Card padding="none" hover={false} className="overflow-hidden">
              <div className="flex flex-col">
                {activity.map((item, i) => {
                  const Icon = ICON_FOR[item.type] ?? Package;
                  const to = linkFor(item);
                  const inner = (
                    <>
                      <Icon size={16} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${TONE_FOR[item.type] ?? 'text-ink-3'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm text-ink">{item.summary}</span>
                        <span className="mt-0.5 block text-caption text-ink-3">
                          {item.type.replace(/_/g, ' ')}
                          {item.actor_name ? ` · ${item.actor_name}` : ''}
                        </span>
                      </span>
                      <span className="shrink-0 text-caption text-ink-3">{timeAgo(item.at)}</span>
                    </>
                  );
                  const cls = 'flex items-start gap-3 border-b border-line px-4 py-3 text-left last:border-0';
                  return to ? (
                    <Link key={`${item.type}-${item.at}-${i}`} to={to} className={`${cls} transition-colors hover:bg-surface-2`}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={`${item.type}-${item.at}-${i}`} className={cls}>{inner}</div>
                  );
                })}
              </div>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
