import { ButtonHTMLAttributes, ReactNode } from 'react';

interface GlassButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'ghost' | 'glass' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const variantClasses: Record<string, string> = {
  primary: 'bg-brand-green text-white hover:bg-brand-green-deep',
  secondary:
    'bg-brand-white text-brand-green-deep border border-brand-green/20 hover:bg-brand-green-mist',
  ghost: 'bg-transparent text-brand-green-deep hover:bg-brand-green-mist',
  glass: 'glass text-brand-green-deep hover:bg-brand-green-mist',
  danger: 'bg-brand-red text-white hover:brightness-95',
};

const sizeClasses: Record<string, string> = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-[15px]',
  lg: 'px-8 py-4 text-base',
};

export function GlassButton({
  children,
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className = '',
  ...rest
}: GlassButtonProps) {
  return (
    <button
      className={[

        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold',
        'transition-colors duration-150 ease-out active:scale-[0.99]',

        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-fresh focus-visible:ring-offset-2',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </button>
  );
}
