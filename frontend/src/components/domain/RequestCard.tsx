import { ShoppingRequest } from '../../types';
import { GlassCard } from '../ui/GlassCard';
import { StatusBadge } from '../ui/StatusBadge';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

const SOURCING_LABEL: Record<string, string> = {
  specific_market: 'Specific market',
  specific_shop: 'Specific shop',
  social_seller: 'Social media seller',
  shopper_choice: 'Shopper\u2019s choice',
};

interface RequestCardProps {
  request: ShoppingRequest;
  onClick?: () => void;
}

export function RequestCard({ request, onClick }: RequestCardProps) {
  return (
    <GlassCard
      onClick={onClick}
      className={onClick ? 'cursor-pointer' : ''}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-medium text-brand-green-deep">{request.title}</h3>
          <p className="mt-1 text-xs uppercase tracking-wide text-brand-ink/40">
            {SOURCING_LABEL[request.sourcing_type]}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>
      {request.description && (
        <p className="mt-3 line-clamp-2 text-sm text-brand-ink/60">{request.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-brand-green/10 pt-3">
        <span className="text-sm font-semibold text-brand-green-deep">
          Up to {formatUgx(request.budget_max_ugx)}
        </span>
        <span className="text-xs text-brand-ink/40">
          {new Date(request.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </GlassCard>
  );
}
