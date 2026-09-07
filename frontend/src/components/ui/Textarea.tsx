import { TextareaHTMLAttributes, forwardRef, useId } from 'react';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className = '', ...rest }, ref) => {
    const generatedId = useId();
    const areaId = id ?? rest.name ?? generatedId;
    const hintId = hint ? `${areaId}-hint` : undefined;
    const errorId = error ? `${areaId}-error` : undefined;
    const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

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
          aria-describedby={describedBy}
          className={[
            'w-full rounded-xl border bg-brand-white px-4 py-3 text-[15px] text-brand-ink placeholder:text-brand-ink/40',
            'transition-all duration-150 min-h-[100px]',
            'focus:outline-none focus:ring-2 focus:ring-brand-green-fresh/50 focus:border-brand-green-fresh',
            error ? 'border-brand-red' : 'border-brand-green/15',
            className,
          ].join(' ')}
          {...rest}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-brand-ink/50">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1 text-xs font-medium text-brand-red">
            {error}
          </p>
        )}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
