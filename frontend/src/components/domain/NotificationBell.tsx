import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, Check, X } from 'lucide-react';
import { api } from '../../services/api';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { EmptyState } from '../ui/EmptyState';
import { BoneText, SkeletonRegion } from '../ui/Skeleton';

interface Notification {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

const POLL_MS = 30_000;

const MOBILE_BREAKPOINT = 640;

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [listLoading, setListLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.innerWidth < MOBILE_BREAKPOINT
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  const sheetRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const loadCount = useCallback(async () => {
    try {
      const res = await api.get('/notifications/unread-count');
      setUnread(res.data.unread);
    } catch {
    }
  }, []);

  const loadAll = useCallback(async () => {
    setListLoading(true);
    try {
      const res = await api.get('/notifications');
      setItems(res.data.notifications);
      setUnread(res.data.unread);
    } catch {
      setItems([]);
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, POLL_MS);
    return () => clearInterval(t);
  }, [loadCount]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target)) return;
      if (wrapRef.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !isMobile) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previous; };
  }, [open, isMobile]);

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

  const header = (
    <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
      <p className="font-display text-h3 font-medium text-brand-green-deep">Notifications</p>
      <span className="flex items-center gap-1">
        {unread > 0 && (
          <Button variant="tertiary" size="sm" onClick={handleReadAll}>
            <Check size={15} strokeWidth={2} /> Mark all read
          </Button>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
            className="flex h-9 w-9 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-none focus-visible:shadow-focus"
          >
            <X size={18} strokeWidth={2} />
          </button>
        )}
      </span>
    </div>
  );

  const list = (
    <div className={`overflow-y-auto overscroll-contain ${isMobile ? 'max-h-[60vh]' : 'max-h-96'}`}>
      {listLoading && items.length === 0 ? (
        <SkeletonRegion label="Loading notifications">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex gap-3 border-b border-line px-4 py-3 last:border-0">
              <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-line" aria-hidden />
              <div className="min-w-0 flex-1">
                <BoneText w="w-3/4" />
                <BoneText w="w-1/2" className="mt-2 h-3" />
                <BoneText w="w-12" className="mt-2 h-2.5" />
              </div>
            </div>
          ))}
        </SkeletonRegion>
      ) : items.length === 0 ? (
        <div className="p-3">
          <EmptyState
            size="sm"
            icon={<BellOff />}
            title="Nothing yet"
            description="Order updates, offers and messages will show up here."
          />
        </div>
      ) : (
        <ul>
          {items.map((n) => {
            const isUnread = !n.read_at;
            return (
              <li key={n.id} className="border-b border-line last:border-0">
                <button
                  type="button"
                  onClick={() => handleClick(n)}
                  className="flex w-full items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-surface-2 active:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={`mt-[7px] h-2 w-2 shrink-0 rounded-full ${isUnread ? 'bg-brand-green' : 'bg-transparent'}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-small ${isUnread ? 'font-semibold text-ink' : 'font-medium text-ink-2'}`}>
                      {isUnread && <span className="sr-only">Unread: </span>}
                      {n.title}
                    </span>
                    {n.body && <span className="mt-0.5 line-clamp-2 text-caption text-ink-2">{n.body}</span>}
                    <span className="mt-1 block text-caption text-ink-3">{timeAgo(n.created_at)}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-brand-green-deep transition-[background-color,border-color,transform] duration-150 ease-standard hover:border-line-strong hover:bg-surface-2 active:scale-95 focus-visible:outline-none focus-visible:shadow-focus"
      >
        <Bell size={18} strokeWidth={1.75} />
        {unread > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold leading-none text-white ring-2 ring-surface"
          >
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && isMobile && createPortal(
        <div className="fixed inset-0 z-[70] flex items-end" role="dialog" aria-modal="true" aria-label="Notifications">
          <div className="absolute inset-0 animate-fade-in bg-brand-ink/45" onClick={() => setOpen(false)} aria-hidden />
          <div ref={sheetRef} className="relative w-full animate-sheet-up">
            <Card
              elevated
              padding="none"
              className="overflow-hidden rounded-b-none rounded-t-3xl"
              style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
            >
              <span aria-hidden className="mx-auto mt-2.5 block h-1 w-10 rounded-full bg-line-strong" />
              {header}
              {list}
            </Card>
          </div>
        </div>,
        document.body
      )}

      {open && !isMobile && (
        <Card
          elevated
          padding="none"
          className="absolute right-0 z-30 mt-2 w-80 origin-top-right animate-scale-in overflow-hidden"
        >
          {header}
          {list}
        </Card>
      )}
    </div>
  );
}
