import { ReactNode } from 'react';
import { Card } from '../ui/Card';

interface DashboardStatProps {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: string;
  accent?: 'green' | 'yellow' | 'red';
}

const ACCENT: Record<string, string> = {
  green: 'text-brand-green-deep',
  yellow: 'text-warning',
  red: 'text-brand-red',
};

export function DashboardStat({ label, value, icon, trend, accent = 'green' }: DashboardStatProps) {
  return (
    <Card padding="sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-label font-semibold uppercase text-ink-3">{label}</p>
        {icon && <span className="shrink-0 text-brand-green [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      </div>
      <p className={`mt-2 truncate font-display text-2xl font-semibold tracking-tight ${ACCENT[accent]}`}>{value}</p>
      {trend && <p className="mt-1 text-caption text-brand-green-fresh">{trend}</p>}
    </Card>
  );
}
