import { HTMLAttributes, ReactNode } from 'react';

/**
 * The one container. Solid surface, hairline border, a whisper of shadow.
 * `tone` colours the border for cards that need attention.
 */
export type CardTone = 'default' | 'brand' | 'success' | 'warning' | 'danger';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: CardTone;
  /** Lifts on hover; set automatically when there is an onClick. */
  hover?: boolean;
  /** Stronger shadow for things that sit above the page (menus, popovers). */
  elevated?: boolean;
  /** Deep brand panel with white text. */
  deep?: boolean;
  /** Legacy alias for `tone`. */
  glow?: 'none' | 'green' | 'yellow' | 'red';
}

const TONE: Record<CardTone, string> = {
  default: '',
  brand: 'border-brand-green/40',
  success: 'border-brand-green-fresh/50',
  warning: 'border-brand-yellow/70',
  danger: 'border-brand-red/40',
};

const GLOW_TO_TONE: Record<string, CardTone> = {
  none: 'default',
  green: 'success',
  yellow: 'warning',
  red: 'danger',
};

const PADDING: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-6 sm:p-7',
};

export function Card({
  children,
  padding = 'md',
  tone,
  hover,
  elevated = false,
  deep = false,
  glow,
  className = '',
  onClick,
  ...rest
}: CardProps) {
  const resolvedTone: CardTone = tone ?? (glow ? GLOW_TO_TONE[glow] : 'default');
  const interactive = hover ?? !!onClick;
  return (
    <div
      onClick={onClick}
      className={[
        deep ? 'surface-deep' : 'surface',
        'rounded-2xl',
        deep ? '' : elevated ? 'shadow-raised' : 'shadow-card',
        interactive ? 'surface-hover' : '',
        onClick ? 'cursor-pointer' : '',
        deep ? '' : TONE[resolvedTone],
        PADDING[padding],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
