import { Star } from 'lucide-react';

interface RatingStarsProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  interactive?: boolean;
  onChange?: (v: number) => void;
}

const STARS = [1, 2, 3, 4, 5];

export function RatingStars({ value, count, size = 'sm', interactive = false, onChange }: RatingStarsProps) {
  const filled = Math.round(value);
  const px = size === 'sm' ? 14 : 28;

  const star = (i: number) => (
    <Star
      size={px}
      strokeWidth={1.75}
      className={i <= filled ? 'fill-brand-yellow text-brand-yellow' : 'fill-transparent text-line-strong'}
      aria-hidden
    />
  );

  return (
    <span className="inline-flex items-center">
      {interactive ? (
        <span className="inline-flex items-center gap-0.5">
          {STARS.map((i) => (
            <button
              key={i}
              type="button"
              onClick={() => onChange?.(i)}
              aria-label={`${i} star${i > 1 ? 's' : ''}`}
              aria-pressed={i === filled}
              className="flex h-10 w-10 items-center justify-center rounded-full transition-[background-color,transform] duration-150 ease-standard hover:bg-surface-2 active:scale-[0.94] focus-visible:outline-none focus-visible:shadow-focus"
            >
              {star(i)}
            </button>
          ))}
        </span>
      ) : (
        <span role="img" aria-label={`${filled} of 5 stars`} className="inline-flex items-center gap-0.5">
          {STARS.map((i) => (
            <span key={i} className="flex">{star(i)}</span>
          ))}
        </span>
      )}
      {count !== undefined && <span className="ml-1.5 text-caption text-ink-3">({count})</span>}
    </span>
  );
}
