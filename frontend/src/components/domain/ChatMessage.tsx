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
  tickState?: TickState;
}

const overlayButton =
  'flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/75 focus-visible:outline-none focus-visible:shadow-focus';

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

  const kind = attachmentUrl ? attachmentType ?? 'image' : null;

  const timestamp = new Date(createdAt).toLocaleTimeString('en-UG', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
      <div
        className={[
          'max-w-[80%] rounded-2xl px-3.5 py-2.5 text-body',
          isOwn ? 'rounded-br-md bg-brand-green text-white' : 'surface rounded-bl-md text-ink',
        ].join(' ')}
      >
        {!isOwn && <p className="mb-0.5 text-caption font-semibold text-ink-2">{senderName}</p>}

        {kind === 'image' && (
          <div className="relative mb-2">
            <button
              type="button"
              onClick={() => setZoomed(true)}
              className="block w-full cursor-zoom-in overflow-hidden rounded-lg focus-visible:outline-none focus-visible:shadow-focus"
              aria-label="Open photo full screen"
            >
              <img
                src={attachmentUrl!}
                alt="Attachment"
                loading="lazy"
                className="max-h-64 w-full rounded-lg object-cover"
              />
            </button>

            <div className="absolute right-1.5 top-1.5 flex gap-1.5">
              <button type="button" onClick={() => setZoomed(true)} title="Zoom" aria-label="Zoom photo" className={overlayButton}>
                <Maximize2 size={14} strokeWidth={2.25} />
              </button>
              <button type="button" onClick={() => downloadUrl(attachmentUrl!)} title="Download photo" aria-label="Download photo" className={overlayButton}>
                <Download size={14} strokeWidth={2.25} />
              </button>
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
            className={`mb-2 flex items-center gap-2 rounded-lg px-3 py-2 text-caption font-semibold transition-colors focus-visible:outline-none focus-visible:shadow-focus ${
              isOwn ? 'bg-white/20 text-white hover:bg-white/30' : 'bg-brand-green-mist text-brand-green-deep hover:bg-surface-2'
            }`}
          >
            <Download size={14} strokeWidth={2} /> Download attachment
          </button>
        )}

        {body && <p className="whitespace-pre-wrap break-words">{body}</p>}
      </div>

      <span className="mt-1 flex items-center gap-1 px-1 text-caption text-ink-3">
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
