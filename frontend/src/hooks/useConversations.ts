import { useCallback, useEffect, useState } from 'react';
import { api } from '../services/api';

export interface Conversation {
  order_id: string;
  order_status: string;
  order_created_at: string;
  other_id: string;
  other_name: string;
  other_avatar: string | null;
  other_role: 'customer' | 'shopper' | 'admin';
  other_phone: string | null;
  request_title: string | null;
  last_body: string | null;
  last_attachment: string | null;
  last_at: string | null;
  last_sender_id: string | null;
  unread: number;
}

const POLL_MS = 20_000;

/**
 * The chat inbox. Polled rather than pushed — a websocket layer can replace
 * the transport later without any component changing.
 */
export function useConversations(enabled = true) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.conversations);
    } catch {
      // Inbox is not critical enough to surface a poll failure.
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    load();
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [enabled, load]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  return { conversations, totalUnread, loading, refresh: load };
}
