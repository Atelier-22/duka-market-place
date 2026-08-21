import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Phone, Send, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { GlassCard } from '../../components/ui/GlassCard';
import { GlassButton } from '../../components/ui/GlassButton';
import { ChatMessage } from '../../components/domain/ChatMessage';
import { LoadingState } from '../../components/ui/LoadingState';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../hooks/useConversations';

/** How often an open thread checks for the other side's replies. */
const POLL_MS = 5_000;

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export function OrderMessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState('');
  const [uploading, setUploading] = useState(false);
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Reuse the inbox to name the person at the top without another endpoint.
  const { conversations } = useConversations();
  const conversation = conversations.find((c) => c.order_id === id);

  const base = user?.role === 'shopper' ? '/shopper' : '/app';

  const load = useCallback(() => {
    api.get(`/orders/${id}/messages`)
      .then((res) => setMessages(res.data.messages))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);
  useEffect(() => {
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  // Opening the thread clears its unread badge.
  useEffect(() => {
    if (!id) return;
    api.post(`/orders/${id}/messages/read`).catch(() => undefined);
  }, [id, messages.length]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), [messages.length]);

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await api.post('/uploads?folder=chat', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setAttachment(res.data.url);
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() && !attachment) return;
    const text = body;
    const image = attachment;
    setBody('');
    setAttachment('');
    setSending(true);
    try {
      await api.post(`/orders/${id}/messages`, {
        body: text.trim() || undefined,
        attachmentUrl: image || undefined,
      });
      load();
    } catch (err) {
      // Put the draft back rather than silently losing what they typed.
      setBody(text);
      setAttachment(image);
      push(apiErrorMessage(err), 'error');
    } finally {
      setSending(false);
    }
  }

  const name = conversation?.other_name ?? 'Conversation';

  return (
    <div className="mx-auto flex h-[calc(100vh-6rem)] max-w-2xl flex-col pb-4">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => navigate(`${base}/messages`)}
          className="text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep"
        >
          <ArrowLeft size={15} strokeWidth={2} className="inline" /> Chats
        </button>
      </div>

      <GlassCard hover={false} padding="md" className="flex flex-1 flex-col overflow-hidden">
        {/* Thread header — who you are talking to, and a way back to the order */}
        <div className="flex items-center gap-3 border-b border-brand-green/10 pb-3">
          {conversation?.other_avatar ? (
            <img src={conversation.other_avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-green to-brand-green-fresh text-xs font-semibold text-white">
              {initials(name)}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate font-semibold text-brand-green-deep">{name}</p>
            <p className="truncate text-xs text-brand-ink/45">
              {conversation?.request_title ?? `Order #${id?.slice(0, 8)}`}
            </p>
          </div>
          {conversation?.other_phone && (
            <a
              href={`tel:${conversation.other_phone}`}
              title="Call — opens your phone's dialler"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-brand-green/15 text-brand-green-deep transition-colors hover:bg-brand-green-mist"
            >
              <Phone size={16} strokeWidth={1.75} />
            </a>
          )}
          <Link
            to={`${base}/orders/${id}`}
            className="rounded-full border border-brand-green/15 px-3 py-1.5 text-xs font-medium text-brand-green-deep transition-colors hover:bg-brand-green-mist"
          >
            Order
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto pr-1 pt-3">
          {loading ? (
            <LoadingState />
          ) : messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-brand-ink/40">No messages yet — say hello.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {messages.map((m) => (
                <ChatMessage
                  key={m.id}
                  body={m.body}
                  attachmentUrl={m.attachment_url}
                  isOwn={m.sender_id === user?.id}
                  senderName={m.sender_name}
                  createdAt={m.created_at}
                />
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {attachment && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand-green-mist/60 p-2">
            <img src={attachment} alt="" className="h-14 w-14 rounded-lg object-cover" />
            <span className="flex-1 text-xs text-brand-ink/55">Photo ready to send</span>
            <button
              type="button"
              onClick={() => setAttachment('')}
              aria-label="Remove photo"
              className="flex h-7 w-7 items-center justify-center rounded-full text-brand-ink/45 hover:bg-brand-white hover:text-brand-red"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="mt-3 flex items-center gap-2 border-t border-brand-green/10 pt-3">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = '';
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Send a photo"
            aria-label="Send a photo"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-green/15 text-brand-green-deep transition-colors hover:bg-brand-green-mist disabled:opacity-50"
          >
            <ImagePlus size={17} strokeWidth={1.75} />
          </button>

          <input
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={uploading ? 'Uploading photo…' : 'Type a message…'}
            className="min-w-0 flex-1 rounded-full border border-brand-green/15 bg-brand-white/70 px-4 py-2.5 text-sm text-brand-ink outline-none transition-colors placeholder:text-brand-ink/35 focus:border-brand-green-fresh"
          />

          <GlassButton type="submit" size="sm" disabled={sending || uploading || (!body.trim() && !attachment)}>
            <Send size={15} strokeWidth={2} />
          </GlassButton>
        </form>
      </GlassCard>
    </div>
  );
}
