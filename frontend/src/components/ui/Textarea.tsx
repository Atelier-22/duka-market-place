import { TextareaHTMLAttributes, forwardRef, useId } from 'react';
import { errorClasses, fieldClasses, hintClasses, labelClasses } from './Input';

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, hint, error, id, className = '', ...rest }, ref) => {
    const generated = useId();
    const areaId = id ?? rest.name ?? generated;
    const hintId = hint ? `${areaId}-hint` : undefined;
    const errorId = error ? `${areaId}-error` : undefined;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={areaId} className={labelClasses}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={areaId}
          aria-invalid={error ? true : undefined}
          aria-describedby={[hintId, errorId].filter(Boolean).join(' ') || undefined}
          className={fieldClasses(error, `h-auto min-h-[104px] resize-y px-3.5 py-2.5 leading-relaxed ${className}`)}
          {...rest}
        />
        {hint && !error && <p id={hintId} className={hintClasses}>{hint}</p>}
        {error && <p id={errorId} role="alert" className={errorClasses}>{error}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
