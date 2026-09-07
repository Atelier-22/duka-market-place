import { InputHTMLAttributes, ReactNode, forwardRef, useId } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const fieldClasses = (error?: string, extra = '') =>
  [
    'h-11 w-full rounded-lg border bg-surface text-[15px] text-ink placeholder:text-ink-3',
    'transition-[border-color,box-shadow,background-color] duration-150 ease-standard',
    'focus:outline-none disabled:bg-surface-2 disabled:text-ink-3',
    error
      ? 'border-brand-red focus:border-brand-red focus:shadow-[0_0_0_3px_rgb(var(--brand-red)/0.2)]'
      : 'border-line hover:border-line-strong focus:border-brand-green focus:shadow-focus',
    extra,
  ].join(' ');

export const labelClasses = 'mb-1.5 block text-sm font-medium text-ink';
export const hintClasses = 'mt-1.5 text-caption text-ink-3';
export const errorClasses = 'mt-1.5 text-caption font-medium text-brand-red';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, icon, trailing, id, className = '', ...rest }, ref) => {
    const generated = useId();
    const inputId = id ?? rest.name ?? generated;
    const hintId = hint ? `${inputId}-hint` : undefined;
    const errorId = error ? `${inputId}-error` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className={labelClasses}>
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-3">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : undefined}
            aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
            className={fieldClasses(error, `${icon ? 'pl-10' : 'px-3.5'} ${trailing ? 'pr-12' : icon ? 'pr-3.5' : ''} ${className}`)}
            {...rest}
          />
          {trailing && (
            <span className="absolute right-1 top-1/2 -translate-y-1/2">{trailing}</span>
          )}
        </div>
        {hint && !error && <p id={hintId} className={hintClasses}>{hint}</p>}
        {error && <p id={errorId} role="alert" className={errorClasses}>{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
