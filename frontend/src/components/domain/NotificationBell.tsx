import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Bell, Check, X } from 'lucide-react';
import { api } from '../../services/api';
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
    <div className="flex items-center justify-between border-b border-brand-green/10 px-4 py-3">
      <p className="text-sm font-semibold text-brand-green-deep">Notifications</p>
      <span className="flex items-center gap-3">
        {unread > 0 && (
          <button
            type="button"
            onClick={handleReadAll}
            className="flex items-center gap-1 text-xs font-medium text-brand-ink/50 hover:text-brand-green-deep"
          >
            <Check size={13} strokeWidth={2} /> Mark all read
          </button>
        )}
        {isMobile && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Close notifications"
            className="flex h-8 w-8 items-center justify-center rounded-full text-brand-ink/45 hover:bg-brand-green-mist"
          >
            <X size={17} strokeWidth={2} />
          </button>
        )}
      </span>
    </div>
  );

  const list = (
    <div className={isMobile ? 'max-h-[60vh] overflow-y-auto' : 'max-h-96 overflow-y-auto'}>
      {listLoading && items.length === 0 ? (
        <SkeletonRegion label="Loading notifications">
          {[0, 1, 2].map((i) => (
            <div key={i} className="border-b border-brand-green/5 px-4 py-3 last:border-0">
              <BoneText w="w-3/4" />
              <BoneText w="w-1/2" className="mt-2 h-3" />
              <BoneText w="w-12" className="mt-2 h-2.5" />
            </div>
          ))}
        </SkeletonRegion>
      ) : items.length === 0 ? (
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
  );

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        className={[
          'relative flex h-10 w-10 items-center justify-center rounded-full border transition-colors',
          unread > 0
            ? 'border-brand-red bg-brand-red text-white hover:bg-brand-red/90'
            : 'border-brand-green/15 bg-brand-white text-brand-green-deep hover:bg-brand-green-mist',
        ].join(' ')}
      >
        <Bell size={18} strokeWidth={unread > 0 ? 2.25 : 1.75} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brand-red px-1 text-[10px] font-bold text-white ring-2 ring-brand-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && isMobile && createPortal(
        <div
          className="fixed inset-0 z-[70] flex items-end bg-brand-ink/40 "
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Notifications"
        >
          <div
            ref={sheetRef}
            onClick={(e) => e.stopPropagation()}
            className="surface w-full overflow-hidden rounded-t-2xl"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {header}
            {list}
          </div>
        </div>,
        document.body
      )}

      {open && !isMobile && (
        <div className="surface absolute right-0 z-30 mt-2 w-80 overflow-hidden rounded-2xl shadow-raised">
          {header}
          {list}
        </div>
      )}
    </div>
  );
}
