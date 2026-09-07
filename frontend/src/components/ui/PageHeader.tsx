import { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  back?: string | true;
  backLabel?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, eyebrow, actions, back, backLabel = 'Back', className = '' }: PageHeaderProps) {
  const navigate = useNavigate();
  const backClass = 'mb-3 inline-flex min-h-[36px] items-center gap-1 text-sm font-medium text-ink-2 transition-colors hover:text-brand-green-deep';
  return (
    <header className={`mb-6 ${className}`}>
      {back && (
        back === true ? (
          <button type="button" onClick={() => navigate(-1)} className={backClass}>
            <ArrowLeft size={16} strokeWidth={2} /> {backLabel}
          </button>
        ) : (
          <Link to={back} className={backClass}>
            <ArrowLeft size={16} strokeWidth={2} /> {backLabel}
          </Link>
        )
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          {eyebrow && <p className="mb-1 text-label font-semibold uppercase text-ink-3">{eyebrow}</p>}
          <h1 className="font-display text-h1 font-medium text-brand-green-deep">{title}</h1>
          {subtitle && <p className="mt-1 text-body text-ink-2">{subtitle}</p>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

export function SectionHeader({ title, action, className = '' }: { title: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={`mb-3 flex items-baseline justify-between gap-4 ${className}`}>
      <h2 className="font-display text-h3 font-medium text-brand-green-deep">{title}</h2>
      {action}
    </div>
  );
}
