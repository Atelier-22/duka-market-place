import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageIcon, MessageCircle, Mic, Search } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Conversation, useConversations } from '../../hooks/useConversations';
import { PresenceDot } from '../../components/domain/PresenceDot';
import { MessageReceipt, tickStateFor } from '../../components/domain/MessageTicks';
import { Avatar } from '../../components/ui/Avatar';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { Input } from '../../components/ui/Input';
import { PageHeader } from '../../components/ui/PageHeader';
import { SkeletonChatRows, SkeletonRegion } from '../../components/ui/Skeleton';
import { StatusBadge } from '../../components/ui/StatusBadge';

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

interface RowProps {
  conversation: Conversation;
  myId: string | undefined;
  to: string;
}

function ConversationRow({ conversation: c, myId, to }: RowProps) {
  const unread = c.unread > 0;
  const mine = Boolean(c.last_at) && c.last_sender_id === myId;

  return (
    <Link
      to={to}
      className="flex min-h-[64px] items-center gap-3 px-4 py-3 transition-colors duration-150 ease-standard hover:bg-surface-2 active:bg-surface-2"
    >
      <span className="relative shrink-0">
        <Avatar name={c.other_name} src={c.other_avatar} size={48} />
        <PresenceDot online={c.other_online} variant="avatar" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className={`truncate text-body text-ink ${unread ? 'font-semibold' : 'font-medium'}`}>{c.other_name}</span>
          <span className={`shrink-0 text-caption ${unread ? 'font-semibold text-brand-green' : 'text-ink-3'}`}>
            {whenLabel(c.last_at)}
          </span>
        </span>

        <span className="mt-0.5 flex items-center gap-1.5">
          {mine && (
            <MessageReceipt state={tickStateFor({ delivered_at: c.last_delivered_at, read_at: c.last_read_at })} />
          )}
          {c.last_attachment && !c.last_body && (
            c.last_attachment_type === 'audio'
              ? <Mic size={13} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />
              : <ImageIcon size={13} strokeWidth={2} className="shrink-0 text-ink-3" aria-hidden />
          )}
          <span className={`truncate text-small ${unread ? 'font-medium text-ink' : 'text-ink-2'}`}>
            {preview(c, myId)}
          </span>
        </span>

        <span className="mt-1 flex items-center gap-2">
          <StatusBadge status={c.order_status} className="sm:hidden" />
          {c.request_title && <span className="truncate text-caption text-ink-3">{c.request_title}</span>}
        </span>
      </span>

      <span className="flex shrink-0 flex-col items-end gap-1.5">
        <StatusBadge status={c.order_status} className="hidden sm:inline-flex" />
        {unread && (
          <span
            className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-green px-1.5 text-caption font-bold text-white"
            aria-label={`${c.unread} unread`}
          >
            {c.unread > 9 ? '9+' : c.unread}
          </span>
        )}
      </span>
    </Link>
  );
}

export function ChatListPage() {
  const { user } = useAuth();
  const { conversations, loading } = useConversations();
  const [search, setSearch] = useState('');

  const base = user?.role === 'shopper' ? '/shopper' : '/app';
  const subtitle = user?.role === 'shopper'
    ? 'Every customer you have a job with.'
    : 'Every shopper working on your orders.';

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return conversations;
    return conversations.filter((c) =>
      `${c.other_name} ${c.request_title ?? ''} ${c.last_body ?? ''}`.toLowerCase().includes(q)
    );
  }, [conversations, search]);

  return (
    <div className="mx-auto max-w-2xl pb-6">
      <PageHeader title="Chats" subtitle={subtitle} />

      <Input
        type="search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search chats…"
        aria-label="Search chats"
        autoComplete="off"
        icon={<Search size={18} strokeWidth={1.75} />}
      />

      <div className="mt-5">
        {loading ? (
          <SkeletonRegion label="Loading your chats">
            <SkeletonChatRows count={5} />
          </SkeletonRegion>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<MessageCircle />}
            title={search ? 'No chats match that' : 'No chats yet'}
            description={
              search
                ? 'Try a different name or word.'
                : user?.role === 'shopper'
                ? 'Accept a job and you can message the customer here.'
                : 'Once a shopper takes your request you can message them here.'
            }
          />
        ) : (
          <Card padding="none" hover={false} className="overflow-hidden">
            <ul>
              {filtered.map((c) => (
                <li key={c.order_id} className="border-b border-line last:border-0">
                  <ConversationRow
                    conversation={c}
                    myId={user?.id}
                    to={`${base}/orders/${c.order_id}/messages`}
                  />
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}
