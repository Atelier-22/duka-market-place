import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ImagePlus, Mic, Phone, Send, Square, Trash2, X } from 'lucide-react';
import { api, apiErrorMessage } from '../../services/api';
import { Card } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { ChatMessage } from '../../components/domain/ChatMessage';
import { VoiceNotePlayer } from '../../components/domain/VoiceNotePlayer';
import { PresenceDot, lastSeenLabel } from '../../components/domain/PresenceDot';
import { ShopperProfileModal } from '../../components/domain/ShopperProfileModal';
import { tickStateFor } from '../../components/domain/MessageTicks';
import { Bone, BoneCircle, BoneText, SkeletonRegion } from '../../components/ui/Skeleton';
import { useToast } from '../../components/ui/Toast';
import { useAuth } from '../../context/AuthContext';
import { useConversations } from '../../hooks/useConversations';
import { Recording, formatDuration, useVoiceRecorder, voiceRecordingSupported } from '../../hooks/useVoiceRecorder';

const POLL_MS = 5_000;

interface PendingVoice {
  previewUrl: string;
  durationMs: number;

  upload: Promise<string>;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
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

  const holdRecording = useCallback((result: Recording) => {
    const upload = uploadBlob(result.blob, result.filename);

    upload.catch(() => undefined);
    setVoice({ previewUrl: result.previewUrl, durationMs: result.durationMs, upload });
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

  useEffect(() => () => { if (voice) URL.revokeObjectURL(voice.previewUrl); }, [voice]);

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

  function discardVoice() {
    if (voice) URL.revokeObjectURL(voice.previewUrl);
    setVoice(null);
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() && !attachment && !voice) return;
    const text = body;
    const image = attachment;
    const note = voice;
    setBody('');
    setAttachment('');
    setVoice(null);

    const localId = `pending-${Date.now()}`;
    setPending((current) => [...current, {
      id: localId,
      body: text.trim() || null,
      attachment_url: note ? note.previewUrl : image || null,
      attachment_type: note ? 'audio' : image ? 'image' : null,
      attachment_duration_ms: note ? Math.round(note.durationMs) : null,
      sender_id: user?.id,
      sender_name: user?.fullName ?? 'You',
      created_at: new Date().toISOString(),
      pending: true,
    }]);

    try {

      const uploadedUrl = note ? await note.upload : image;

      if (uploadedUrl && uploadedUrl.startsWith('blob:')) {
        throw new Error('That attachment did not finish uploading — try again.');
      }
      if (!text.trim() && !uploadedUrl) {
        throw new Error('That attachment did not finish uploading — try again.');
      }

      await api.post(`/orders/${id}/messages`, {
        body: text.trim() || undefined,
        attachmentUrl: uploadedUrl || undefined,
        attachmentType: note ? 'audio' : image ? 'image' : undefined,

        attachmentDurationMs: note ? safeDurationMs(note.durationMs) : undefined,
      });
      setPending((current) => current.filter((m) => m.id !== localId));
      if (note) URL.revokeObjectURL(note.previewUrl);
      load();
    } catch (err) {

      setPending((current) => current.filter((m) => m.id !== localId));
      setBody(text);
      setAttachment(image);
      setVoice(note);
      push(apiErrorMessage(err), 'error');
    }
  }

  const name = conversation?.other_name ?? 'Conversation';

  const viewableShopperId = conversation?.other_role === 'shopper' ? conversation.other_id : null;
  const canSend = Boolean(body.trim() || attachment || voice);
  const composerDisabled = recorder.recording;
  const visible = [...messages, ...pending];

  return (

    <div className="mx-auto flex h-[calc(100dvh-13rem)] min-h-[24rem] max-w-2xl flex-col pb-4 lg:h-[calc(100dvh-6rem)]">
      <div className="mb-2 flex items-center gap-2">
        <button
          onClick={() => navigate(`${base}/messages`)}
          className="text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep"
        >
          <ArrowLeft size={15} strokeWidth={2} className="inline" /> Chats
        </button>
      </div>

      <Card hover={false} padding="md" className="flex flex-1 flex-col overflow-hidden">

        <div className="flex items-center gap-3 border-b border-brand-green/10 pb-3">

          <button
            type="button"
            onClick={() => viewableShopperId && setShowProfile(true)}
            disabled={!viewableShopperId}
            aria-label={viewableShopperId ? `View ${name}'s profile` : undefined}
            className="relative shrink-0"
          >
            {headerLoading ? (
              <BoneCircle size={40} />
            ) : conversation?.other_avatar ? (
              <img src={conversation.other_avatar} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-green text-xs font-semibold text-white">
                {initials(name)}
              </span>
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
                className="block max-w-full truncate text-left font-semibold text-brand-green-deep disabled:cursor-default"
              >
                {name}
              </button>
            )}
            <p className="flex items-center gap-1.5 truncate text-xs">
              <PresenceDot online={presence.online} />
              <span className={presence.online ? 'font-medium text-brand-green-fresh' : 'text-brand-ink/45'}>
                {presence.online ? 'Online' : lastSeenLabel(presence.lastSeenAt)}
              </span>
              <span className="truncate text-brand-ink/35">
                · {conversation?.request_title ?? `Order #${id?.slice(0, 8)}`}
              </span>
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
            <SkeletonRegion label="Loading messages" className="flex flex-col gap-3">
              <Bone className="h-12 w-3/5 self-start rounded-2xl" />
              <Bone className="h-16 w-4/5 self-end rounded-2xl" />
              <Bone className="h-12 w-1/2 self-start rounded-2xl" />
              <Bone className="h-12 w-3/5 self-end rounded-2xl" />
            </SkeletonRegion>
          ) : visible.length === 0 ? (
            <p className="py-16 text-center text-sm text-brand-ink/40">No messages yet — say hello.</p>
          ) : (
            <div className="flex flex-col gap-3">
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

        {voice && (
          <div className="mt-3 flex items-center gap-3 rounded-xl bg-brand-green-mist/60 p-2">

            <VoiceNotePlayer src={voice.previewUrl} durationMs={voice.durationMs} tone="other" />
            <button
              type="button"
              onClick={discardVoice}
              aria-label="Discard voice note"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-brand-ink/45 hover:bg-brand-white hover:text-brand-red"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        )}

        {recorder.recording ? (
          <div className="mt-3 flex items-center gap-3 border-t border-brand-green/10 pt-3">
            <button
              type="button"
              onClick={recorder.cancel}
              aria-label="Cancel recording"
              title="Cancel"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-red/25 text-brand-red transition-colors hover:bg-brand-red/10"
            >
              <Trash2 size={16} strokeWidth={1.75} />
            </button>
            <div className="flex min-w-0 flex-1 items-center gap-2 rounded-full bg-brand-red/8 px-4 py-2.5">
              <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-brand-red" />
              <span className="text-sm font-medium tabular-nums text-brand-ink/70">
                {formatDuration(recorder.elapsedMs)}
              </span>
              <span className="truncate text-xs text-brand-ink/40">
                Recording — speak in any language, then tap the square to stop
              </span>
            </div>
            <Button type="button" size="sm" onClick={finishRecording}>
              <Square size={14} strokeWidth={2.5} />
            </Button>
          </div>
        ) : (
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
              disabled={uploading || composerDisabled}
              title="Send a photo"
              aria-label="Send a photo"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-green/15 text-brand-green-deep transition-colors hover:bg-brand-green-mist disabled:opacity-50"
            >
              <ImagePlus size={17} strokeWidth={1.75} />
            </button>

            {voiceRecordingSupported() && (
              <button
                type="button"
                onClick={startRecording}
                disabled={uploading}
                title="Record a voice note"
                aria-label="Record a voice note"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-brand-green/15 text-brand-green-deep transition-colors hover:bg-brand-green-mist disabled:opacity-50"
              >
                <Mic size={17} strokeWidth={1.75} />
              </button>
            )}

            <input
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={uploading ? 'Uploading…' : 'Type a message…'}
              className="min-w-0 flex-1 rounded-full border border-brand-green/15 bg-brand-white/70 px-4 py-2.5 text-sm text-brand-ink outline-none transition-colors placeholder:text-brand-ink/35 focus:border-brand-green-fresh"
            />

            <Button type="submit" size="sm" disabled={uploading || !canSend}>
              <Send size={15} strokeWidth={2} />
            </Button>
          </form>
        )}
      </Card>

      {showProfile && viewableShopperId && (
        <ShopperProfileModal shopperId={viewableShopperId} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}
