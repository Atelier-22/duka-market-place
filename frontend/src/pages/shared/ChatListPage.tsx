import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon, MessageCircle, Mic, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Conversation, useConversations } from '../../hooks/useConversations';
import { PresenceDot } from '../../components/domain/PresenceDot';
import { MessageReceipt, tickStateFor } from '../../components/domain/MessageTicks';
import { GlassCard } from '../../components/ui/GlassCard';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { StatusBadge } from '../../components/ui/StatusBadge';

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

function whenLabel(iso: string | null): string {
  if (!iso) return '';
  const then = new Date(iso);
  const mins = Math.floor((Date.now() - then.getTime()) / 60_000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return then.toLocaleDateString('en-UG', { day: 'numeric', month: 'short' });
}

function attachmentLabel(c: Conversation): string {
  if (!c.last_attachment) return '';
  return c.last_attachment_type === 'audio' ? 'Voice note' : 'Photo';
}

function preview(c: Conversation, myId: string | undefined): string {
  if (!c.last_at) return 'No messages yet';
  const mine = c.last_sender_id === myId;
  const text = c.last_body?.trim() || attachmentLabel(c);
  return `${mine ? 'You: ' : ''}${text}`;
}

/**
 * The chat inbox: one row per person you have a job with, most recent first.
 * A shopper juggling several jobs picks who to answer from here rather than
 * digging through orders — which was the whole problem with per-order-only
 * messaging.
 */
export function ChatListPage() {
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState('');

  const base = user?.role === 'shopper' ? '/shopper' : '/app';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      `${c.other_name} ${c.request_title ?? ''} ${c.last_body ?? ''}`.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  if (loading) return <LoadingState label="Loading your chats…" />;

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <h1 className="font-display text-2xl font-medium text-brand-green-deep">Chats</h1>
      <p className="mt-1 text-sm text-brand-ink/50">
        {user?.role === 'shopper'
          ? 'Every customer you have a job with.'
          : 'Every shopper working on your orders.'}
      </p>

      <div className="relative mt-5">
        <Search size={16} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-ink/35" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search chats…"
          className="w-full rounded-full border border-brand-green/15 bg-brand-white/70 py-2.5 pl-10 pr-4 text-sm text-brand-ink outline-none transition-colors placeholder:text-brand-ink/35 focus:border-brand-green-fresh"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<MessageCircle size={40} strokeWidth={1.25} />}
            title={search ? 'No chats match that' : 'No chats yet'}
            description={
              search
                ? 'Try a different name or word.'
                : user?.role === 'shopper'
                ? 'Accept a job and you can message the customer here.'
                : 'Once a shopper takes your request you can message them here.'
            }
          />
        </div>
      ) : (
        <GlassCard padding="md" hover={false} className="mt-5 overflow-hidden">
          <div className="flex flex-col">
            {filtered.map((c) => (
              <Link
                key={c.order_id}
                to={`${base}/orders/${c.order_id}/messages`}
                className="flex items-center gap-3 border-b border-brand-green/8 px-1 py-3 transition-colors last:border-0 hover:bg-brand-green-mist/50"
              >
                <div className="relative shrink-0">
                  {c.other_avatar ? (
                    <img
                      src={c.other_avatar}
                      alt=""
                      className="h-12 w-12 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh text-sm font-semibold text-white">
                      {initials(c.other_name)}
                    </span>
                  )}
                  <PresenceDot online={c.other_online} variant="avatar" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate font-semibold text-brand-green-deep">{c.other_name}</p>
                    <span className="shrink-0 text-[11px] text-brand-ink/40">{whenLabel(c.last_at)}</span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {/* Your own last message carries its receipt here, the way
                        the preview row does in any messaging app. */}
                    {c.last_at && c.last_sender_id === user?.id && (
                      <MessageReceipt state={tickStateFor({ delivered_at: c.last_delivered_at, read_at: c.last_read_at })} />
                    )}
                    {c.last_attachment && !c.last_body && (
                      c.last_attachment_type === 'audio'
                        ? <Mic size={13} strokeWidth={2} className="shrink-0 text-brand-ink/35" />
                        : <ImageIcon size={13} strokeWidth={2} className="shrink-0 text-brand-ink/35" />
                    )}
                    <p className={`truncate text-sm ${c.unread > 0 ? 'font-medium text-brand-ink/75' : 'text-brand-ink/45'}`}>
                      {preview(c, user?.id)}
                    </p>
                  </div>
                  {c.request_title && (
                    <p className="mt-1 truncate text-[11px] text-brand-ink/35">{c.request_title}</p>
                  )}
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <StatusBadge status={c.order_status as never} />
                  {c.unread > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-green-fresh px-1.5 text-[11px] font-bold text-white">
                      {c.unread > 9 ? '9+' : c.unread}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </GlassCard>
      )}
    </div>
  );
}
