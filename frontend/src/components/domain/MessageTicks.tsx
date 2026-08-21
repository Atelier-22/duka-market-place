import { Check, CheckCheck, Clock } from 'lucide-react';

export type TickState = 'pending' | 'sent' | 'delivered' | 'read';

export function tickStateFor(message: {
  delivered_at?: string | null;
  read_at?: string | null;
  pending?: boolean;
}): TickState {
  if (message.pending) return 'pending';
  if (message.read_at) return 'read';
  if (message.delivered_at) return 'delivered';
  return 'sent';
}

const LABEL: Record<TickState, string> = {
  pending: 'Sending…',
  sent: 'Sent — not delivered yet, they are offline',
  delivered: 'Delivered to their phone',
  read: 'Read',
};

/**
 * The receipt on your own messages, in the language people already know:
 *
 *   one tick        — it left your phone, theirs has not picked it up (offline)
 *   two black ticks — it reached their phone
 *   two green ticks — they opened the chat and read it
 *
 * Rendered outside the bubble next to the timestamp rather than inside it: own
 * bubbles are a green gradient with white text, where a black tick would be
 * invisible and a green one indistinguishable from the background.
 */
export function MessageTicks({ state }: { state: TickState }) {
  const label = LABEL[state];

  if (state === 'pending') {
    return <Clock size={13} strokeWidth={2} className="text-brand-ink/30" aria-label={label} />;
  }
  if (state === 'sent') {
    return <Check size={14} strokeWidth={2.5} className="text-brand-ink/35" aria-label={label} />;
  }
  if (state === 'delivered') {
    return <CheckCheck size={14} strokeWidth={2.5} className="text-brand-ink/70" aria-label={label} />;
  }
  return <CheckCheck size={14} strokeWidth={2.5} className="text-brand-green-fresh" aria-label={label} />;
}

/** Ticks plus a tooltip, for use beside a timestamp. */
export function MessageReceipt({ state }: { state: TickState }) {
  return (
    <span title={LABEL[state]} className="inline-flex items-center">
      <MessageTicks state={state} />
    </span>
  );
}
