import { Link } from 'react-router-dom';
import { ArrowRight, Check, X } from 'lucide-react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
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

export function ActiveJobCard({ job, index, deciding, onDecide }: ActiveJobCardProps) {
  const needsAnswer = job.status === 'requested';
  const detailsTo = `/shopper/orders/${job.id}`;

  return (
    <Card tone={needsAnswer ? 'warning' : 'default'} hover={false}>
      <div className="flex items-center justify-between gap-3">
        <p className="text-label font-semibold uppercase text-ink-3">
          {needsAnswer ? `Job ${index} · waiting for your answer` : `Job ${index}`}
        </p>
        <StatusBadge status={job.status} />
      </div>

      <div className="mt-3 flex items-center gap-3">
        <Avatar name={job.customer_name} src={job.customer_avatar} size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-display text-h3 font-medium text-brand-green-deep">
            {job.customer_name}
          </h3>
          <p className="truncate text-caption text-ink-3">
            #{job.id.slice(0, 8)}
            {job.request_title ? ` · ${job.request_title}` : ''}
          </p>
        </div>
      </div>

      <p className="mt-3 text-small text-ink-2">
        {needsAnswer
          ? `${job.customer_name.split(' ')[0]} picked you for this job. Accept it or let it go back to other shoppers.`
          : SHOPPER_STEP_LABELS[job.status] ?? 'In progress'}
      </p>

      {needsAnswer ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" loading={deciding} onClick={() => onDecide(job.id, true)}>
            {deciding ? 'Working…' : <><Check size={15} strokeWidth={2} /> Accept job</>}
          </Button>
          <Button size="sm" variant="destructive" disabled={deciding} onClick={() => onDecide(job.id, false)}>
            <X size={15} strokeWidth={2} /> Decline
          </Button>
          <Link to={detailsTo} className="inline-flex">
            <Button size="sm" variant="secondary" tabIndex={-1}>View details</Button>
          </Link>
        </div>
      ) : (
        <Link to={detailsTo} className="mt-4 inline-flex">
          <Button size="sm" tabIndex={-1}>
            Continue job {index} <ArrowRight size={15} strokeWidth={2} />
          </Button>
        </Link>
      )}
    </Card>
  );
}
