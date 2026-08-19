import { InputHTMLAttributes, forwardRef } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, id, className = '', ...rest }, ref) => {
    const inputId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-brand-green-deep">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={[
            'w-full rounded-xl border bg-white/70 px-4 py-3 text-[15px] text-brand-ink placeholder:text-brand-ink/40',
            'backdrop-blur-sm transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-green-fresh/50 focus:border-brand-green-fresh',
            error ? 'border-brand-red' : 'border-brand-green/15',
            className,
          ].join(' ')}
          {...rest}
        />
        {hint && !error && <p className="mt-1 text-xs text-brand-ink/50">{hint}</p>}
        {error && <p className="mt-1 text-xs font-medium text-brand-red">{error}</p>}
      </div>
    );
  }
);
Input.displayName = 'Input';
