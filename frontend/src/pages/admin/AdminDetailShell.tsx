import { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardTone } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { PageHeader } from '../../components/ui/PageHeader';

export function AdminDetailShell({
  title, subtitle, badges, children,
}: {
  title: string;
  subtitle?: ReactNode;
  badges?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl pb-16">
      <PageHeader back title={title} subtitle={subtitle} actions={badges} />
      <div className="flex flex-col gap-6">{children}</div>
    </div>
  );
}

export function Panel({
  title, count, action, tone, children, className = '',
}: {
  title: string;
  count?: number;
  action?: ReactNode;
  tone?: CardTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Card padding="lg" hover={false} tone={tone} className={className}>
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <h2 className="flex items-center gap-2 font-display text-h3 font-medium text-brand-green-deep">
          {title}
          {count !== undefined && (
            <span className="rounded-full bg-line/70 px-2 py-0.5 font-sans text-caption font-semibold text-ink-2">
              {count}
            </span>
          )}
        </h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function Empty({
  title, description, action, icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return <EmptyState size="sm" icon={icon} title={title} description={description} action={action} />;
}

export function Field({ label, value, className = '' }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="text-label font-semibold uppercase text-ink-3">{label}</p>
      <div className="mt-1 text-body text-ink">{value ?? '—'}</div>
    </div>
  );
}

export type PillTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

const PILL: Record<PillTone, { pill: string; dot: string }> = {
  neutral: { pill: 'border-line bg-surface-2 text-ink-2', dot: 'bg-ink-3' },
  brand: { pill: 'border-brand-green/15 bg-brand-green-mist text-brand-green-deep', dot: 'bg-brand-green' },
  success: { pill: 'border-brand-green-fresh/30 bg-brand-green-mist text-brand-green-deep', dot: 'bg-brand-green-fresh' },
  warning: { pill: 'border-brand-yellow/40 bg-warning-soft/60 text-warning', dot: 'bg-brand-yellow' },
  danger: { pill: 'border-brand-red/25 bg-danger-soft/60 text-brand-red', dot: 'bg-brand-red' },
};

export function Pill({
  tone = 'neutral', dot = false, children, className = '',
}: {
  tone?: PillTone;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-1 text-caption font-semibold ${PILL[tone].pill} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 rounded-full ${PILL[tone].dot}`} />}
      {children}
    </span>
  );
}

export type StatTone = 'default' | 'success' | 'warning' | 'danger';

const STAT_TONE: Record<StatTone, string> = {
  default: 'text-brand-green-deep',
  success: 'text-brand-green-fresh',
  warning: 'text-warning',
  danger: 'text-brand-red',
};

export function StatTile({
  label, value, tone = 'default', icon, sub, to, children,
}: {
  label: string;
  value: ReactNode;
  tone?: StatTone;
  icon?: ReactNode;
  sub?: ReactNode;
  to?: string;
  children?: ReactNode;
}) {
  const tile = (
    <Card padding="sm" hover={!!to} className={to ? 'h-full' : ''}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-label font-semibold uppercase text-ink-3">{label}</p>
        {icon && <span className="shrink-0 text-brand-green [&>svg]:h-4 [&>svg]:w-4">{icon}</span>}
      </div>
      <p className={`mt-2 truncate font-display text-2xl font-semibold tracking-tight ${STAT_TONE[tone]}`}>
        {value}
        {sub !== undefined && <span className="ml-1.5 font-sans text-small font-normal text-ink-3">{sub}</span>}
      </p>
      {children}
    </Card>
  );
  return to ? (
    <Link to={to} className="block rounded-2xl focus-visible:outline-none focus-visible:shadow-focus">
      {tile}
    </Link>
  ) : tile;
}

export function AdminTable({
  head, children, minWidth = 'min-w-[640px]', className = '', caption,
}: {
  head: ReactNode;
  children: ReactNode;
  minWidth?: string;
  className?: string;
  caption?: string;
}) {
  return (
    <Card padding="none" hover={false} className={`overflow-hidden ${className}`}>
      <div className="overflow-x-auto">
        <table className={`w-full text-sm text-ink ${minWidth}`}>
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>{head}</tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </Card>
  );
}

export function Th({
  align = 'left', className = '', children, ...rest
}: Omit<ThHTMLAttributes<HTMLTableCellElement>, 'align'> & { align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={[
        'whitespace-nowrap border-b border-line px-4 py-3 text-label font-semibold uppercase text-ink-3',
        align === 'right' ? 'text-right' : 'text-left',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </th>
  );
}

export function Tr({ className = '', onClick, children, ...rest }: HTMLAttributes<HTMLTableRowElement>) {
  const clickable = !!onClick;
  return (
    <tr
      onClick={onClick}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }
          : undefined
      }
      className={[
        'border-b border-line transition-colors duration-150 last:border-0',
        clickable ? 'cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-2 focus-visible:outline-none' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </tr>
  );
}

export function Td({
  numeric = false, muted = false, align, className = '', children, ...rest
}: Omit<TdHTMLAttributes<HTMLTableCellElement>, 'align'> & {
  numeric?: boolean;
  muted?: boolean;
  align?: 'left' | 'right';
}) {
  const right = numeric || align === 'right';
  return (
    <td
      className={[
        'px-4 py-3 align-middle',
        muted ? 'text-ink-2' : '',
        right ? 'text-right' : '',
        numeric ? 'whitespace-nowrap tabular-nums' : '',
        className,
      ].join(' ')}
      {...rest}
    >
      {children}
    </td>
  );
}

export function formatUgx(n: number | null | undefined) {
  return new Intl.NumberFormat('en-UG').format(Number(n ?? 0)) + ' UGX';
}

export function formatDate(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' });
}
