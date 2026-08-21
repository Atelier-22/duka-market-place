import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, Check } from 'lucide-react';
import { api } from '../../services/api';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

/** Polling beats nothing; a websocket can replace this without touching the UI. */
const POLL_MS = 30_000;

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * The bell shown on both dashboards. Covers every event the backend raises —
 * offers, acceptances, each order status change, new messages and ratings —
 * not just messages.
 */
export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);

  const loadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnread(res.data.unread);
    } catch {
      // A failed poll should stay silent — the bell is ambient, not critical.
    }
  }, []);

  const loadAll = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setItems(res.data.notifications);
      setUnread(res.data.unread);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, POLL_MS);
    return () => clearInterval(t);
  }, [loadCount]);

  // Close when clicking anywhere outside the panel.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [open]);

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next) loadAll();
  }

  async function handleClick(n: Notification) {
    setOpen(false);
    if (!n.read_at) {
      setUnread((u) => Math.max(0, u - 1));
      api.post(`/notifications/${n.id}/read`).catch(() => undefined);
    }
    if (n.link) navigate(n.link);
  }

  async function handleReadAll() {
    setUnread(0);
    setItems((list) => list.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() })));
    api.post('/notifications/read-all').catch(() => undefined);
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-brand-green/15 bg-white/70 text-brand-green-deep transition-colors hover:bg-brand-green-mist"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="glass absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-xl2 shadow-glass-lg">
          <div className="flex items-center justify-between border-b border-brand-green/10 px-4 py-3">
            <p className="text-sm font-semibold text-brand-green-deep">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={handleReadAll}
                className="flex items-center gap-1 text-xs font-medium text-brand-ink/50 hover:text-brand-green-deep"
              >
                <Check size={13} strokeWidth={2} /> Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-brand-ink/40">Nothing yet.</p>
            ) : (
              items.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={[
                    'flex w-full flex-col items-start gap-0.5 border-b border-brand-green/5 px-4 py-3 text-left transition-colors last:border-0',
                    n.read_at ? 'hover:bg-brand-green-mist/40' : 'bg-brand-green-mist/50 hover:bg-brand-green-mist',
                  ].join(' ')}
                >
                  <span className="flex w-full items-start gap-2">
                    {!n.read_at && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-green-fresh" />}
                    <span className={`text-sm ${n.read_at ? 'text-brand-ink/70' : 'font-semibold text-brand-green-deep'}`}>
                      {n.title}
                    </span>
                  </span>
                  {n.body && <span className="pl-3.5 text-xs text-brand-ink/45">{n.body}</span>}
                  <span className="pl-3.5 text-[11px] text-brand-ink/35">{timeAgo(n.created_at)}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
