interface ChatMessageProps {
  body: string | null;
  attachmentUrl?: string | null;
  isOwn: boolean;
  senderName: string;
  createdAt: string;
}

export function ChatMessage({ body, attachmentUrl, isOwn, senderName, createdAt }: ChatMessageProps) {
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
        {attachmentUrl && (
          <img src={attachmentUrl} alt="Attachment" className="mb-2 max-h-48 rounded-lg object-cover" />
        )}
        {body && <p>{body}</p>}
      </div>
      <span className="mt-1 text-[11px] text-brand-ink/35">
        {new Date(createdAt).toLocaleTimeString('en-UG', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}
