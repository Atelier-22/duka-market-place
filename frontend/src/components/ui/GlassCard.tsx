import { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  deep?: boolean;
  hover?: boolean;
  glow?: 'none' | 'green' | 'yellow' | 'red';
  padding?: 'sm' | 'md' | 'lg';
}

const glowMap: Record<string, string> = {
  none: '',
  green: 'border-brand-green-fresh/40',
  yellow: 'border-brand-yellow/50',
  red: 'border-brand-red/40',
};

const paddingMap: Record<string, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function GlassCard({
  children,
  deep = false,
  hover = false,
  glow = 'none',
  padding = 'md',
  className = '',
  ...rest
}: GlassCardProps) {
  return (
    <div
      className={[
        deep ? 'glass-deep' : 'glass',
        'rounded-xl2',
        hover ? 'glass-hover' : '',
        glowMap[glow],
        paddingMap[padding],
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </div>
  );
}
