import { SelectHTMLAttributes, forwardRef, ReactNode, useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { errorClasses, fieldClasses, hintClasses, labelClasses } from './Input';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, hint, id, className = '', children, ...rest }, ref) => {
    const generated = useId();
    const selectId = id ?? rest.name ?? generated;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className={labelClasses}>
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            aria-invalid={error ? true : undefined}
            className={fieldClasses(error, `appearance-none pl-3.5 pr-10 ${className}`)}
            {...rest}
          >
            {children}
          </select>
          <ChevronDown
            size={17}
            strokeWidth={2}
            className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-3"
            aria-hidden
          />
        </div>
        {hint && !error && <p className={hintClasses}>{hint}</p>}
        {error && <p role="alert" className={errorClasses}>{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
