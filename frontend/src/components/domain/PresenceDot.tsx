interface PresenceDotProps {
  online: boolean;
  /** `avatar` pins the dot to the corner of an avatar; `inline` sits in text. */
  variant?: 'avatar' | 'inline';
  className?: string;
}

/**
 * Green when the person is at their phone, red when they are not.
 *
 * Colour alone would leave red/green colour-blind users with nothing, so the
 * dot always carries a title and a screen-reader label as well.
 */
export function PresenceDot({ online, variant = 'inline', className = '' }: PresenceDotProps) {
  const label = online ? 'Online' : 'Offline';
  const colour = online
    // A soft ring makes the online state read as "live" rather than decorative.
    ? 'bg-brand-green-fresh shadow-[0_0_0_3px_rgba(34,197,94,0.22)]'
    : 'bg-brand-red';

  if (variant === 'avatar') {
    return (
      <span
        title={label}
        aria-label={label}
        role="img"
        className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-brand-white ${colour} ${className}`}
      />
    );
  }

  return (
    <span title={label} className={`inline-flex items-center gap-1.5 ${className}`}>
      <span role="img" aria-label={label} className={`h-2 w-2 shrink-0 rounded-full ${colour}`} />
    </span>
  );
}

/** "last seen 4m ago" — only worth showing when they are not online now. */
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
