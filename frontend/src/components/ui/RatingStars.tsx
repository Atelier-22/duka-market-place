interface RatingStarsProps {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  interactive?: boolean;
  onChange?: (v: number) => void;
}

export function RatingStars({ value, count, size = 'sm', interactive = false, onChange }: RatingStarsProps) {
  const starSize = size === 'sm' ? 'text-sm' : 'text-2xl';
  return (
    <span className={`inline-flex items-center gap-1 ${starSize}`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onChange?.(i)}
          className={interactive ? 'cursor-pointer' : 'cursor-default'}
          aria-label={`${i} star${i > 1 ? 's' : ''}`}
        >
          <span className={i <= Math.round(value) ? 'text-brand-yellow' : 'text-brand-ink/15'}>★</span>
        </button>
      ))}
      {count !== undefined && <span className="ml-1 text-xs text-brand-ink/50">({count})</span>}
    </span>
  );
}
