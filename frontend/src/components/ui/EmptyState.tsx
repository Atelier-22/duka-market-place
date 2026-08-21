import { ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl2 border border-dashed border-brand-green/20 bg-white/40 px-6 py-16 text-center">
      {icon && <div className="mb-4 text-brand-green/30">{icon}</div>}
      <h3 className="font-display text-lg font-medium text-brand-green-deep">{title}</h3>
      {description && <p className="mt-2 max-w-sm text-sm text-brand-ink/60">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
