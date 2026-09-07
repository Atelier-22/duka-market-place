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

export function MessageReceipt({ state }: { state: TickState }) {
  return (
    <span title={LABEL[state]} className="inline-flex items-center">
      <MessageTicks state={state} />
    </span>
  );
}
