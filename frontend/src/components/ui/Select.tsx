import { SelectHTMLAttributes, forwardRef, ReactNode } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  children: ReactNode;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = '', children, ...rest }, ref) => {
    const selectId = id ?? rest.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="mb-1.5 block text-sm font-medium text-brand-green-deep">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={[
            'w-full appearance-none rounded-xl border bg-white/70 px-4 py-3 text-[15px] text-brand-ink',
            'backdrop-blur-sm transition-all duration-150',
            'focus:outline-none focus:ring-2 focus:ring-brand-green-fresh/50 focus:border-brand-green-fresh',
            error ? 'border-brand-red' : 'border-brand-green/15',
            className,
          ].join(' ')}
          {...rest}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs font-medium text-brand-red">{error}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
