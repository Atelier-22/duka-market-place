import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { GlassCard } from '../../components/ui/GlassCard';

/**
 * Shared chrome for the admin drill-down pages so they read as one product
 * rather than three separately-invented layouts.
 */
export function AdminDetailShell({
  title, subtitle, badges, children,
}: {
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-5xl pb-16">
      <button
        onClick={() => navigate(-1)}
        className="mb-4 text-sm font-medium text-brand-ink/50 hover:text-brand-green-deep"
      >
        <ArrowLeft size={15} strokeWidth={2} className="inline" /> Back
      </button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate font-display text-2xl font-medium text-brand-green-deep">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-brand-ink/50">{subtitle}</div>}
        </div>
        {badges && <div className="flex flex-wrap items-center gap-2">{badges}</div>}
      </div>

      <div className="mt-6 flex flex-col gap-5">{children}</div>
    </div>
  );
}

export function Panel({ title, count, children }: { title: string; count?: number; children: ReactNode }) {
  return (
    <GlassCard padding="lg" hover={false}>
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">{title}</p>
        {count !== undefined && <span className="text-xs text-brand-ink/35">{count}</span>}
      </div>
      <div className="mt-4">{children}</div>
    </GlassCard>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="py-6 text-center text-sm text-brand-ink/40">{children}</p>;
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-brand-ink/40">{label}</p>
      <p className="mt-0.5 text-sm text-brand-ink/80">{value ?? '—'}</p>
    </div>
  );
}

export function formatUgx(n: number | null | undefined) {
  return new Intl.NumberFormat('en-UG').format(Number(n ?? 0)) + ' UGX';
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
}
