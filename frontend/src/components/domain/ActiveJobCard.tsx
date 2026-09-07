import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { GlassButton } from '../ui/GlassButton';
import { StatusBadge } from '../ui/StatusBadge';
import { OrderStatus } from '../../types';
import { SHOPPER_STEP_LABELS } from '../../types';

export interface ActiveJob {
  id: string;
  status: OrderStatus;
  customer_name: string;
  customer_avatar: string | null;
  request_title: string | null;
  created_at: string;
}

interface ActiveJobCardProps {
  job: ActiveJob;

  index: number;
  deciding: boolean;
  onDecide: (orderId: string, accept: boolean) => void;
}

function initials(name: string): string {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('');
}

export function ActiveJobCard({ job, index, deciding, onDecide }: ActiveJobCardProps) {
  const needsAnswer = job.status === 'requested';

  return (
    <GlassCard glow={needsAnswer ? 'yellow' : 'green'} padding="lg" hover={false}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink/40">
          {needsAnswer ? `Job ${index} · waiting for your answer` : `Job ${index}`}
        </p>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        {job.customer_avatar ? (
          <img src={job.customer_avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-green text-sm font-semibold text-white">
            {initials(job.customer_name)}
          </span>
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-lg font-medium text-brand-green-deep">
            {job.customer_name}
          </p>
          <p className="truncate text-xs text-brand-ink/40">
            #{job.id.slice(0, 8)}
            {job.request_title ? ` · ${job.request_title}` : ''}
          </p>
        </div>
      </div>

      <p className="mt-3 text-sm text-brand-ink/60">
        {needsAnswer
          ? `${job.customer_name.split(' ')[0]} picked you for this job. Accept it or let it go back to other shoppers.`
          : SHOPPER_STEP_LABELS[job.status] ?? 'In progress'}
      </p>

      {needsAnswer ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <GlassButton size="sm" disabled={deciding} onClick={() => onDecide(job.id, true)}>
            {deciding ? 'Working…' : <><Check size={15} strokeWidth={2} /> Accept job</>}
          </GlassButton>
          <GlassButton size="sm" variant="danger" disabled={deciding} onClick={() => onDecide(job.id, false)}>
            <X size={15} strokeWidth={2} /> Decline
          </GlassButton>
          <Link to={`/shopper/orders/${job.id}`}>
            <GlassButton size="sm" variant="secondary">View details</GlassButton>
          </Link>
        </div>
      ) : (
        <Link to={`/shopper/orders/${job.id}`} className="mt-4 inline-block">
          <GlassButton size="sm">
            Continue job {index} <ArrowRight size={15} strokeWidth={2} />
          </GlassButton>
        </Link>
      )}
    </GlassCard>
  );
}
