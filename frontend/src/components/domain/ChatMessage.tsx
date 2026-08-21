import { useState } from 'react';
import { Download, Maximize2 } from 'lucide-react';
import { ImageLightbox } from '../ui/ImageLightbox';
import { VoiceNotePlayer } from './VoiceNotePlayer';
import { MessageReceipt, TickState } from './MessageTicks';
import { downloadUrl } from '../../utils/download';

interface ChatMessageProps {
  body: string | null;
  attachmentUrl?: string | null;
  attachmentType?: 'image' | 'audio' | 'file' | null;
  attachmentDurationMs?: number | null;
  isOwn: boolean;
  senderName: string;
  createdAt: string;
  /** Only shown on your own messages — you don't get receipts on theirs. */
  tickState?: TickState;
}

export function ChatMessage({
  body,
  attachmentUrl,
  attachmentType,
  attachmentDurationMs,
  isOwn,
  senderName,
  createdAt,
  tickState,
}: ChatMessageProps) {
  const [zoomed, setZoomed] = useState(false);

  // Older messages predate the column and were always photos.
  const kind = attachmentUrl ? attachmentType ?? 'image' : null;

  const timestamp = new Date(createdAt).toLocaleTimeString('en-UG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div
        className={[
          'max-w-[75%] rounded-xl2 px-4 py-2.5 text-sm',
          isOwn
            ? 'bg-gradient-to-br from-brand-green to-brand-green-fresh text-white rounded-br-sm'
            : 'glass rounded-bl-sm text-brand-ink',
        ].join(' ')}
      >
        {!isOwn && <p className="mb-0.5 text-xs font-semibold opacity-60">{senderName}</p>}

        {kind === 'image' && (
          <div className="group relative mb-2">
            <button
              type="button"
              onClick={() => setZoomed(true)}
              className="block w-full cursor-zoom-in overflow-hidden rounded-lg"
              aria-label="Open photo full screen"
            >
              <img
                src={attachmentUrl!}
                alt="Attachment"
                loading="lazy"
                className="max-h-64 w-full rounded-lg object-cover"
              />
            </button>
            {/* Always present on touch, where there is no hover to reveal them. */}
            <div className="absolute right-1.5 top-1.5 flex gap-1.5">
              <span
                onClick={() => setZoomed(true)}
                title="Zoom"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <Maximize2 size={13} strokeWidth={2.25} />
              </span>
              <span
                onClick={() => downloadUrl(attachmentUrl!)}
                title="Download photo"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition-colors hover:bg-black/70"
              >
                <Download size={13} strokeWidth={2.25} />
              </span>
            </div>
          </div>
        )}

        {kind === 'audio' && (
          <div className={body ? 'mb-2' : ''}>
            <VoiceNotePlayer
              src={attachmentUrl!}
              durationMs={attachmentDurationMs}
              tone={isOwn ? 'own' : 'other'}
            />
          </div>
        )}

        {kind === 'file' && (
          <button
            type="button"
            onClick={() => downloadUrl(attachmentUrl!)}
            className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium ${
              isOwn ? 'bg-white/20 text-white' : 'bg-brand-green-mist text-brand-green-deep'
            }`}
          >
            <Download size={14} strokeWidth={2} /> Download attachment
          </button>
        )}

        {body && <p className="whitespace-pre-wrap break-words">{body}</p>}
      </div>

      <span className="mt-1 flex items-center gap-1 text-[11px] text-brand-ink/35">
        {timestamp}
        {isOwn && tickState && <MessageReceipt state={tickState} />}
      </span>

      {zoomed && attachmentUrl && (
        <ImageLightbox
          src={attachmentUrl}
          alt={`Photo from ${senderName}`}
          caption={`${senderName} · ${timestamp}`}
          onClose={() => setZoomed(false)}
        />
      )}
    </div>
  );
}
