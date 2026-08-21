import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AlertTriangle, CheckCircle2, Coins, FileText, Handshake, LucideIcon, Package,
  Radio, Scale, Search, ShieldCheck, ShoppingBag, Star, UserPlus, Users,
} from 'lucide-react';
import { api } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { DashboardStat } from '../../components/domain/DashboardStat';
import { LoadingState } from '../../components/ui/LoadingState';

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

/** How often the feed and presence refresh. Polling is enough at this scale. */
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
  request_created: 'text-brand-ink/45',
  offer_created: 'text-brand-ink/45',
  order_status: 'text-brand-green',
  dispute_opened: 'text-brand-red',
  rating_left: 'text-brand-yellow',
  verification_submitted: 'text-brand-green-fresh',
};

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

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

/** Where an activity row should take you when clicked. */
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

  // Debounced so typing a phone number doesn't fire a query per keystroke.
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
      <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-ink/35" />
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results && setOpen(true)}
        placeholder="Search any user by name, phone or email — or an order by its ID…"
        className="w-full rounded-full border border-brand-green/15 bg-brand-white/70 py-2.5 pl-10 pr-4 text-sm text-brand-ink outline-none transition-colors placeholder:text-brand-ink/35 focus:border-brand-green-fresh"
      />

      {open && results && (
        <div className="glass absolute left-0 right-0 z-30 mt-2 max-h-96 overflow-y-auto rounded-xl2 shadow-glass-lg">
          {empty && <p className="px-4 py-6 text-center text-sm text-brand-ink/45">Nothing matches "{q}".</p>}

          {results.users.length > 0 && (
            <>
              <p className="border-b border-brand-green/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-ink/40">People</p>
              {results.users.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => go(u.role === 'shopper' ? `/admin/shoppers/${u.id}` : `/admin/customers/${u.id}`)}
                  className="flex w-full items-center gap-3 border-b border-brand-green/5 px-4 py-2.5 text-left last:border-0 hover:bg-brand-green-mist/60"
                >
                  {u.role === 'shopper'
                    ? <ShoppingBag size={15} strokeWidth={1.75} className="shrink-0 text-brand-ink/40" />
                    : <Users size={15} strokeWidth={1.75} className="shrink-0 text-brand-ink/40" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-brand-green-deep">{u.full_name}</span>
                    <span className="block truncate text-xs text-brand-ink/45">{u.phone}{u.email ? ` · ${u.email}` : ''}</span>
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-brand-ink/35">{u.role}</span>
                </button>
              ))}
            </>
          )}

          {results.orders.length > 0 && (
            <>
              <p className="border-b border-brand-green/10 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-brand-ink/40">Orders</p>
              {results.orders.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => go(`/admin/orders/${o.id}`)}
                  className="flex w-full items-center gap-3 border-b border-brand-green/5 px-4 py-2.5 text-left last:border-0 hover:bg-brand-green-mist/60"
                >
                  <Package size={15} strokeWidth={1.75} className="shrink-0 text-brand-ink/40" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-brand-green-deep">
                      #{o.id.slice(0, 8)} — {o.request_title ?? 'Order'}
                    </span>
                    <span className="block truncate text-xs text-brand-ink/45">
                      {o.customer_name} → {o.shopper_name ?? 'unassigned'}
                    </span>
                  </span>
                  <span className="shrink-0 text-[11px] uppercase tracking-wide text-brand-ink/35">{o.status.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </>
          )}
        </div>
      )}
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
      // Leave the last good snapshot on screen rather than blanking the page.
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

  if (loading) return <LoadingState label="Loading the control centre…" />;

  return (
    <div className="flex flex-col gap-6 pb-16">
      <div>
        <h1 className="font-display text-2xl font-medium text-brand-green-deep">Control centre</h1>
        <p className="text-sm text-brand-ink/50">Everything happening across the platform, right now.</p>
      </div>

      <GlobalSearch />

      {/* Live "in motion" strip */}
      <GlassCard padding="lg" hover={false}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
            <Radio size={14} strokeWidth={2} className="text-brand-green-fresh" />
            In motion now
          </p>
          <span className="text-[11px] text-brand-ink/35">
            updated {timeAgo(new Date(lastRefresh).toISOString())}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
          <div>
            <p className="font-display text-2xl font-semibold text-brand-green-deep">
              {presence?.shoppersOnline ?? 0}
              <span className="ml-1 text-sm font-normal text-brand-ink/40">/ {presence?.shoppersTotal ?? 0}</span>
            </p>
            <p className="text-xs text-brand-ink/45">shoppers online</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-brand-green-deep">{presence?.ordersInFlight ?? 0}</p>
            <p className="text-xs text-brand-ink/45">orders in flight</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-brand-green-deep">{presence?.transitionsLast15Min ?? 0}</p>
            <p className="text-xs text-brand-ink/45">status changes / 15 min</p>
          </div>
          <div>
            <p className="font-display text-2xl font-semibold text-brand-red">{stats?.openDisputes ?? 0}</p>
            <p className="text-xs text-brand-ink/45">open disputes</p>
          </div>
        </div>

        {busiest.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-brand-green/10 pt-4">
            {busiest.map((s) => (
              <span key={s.status} className="rounded-full bg-brand-green-mist px-3 py-1 text-xs font-medium text-brand-green-deep">
                {s.count} {s.status.replace(/_/g, ' ')}
              </span>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Historical stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <DashboardStat label="Customers" value={String(stats?.customers ?? 0)} icon={<Users size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Shoppers" value={String(stats?.shoppers ?? 0)} icon={<ShoppingBag size={18} strokeWidth={1.75} />} />
        <DashboardStat label="Completed today" value={String(stats?.completedToday ?? 0)} icon={<CheckCircle2 size={18} strokeWidth={1.75} />} />
        <DashboardStat label="GMV (completed)" value={formatUgx(stats?.grossMerchandiseValueUgx ?? 0)} icon={<Coins size={18} strokeWidth={1.75} />} accent="yellow" />
      </div>

      {(stats?.pendingVerifications ?? 0) > 0 && (
        <Link to="/admin/verifications">
          <GlassCard glow="yellow" padding="md">
            <p className="flex items-center gap-2 text-sm font-medium text-brand-green-deep">
              <AlertTriangle size={16} strokeWidth={2} className="text-brand-yellow" />
              {stats.pendingVerifications} shopper verification{stats.pendingVerifications === 1 ? '' : 's'} waiting for review
            </p>
          </GlassCard>
        </Link>
      )}

      {/* The feed */}
      <div>
        <h2 className="mb-3 font-display text-lg font-medium text-brand-green-deep">Activity</h2>
        <GlassCard padding="md" hover={false}>
          {activity.length === 0 ? (
            <p className="py-12 text-center text-sm text-brand-ink/40">Nothing has happened yet.</p>
          ) : (
            <div className="flex flex-col">
              {activity.map((item, i) => {
                const Icon = ICON_FOR[item.type] ?? Package;
                const to = linkFor(item);
                const inner = (
                  <>
                    <Icon size={16} strokeWidth={1.75} className={`mt-0.5 shrink-0 ${TONE_FOR[item.type] ?? 'text-brand-ink/40'}`} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-brand-ink/80">{item.summary}</span>
                      <span className="mt-0.5 block text-[11px] text-brand-ink/35">
                        {item.type.replace(/_/g, ' ')}
                        {item.actor_name ? ` · ${item.actor_name}` : ''}
                      </span>
                    </span>
                    <span className="shrink-0 text-[11px] text-brand-ink/35">{timeAgo(item.at)}</span>
                  </>
                );
                const cls = 'flex items-start gap-3 border-b border-brand-green/5 px-1 py-3 text-left last:border-0';
                return to ? (
                  <Link key={`${item.type}-${item.at}-${i}`} to={to} className={`${cls} transition-colors hover:bg-brand-green-mist/50`}>
                    {inner}
                  </Link>
                ) : (
                  <div key={`${item.type}-${item.at}-${i}`} className={cls}>{inner}</div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
