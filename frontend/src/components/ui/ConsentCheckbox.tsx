import { ReactNode, useId } from 'react';
import { Link } from 'react-router-dom';

interface ConsentCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
  error?: string;
}

export function ConsentCheckbox({ checked, onChange, children, error }: ConsentCheckboxProps) {
  const id = useId();
  return (
    <div>
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-brand-green/30 text-brand-green accent-brand-green focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-green-fresh focus-visible:ring-offset-2"
        />
        <label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-ink-2">
          {children}
        </label>
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export function PrivacyLink({ label = 'Privacy Policy' }: { label?: string }) {
  return (
    <Link
      to="/privacy"
      target="_blank"
      rel="noopener noreferrer"
      className="font-semibold text-brand-green-deep underline underline-offset-2"
    >
      {label}
    </Link>
  );
}
