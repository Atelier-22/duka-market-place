import { FormEvent, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ClipboardList, ImagePlus, MessageCircle, Mic, Phone, Send, Square, Trash2, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Avatar } from '../../components/ui/Avatar';
import { EmptyState } from '../../components/ui/EmptyState';
import { fieldClasses } from '../../components/ui/Input';
import { Bone, BoneCircle, BoneText, SkeletonRegion } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { ChatMessage } from '../../components/domain/ChatMessage';
import { VoiceNotePlayer } from '../../components/domain/VoiceNotePlayer';
import { PresenceDot, lastSeenLabel } from '../../components/domain/PresenceDot';
import { ShopperProfileModal } from '../../components/domain/ShopperProfileModal';
import { tickStateFor } from '../../components/domain/MessageTicks';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../hooks/useConversations';
import { Recording, formatDuration, useVoiceRecorder, voiceRecordingSupported } from '../../hooks/useVoiceRecorder';

const POLL_MS = 5_000;
const COMPOSER_MAX_PX = 160;

const ICON_BASE =
  'flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-[background-color,border-color,color,transform,opacity] duration-150 ease-standard active:scale-[0.96] focus-visible:outline-none focus-visible:shadow-focus disabled:pointer-events-none disabled:opacity-50';
const ICON_PRIMARY = `${ICON_BASE} bg-brand-green text-white shadow-card hover:bg-brand-green-deep`;
const ICON_SECONDARY = `${ICON_BASE} border border-line bg-surface text-brand-green-deep hover:border-line-strong hover:bg-surface-2`;
const ICON_TERTIARY = `${ICON_BASE} text-ink-2 hover:bg-surface-2 hover:text-brand-green-deep`;
const ICON_DANGER = `${ICON_BASE} border border-brand-red/30 bg-surface text-brand-red hover:bg-danger-soft`;
const REMOVE_BUTTON =
  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-3 transition-colors hover:bg-surface hover:text-brand-red focus-visible:outline-none focus-visible:shadow-focus';

interface PendingVoice {
  previewUrl: string;
  durationMs: number;
  upload: Promise<string>;
}

interface OutgoingMessage {
  text?: string;
  imageUrl?: string;
  note?: PendingVoice | null;
}

function safeDurationMs(ms: number): number | undefined {
  if (!Number.isFinite(ms)) return undefined;
  return Math.min(10 * 60_000, Math.max(0, Math.round(ms)));
}

