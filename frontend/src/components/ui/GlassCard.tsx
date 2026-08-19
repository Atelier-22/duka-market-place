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
  green: 'shadow-glow',
  yellow: 'shadow-[0_0_40px_-10px_rgba(242,183,5,0.4)]',
  red: 'shadow-[0_0_40px_-10px_rgba(214,73,59,0.35)]',
};

const paddingMap: Record<string, string> = {
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

/**
 * The signature surface of the whole product. Every card-like element in
 * Duka is a GlassCard — this is what makes the glass language feel
 * intentional rather than a one-off effect on the landing page.
 */
export function GlassCard({
  children,
  deep = false,
  hover = true,
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
