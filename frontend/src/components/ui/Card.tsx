import { HTMLAttributes, ReactNode } from 'react';

export type CardTone = 'default' | 'brand' | 'success' | 'warning' | 'danger';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: CardTone;
  hover?: boolean;
  elevated?: boolean;
  deep?: boolean;
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