export function OrderMessagesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { push } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [presence, setPresence] = useState<{ online: boolean; lastSeenAt: string | null }>({
    online: false,
    lastSeenAt: null,
  });
  const [body, setBody] = useState('');
  const [attachment, setAttachment] = useState('');
  const [voice, setVoice] = useState<PendingVoice | null>(null);
  const [uploading, setUploading] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);

  const [pending, setPending] = useState<any[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const deliverRef = useRef<((payload: OutgoingMessage) => void) | null>(null);
  const objectUrls = useRef<string[]>([]);

  const holdRecording = useCallback((result: Recording) => {
    const upload = uploadBlob(result.blob, result.filename);
    upload.catch(() => undefined);
    objectUrls.current.push(result.previewUrl);
    deliverRef.current?.({
      note: { previewUrl: result.previewUrl, durationMs: result.durationMs, upload },
    });
  }, []);

  const recorder = useVoiceRecorder(holdRecording);

  const { conversations, loading: conversationsLoading } = useConversations();
  const conversation = conversations.find((c) => c.order_id === id);
  const headerLoading = !conversation && conversationsLoading;

  const base = user?.role === 'shopper' ? '/shopper' : '/app';

  const load = useCallback(() => {
    api.get(`/orders/${id}/messages`)
      .then((res) => {
        setMessages(res.data.messages);
        if (res.data.presence) setPresence(res.data.presence);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(load, [load]);
  useEffect(() => {
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (!id) return;
    api.post(`/orders/${id}/messages/read`).catch(() => undefined);
  }, [id, messages.length]);

  useEffect(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }),
    [messages.length, pending.length]);

  useEffect(() => () => { objectUrls.current.forEach((u) => URL.revokeObjectURL(u)); }, []);

  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight + 2, COMPOSER_MAX_PX)}px`;
  }, [body, recorder.recording]);

  async function uploadBlob(file: Blob, filename: string): Promise<string> {
    const form = new FormData();
    form.append('file', file, filename);
    const res = await api.post('/uploads?folder=chat', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.url;
  }

  async function handleFile(file: File) {
    setUploading(true);
    try {
      setAttachment(await uploadBlob(file, file.name));
    } catch (err) {
      push(apiErrorMessage(err), 'error');
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    const ok = await recorder.start();
    if (!ok && recorder.error) push(recorder.error, 'error');
  }

  function finishRecording() {
    void recorder.stop().then((result) => { if (result) holdRecording(result); });
  }

  function sendHeldVoice() {
    const note = voice;
    if (!note) return;
    setVoice(null);
    void deliver({ note });
  }

  function discardVoice() {
    setVoice(null);
  }

  const name = conversation?.other_name ?? 'Conversation';

  const viewableShopperId = conversation?.other_role === 'shopper' ? conversation.other_id : null;
  const canSend = Boolean(body.trim() || attachment || voice);
  const composerDisabled = recorder.recording;
  const visible = [...messages, ...pending];

  const deliver = useCallback(async ({ text = '', imageUrl = '', note = null }: OutgoingMessage) => {
    const trimmed = text.trim();
    if (!trimmed && !imageUrl && !note) return;

    const localId = `pending-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
    setPending((current) => [...current, {
      id: localId,
      body: trimmed || null,
      attachment_url: note ? note.previewUrl : imageUrl || null,
      attachment_type: note ? 'audio' : imageUrl ? 'image' : null,
      attachment_duration_ms: note ? Math.round(note.durationMs) : null,
      sender_id: user?.id,
      sender_name: user?.fullName ?? 'You',
      created_at: new Date().toISOString(),
      pending: true,
    }]);

    try {
      const uploadedUrl = note ? await note.upload : imageUrl;

      if (uploadedUrl && uploadedUrl.startsWith('blob:')) {
        throw new Error('That attachment did not finish uploading — try again.');
      }
      if (!trimmed && !uploadedUrl) {
        throw new Error('That attachment did not finish uploading — try again.');
      }

      await api.post(`/orders/${id}/messages`, {
        body: trimmed || undefined,
        attachmentUrl: uploadedUrl || undefined,
        attachmentType: note ? 'audio' : imageUrl ? 'image' : undefined,
        attachmentDurationMs: note ? safeDurationMs(note.durationMs) : undefined,
      });

      setPending((current) => current.filter((m) => m.id !== localId));
      load();
    } catch (err) {
      setPending((current) => current.filter((m) => m.id !== localId));
      if (trimmed) setBody((b) => b || trimmed);
      if (imageUrl) setAttachment(imageUrl);
      if (note) setVoice(note);
      push(apiErrorMessage(err), 'error');
    }
  }, [id, load, push, user?.id, user?.fullName]);

  deliverRef.current = deliver;

  async function submit() {
    if (!body.trim() && !attachment && !voice) return;
    const text = body;
    const image = attachment;
    const note = voice;
    setBody('');
    setAttachment('');
    setVoice(null);
    await deliver({ text, imageUrl: image, note });
  }

  function handleSend(e: FormEvent) {
    e.preventDefault();
    void submit();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (!uploading && canSend) void submit();
  }

  return (
    <div
      className="-mx-4 -mt-5 flex min-h-[22rem] flex-col overflow-hidden bg-page [--chat-gap:6.75rem] [--chat-safe:env(safe-area-inset-bottom)] sm:mx-auto sm:mt-0 sm:max-w-2xl sm:rounded-2xl sm:border sm:border-line sm:shadow-card sm:[--chat-gap:8rem] lg:[--chat-gap:5rem] lg:[--chat-safe:0px]"
      style={{ height: 'calc(100dvh - var(--duka-topbar, 56px) - var(--chat-gap) - var(--chat-safe))' }}
    >
      <header className="flex shrink-0 items-center gap-2 border-b border-line bg-surface px-2 py-2 sm:px-3">
        <button
          type="button"
          onClick={() => navigate(`${base}/messages`)}
          aria-label="Back to chats"
          title="Back to chats"
          className={ICON_TERTIARY}
        >
          <ArrowLeft size={20} strokeWidth={2} />
        </button>

        <button
          type="button"
          onClick={() => viewableShopperId && setShowProfile(true)}
          disabled={!viewableShopperId}
          aria-label={viewableShopperId ? `View ${name}'s profile` : undefined}
          className="relative shrink-0 rounded-full focus-visible:outline-none focus-visible:shadow-focus disabled:cursor-default"
        >
          {headerLoading ? (
            <BoneCircle size={40} />
          ) : (
            <Avatar name={name} src={conversation?.other_avatar} size={40} />
          )}
          <PresenceDot online={presence.online} variant="avatar" />
        </button>

        <div className="min-w-0 flex-1">
          {headerLoading ? (
            <BoneText w="w-32" className="h-4" />
          ) : (
            <button
              type="button"
              onClick={() => viewableShopperId && setShowProfile(true)}
              disabled={!viewableShopperId}
              className="block max-w-full truncate text-left text-body font-semibold text-ink disabled:cursor-default"
            >
              {name}
            </button>
          )}
          <p className="flex items-center gap-1.5 text-caption">
            <PresenceDot online={presence.online} />
            <span className={`shrink-0 ${presence.online ? 'font-medium text-brand-green-fresh' : 'text-ink-3'}`}>
              {presence.online ? 'Online' : lastSeenLabel(presence.lastSeenAt)}
            </span>
            <span className="min-w-0 truncate text-ink-3">
              · {conversation?.request_title ?? `Order #${id?.slice(0, 8)}`}
            </span>
          </p>
        </div>

        {conversation?.other_phone && (
          <a
            href={`tel:${conversation.other_phone}`}
            title="Call — opens your phone's dialler"
            aria-label={`Call ${name}`}
            className={ICON_SECONDARY}
          >
            <Phone size={18} strokeWidth={1.75} />
          </a>
        )}
        <Link
          to={`${base}/orders/${id}`}
          title="Open the order"
          aria-label="Open the order"
          className="inline-flex h-11 shrink-0 items-center gap-1.5 rounded-full border border-line bg-surface px-3 text-small font-semibold text-brand-green-deep transition-colors duration-150 ease-standard hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:shadow-focus"
        >
          <ClipboardList size={18} strokeWidth={1.75} />
          <span className="hidden sm:inline">Order</span>
        </Link>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-4 sm:px-4">
        {loading ? (
          <SkeletonRegion label="Loading messages" className="flex flex-col gap-3">
            <Bone className="h-12 w-3/5 self-start rounded-2xl" />
            <Bone className="h-16 w-4/5 self-end rounded-2xl" />
            <Bone className="h-12 w-1/2 self-start rounded-2xl" />
            <Bone className="h-12 w-3/5 self-end rounded-2xl" />
          </SkeletonRegion>
        ) : visible.length === 0 ? (
          <div className="flex h-full items-center">
            <div className="w-full">
              <EmptyState
                size="sm"
                icon={<MessageCircle />}
                title="No messages yet"
                description="Say hello, ask a question, or send a photo."
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {visible.map((m) => (
              <ChatMessage
                key={m.id}
                body={m.body}
                attachmentUrl={m.attachment_url}
                attachmentType={m.attachment_type}
                attachmentDurationMs={m.attachment_duration_ms}
                isOwn={m.sender_id === user?.id}
                senderName={m.sender_name}
                createdAt={m.created_at}
                tickState={tickStateFor(m)}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-line bg-surface px-3 pb-3 pt-2.5 sm:px-4">
        {attachment && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2">
            <img src={attachment} alt="" className="h-14 w-14 shrink-0 rounded-lg object-cover" />
            <span className="min-w-0 flex-1 text-small text-ink-2">Photo ready to send</span>
            <button type="button" onClick={() => setAttachment('')} aria-label="Remove photo" className={REMOVE_BUTTON}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        {voice && (
          <div className="mb-2 flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-2 pl-3">
            <VoiceNotePlayer src={voice.previewUrl} durationMs={voice.durationMs} tone="other" />
            <button
              type="button"
              onClick={sendHeldVoice}
              aria-label="Send voice note"
              title="Send voice note"
              className="flex h-9 shrink-0 items-center rounded-full bg-brand-green px-3 text-caption font-semibold text-white transition-transform active:scale-95"
            >
              Send
            </button>
            <button type="button" onClick={discardVoice} aria-label="Discard voice note" className={REMOVE_BUTTON}>
              <X size={16} strokeWidth={2} />
            </button>
          </div>
        )}

        {recorder.recording ? (
          <div className="flex items-center gap-2" role="status" aria-live="polite">
            <button
              type="button"
              onClick={recorder.cancel}
              aria-label="Cancel recording"
              title="Cancel"
              className={ICON_DANGER}
            >
              <Trash2 size={18} strokeWidth={1.75} />
            </button>
            <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface-2 px-3.5">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand-red" aria-hidden />
              <span className="text-small font-semibold tabular-nums text-ink">
                {formatDuration(recorder.elapsedMs)}
              </span>
              <span className="truncate text-caption text-ink-3">
                Recording — tap the square to send
              </span>
            </div>
            <button
              type="button"
              onClick={finishRecording}
              aria-label="Stop recording"
              title="Stop"
              className={ICON_PRIMARY}
            >
              <Square size={16} strokeWidth={2.5} />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSend} className="flex items-end gap-2">
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
              disabled={uploading || composerDisabled}
              title="Send a photo"
              aria-label="Send a photo"
              className={ICON_SECONDARY}
            >
              <ImagePlus size={19} strokeWidth={1.75} />
            </button>

            {voiceRecordingSupported() && (
              <button
                type="button"
                onClick={startRecording}
                disabled={uploading}
                title="Record a voice note"
                aria-label="Record a voice note"
                className={ICON_SECONDARY}
              >
                <Mic size={19} strokeWidth={1.75} />
              </button>
            )}

            <textarea
              ref={textareaRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder={uploading ? 'Uploading…' : 'Type a message…'}
              aria-label="Message"
              className={fieldClasses(undefined, 'min-h-[44px] max-h-40 min-w-0 flex-1 resize-none px-3.5 py-2.5 leading-[1.4]')}
            />

            <button
              type="submit"
              disabled={uploading || !canSend}
              aria-label="Send"
              title="Send"
              className={ICON_PRIMARY}
            >
              <Send size={18} strokeWidth={2} />
            </button>
          </form>
        )}
      </div>

      {showProfile && viewableShopperId && (
        <ShopperProfileModal shopperId={viewableShopperId} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
