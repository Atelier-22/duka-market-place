import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useConversations } from './useConversations';
import { useToast } from '../components/ui/Toast';

const REMINDER_MS = 10 * 60 * 1000;
const STORAGE_KEY = 'duka_unread_reminders';

export function unreadRemindersEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== 'off';
  } catch {
    return true;
  }
}

export function setUnreadRemindersEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off');
  } catch {
    return;
  }
  window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }));
}

export function useUnreadReminder(active: boolean) {
  const { conversations, totalUnread } = useConversations(active);
  const { push } = useToast();
  const location = useLocation();
  const lastShown = useRef(0);

  const pathname = location.pathname;

  useEffect(() => {
    if (!active || totalUnread <= 0) return;
    if (!unreadRemindersEnabled()) return;
    if (pathname.includes('/messages')) return;

    function remind() {
      if (!unreadRemindersEnabled()) return;
      const newest = conversations
        .filter((c) => (c.unread ?? 0) > 0)
        .sort((a, b) => new Date(b.last_at ?? 0).getTime() - new Date(a.last_at ?? 0).getTime())[0];
      if (!newest) return;

      const who = newest.other_name ?? 'Someone';
      const preview = newest.last_body
        ? `${who}: ${newest.last_body}`
        : `${who} sent you ${newest.last_attachment_type === 'audio' ? 'a voice note' : 'a photo'}`;
      push(`Unread — ${preview}`, 'info');
      lastShown.current = Date.now();
    }

    const sinceLast = Date.now() - lastShown.current;
    const first = window.setTimeout(remind, sinceLast > REMINDER_MS ? 1500 : REMINDER_MS - sinceLast);
    const repeat = window.setInterval(remind, REMINDER_MS);

    return () => {
      window.clearTimeout(first);
      window.clearInterval(repeat);
    };
  }, [active, totalUnread, conversations, pathname, push]);

  return totalUnread;
}
