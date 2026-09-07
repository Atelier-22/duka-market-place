import { HTMLAttributes, ReactNode } from 'react';

interface GlassCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  deep?: boolean;
  hover?: boolean;
  glow?: 'none' | 'green' | 'yellow' | 'red';
  padding?: 'sm' | 'md' | 'lg';
}

/**
 * Marks a card as significant. These were 40px coloured glows bleeding out of
 * the card — decoration doing the job of hierarchy. A card that matters now
 * says so with its border, which reads at a glance and costs nothing to paint.
 */
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

/**
 * The standard surface. Every card-like element in Duka is one of these, so
 * the panel treatment stays consistent instead of being reinvented per page.
 *
 * `hover` defaults to off. It used to default on, which lifted every card in
 * the app three pixels under the pointer — including the great majority that
 * are not clickable. Movement should mean something is pressable, so it is now
 * opt-in for the cards that actually are.
 */
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
