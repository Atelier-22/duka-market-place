import { BadgeCheck } from 'lucide-react';

export function VerifiedBadge({ size = 'md', className = '' }: { size?: 'sm' | 'md'; className?: string }) {
  const compact = size === 'sm';
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-brand-green text-white ${compact ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-caption'} font-semibold ${className}`}
      title="This store's details were checked by Duka"
    >
      <BadgeCheck size={compact ? 12 : 14} strokeWidth={2.4} />
      Verified by Duka
    </span>
  );
}
