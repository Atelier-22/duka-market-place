import { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, LucideIcon } from 'lucide-react';

interface ListRowProps {
  label: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  to?: string;
  onClick?: () => void;
  right?: ReactNode;
  chevron?: boolean;
  className?: string;
}

/** A tappable row for menus and settings lists. Put several inside a Card with padding="none". */
export function ListRow({ label, description, icon: Icon, to, onClick, right, chevron = true, className = '' }: ListRowProps) {
  const inner = (
    <>
      {Icon && (
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green-mist text-brand-green">
          <Icon size={17} strokeWidth={1.8} />
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {description && <span className="block truncate text-caption text-ink-3">{description}</span>}
      </span>
      {right}
      {chevron && (to || onClick) && <ChevronRight size={18} strokeWidth={2} className="shrink-0 text-ink-3" />}
    </>
  );
  const classes = `flex min-h-[60px] w-full items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors last:border-0 ${
    to || onClick ? 'hover:bg-surface-2 active:bg-surface-2' : ''
  } ${className}`;

  if (to) return <Link to={to} onClick={onClick} className={classes}>{inner}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className={classes}>{inner}</button>;
  return <div className={classes}>{inner}</div>;
}
