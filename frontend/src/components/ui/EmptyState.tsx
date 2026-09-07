import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  /** Compact for inside cards. */
  size?: 'md' | 'sm';
}

/** Says what is empty, why, and what to do about it. */
export function EmptyState({ icon, title, description, action, size = 'md' }: EmptyStateProps) {
  return (
    <div
      className={[
        'flex flex-col items-center justify-center rounded-2xl border border-line bg-surface-2 text-center',
        size === 'sm' ? 'px-5 py-8' : 'px-6 py-12',
      ].join(' ')}
    >
      {icon && (
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-surface text-brand-green shadow-card [&>svg]:h-6 [&>svg]:w-6">
          {icon}
        </div>
      )}
      <h3 className="font-display text-h3 font-medium text-brand-green-deep">{title}</h3>
      {description && <p className="mt-1.5 max-w-sm text-small text-ink-2">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
