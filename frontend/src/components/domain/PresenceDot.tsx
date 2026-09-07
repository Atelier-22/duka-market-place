interface PresenceDotProps {
  online: boolean;
  /** `avatar` pins the dot to the corner of a `relative` avatar wrapper; `inline` sits in text. */
  variant?: 'avatar' | 'inline';
  className?: string;
}

/** Presence: fresh green (with a soft halo inline) when online, muted when away. */
export function PresenceDot({ online, variant = 'inline', className = '' }: PresenceDotProps) {
  const label = online ? 'Online' : 'Offline';
  const colour = online ? 'bg-brand-green-fresh' : 'bg-ink-3';

  if (variant === 'avatar') {
    return (
      <span
        title={label}
        aria-label={label}
        role="img"
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-surface ${colour} ${className}`}
      />
    );
  }

  return (
    <span title={label} className={`inline-flex shrink-0 items-center ${className}`}>
      <span
        role="img"
        aria-label={label}
        className={`h-2 w-2 shrink-0 rounded-full ${colour} ${online ? 'ring-[3px] ring-brand-green-fresh/20' : ''}`}
      />
    </span>
  );
}

export function lastSeenLabel(iso: string | null | undefined): string {
  if (!iso) return 'Offline';
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return 'Last seen just now';
  if (mins < 60) return `Last seen ${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Last seen ${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Last seen yesterday';
  return `Last seen ${new Date(iso).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}`;
}
