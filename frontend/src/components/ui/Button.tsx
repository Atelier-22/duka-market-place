import { ButtonHTMLAttributes, ReactNode, forwardRef } from 'react';
import { Loader2 } from 'lucide-react';

export type ButtonVariant =
  | 'primary' | 'secondary' | 'tertiary' | 'destructive' | 'link'
  | 'ghost' | 'surface' | 'danger';

export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  loading?: boolean;
}

const LEGACY: Partial<Record<ButtonVariant, ButtonVariant>> = {
  ghost: 'tertiary',
  surface: 'secondary',
  danger: 'destructive',
};

const VARIANT: Record<string, string> = {
  primary:
    'bg-brand-green text-white shadow-card hover:bg-brand-green-deep focus-visible:shadow-focus',
  secondary:
    'bg-surface text-brand-green-deep border border-line hover:border-line-strong hover:bg-surface-2 focus-visible:shadow-focus',
  tertiary:
    'bg-transparent text-brand-green-deep hover:bg-brand-green-mist focus-visible:shadow-focus',
  destructive:
    'bg-brand-red text-white hover:brightness-95 focus-visible:shadow-[0_0_0_3px_rgb(var(--brand-red)/0.25)]',
  link:
    'bg-transparent text-brand-green underline-offset-4 hover:underline h-auto px-0 rounded-sm',
};

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[15px] gap-2',
  lg: 'h-12 px-6 text-base gap-2',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { children, variant = 'primary', size = 'md', fullWidth = false, loading = false, className = '', disabled, type = 'button', ...rest },
  ref
) {
  const resolved = LEGACY[variant] ?? variant;
  return (
    <button
      ref={ref}
      type={type}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={[
        'inline-flex select-none items-center justify-center whitespace-nowrap rounded-lg font-semibold',
        'transition-[background-color,border-color,color,box-shadow,transform,filter] duration-150 ease-standard',
        'active:scale-[0.98] focus-visible:outline-none',
        'disabled:pointer-events-none disabled:opacity-50',
        VARIANT[resolved],
        resolved === 'link' ? 'text-[15px]' : SIZE[size],
        fullWidth ? 'w-full' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {loading && <Loader2 size={16} strokeWidth={2.25} className="animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
