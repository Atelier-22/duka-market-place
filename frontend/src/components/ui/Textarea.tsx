import { TextareaHTMLAttributes, forwardRef } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const areaId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={areaId} className="mb-1.5 block text-sm font-medium text-brand-green-deep">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          className={[
            'w-full rounded-xl border bg-white/70 px-4 py-3 text-[15px] text-brand-ink placeholder:text-brand-ink/40',
            'backdrop-blur-sm transition-all duration-150 min-h-[100px]',
            'focus:outline-none focus:ring-2 focus:ring-brand-green-fresh/50 focus:border-brand-green-fresh',
            error ? 'border-brand-red' : 'border-brand-green/15',
            className,
          ].join(' ')}
          {...rest}
        />
        {error && <p className="mt-1 text-xs font-medium text-brand-red">{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
