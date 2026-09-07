import { InputHTMLAttributes, forwardRef, useId, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, hint, id, className = '', ...rest }, ref) => {
    const [visible, setVisible] = useState(false);
    const generatedId = useId();
    const inputId = id ?? rest.name ?? generatedId;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-brand-green-deep">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            type={visible ? 'text' : 'password'}
            className={[
              'w-full rounded-xl border bg-brand-white py-3 pl-4 pr-12 text-[15px] text-brand-ink placeholder:text-brand-ink/40',
              'transition-all duration-150',
              'focus:outline-none focus:ring-2 focus:ring-brand-green-fresh/50 focus:border-brand-green-fresh',
              error ? 'border-brand-red' : 'border-brand-green/15',
              className,
            ].join(' ')}
            {...rest}
          />
          <button
            type="button"

            onClick={() => setVisible((v) => !v)}
            aria-pressed={visible}
            aria-label={visible ? 'Hide password' : 'Show password'}
            title={visible ? 'Hide password' : 'Show password'}
            className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-brand-ink/40 transition-colors hover:bg-brand-green-mist hover:text-brand-green-deep"
          >
            {visible ? <EyeOff size={17} strokeWidth={1.75} /> : <Eye size={17} strokeWidth={1.75} />}
          </button>
        </div>
        {hint && !error && <p className="mt-1 text-xs text-brand-ink/50">{hint}</p>}
        {error && <p className="mt-1 text-xs font-medium text-brand-red">{error}</p>}
      </div>
    );
  }
);
PasswordInput.displayName = 'PasswordInput';
