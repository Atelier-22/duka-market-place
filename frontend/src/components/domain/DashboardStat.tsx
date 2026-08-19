import { ReactNode } from 'react';
import { GlassCard } from '../ui/GlassCard';

interface DashboardStatProps {
  label: string;
  value: string;
  icon?: ReactNode;
  trend?: string;
  accent?: 'green' | 'yellow' | 'red';
}

const ACCENT: Record<string, string> = {
  green: 'text-brand-green-deep',
  yellow: 'text-yellow-700',
  red: 'text-brand-red',
};

export function DashboardStat({ label, value, icon, trend, accent = 'green' }: DashboardStatProps) {
  return (
    <GlassCard padding="md" hover={false}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-ink/45">{label}</p>
        {icon && <span className="text-lg">{icon}</span>}
      </div>
      <p className={`mt-2 font-display text-2xl font-semibold ${ACCENT[accent]}`}>{value}</p>
      {trend && <p className="mt-1 text-xs text-brand-green-fresh">{trend}</p>}
    </GlassCard>
  );
}
