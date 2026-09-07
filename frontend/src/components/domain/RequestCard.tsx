import { ArrowRight } from 'lucide-react';
import { ShoppingRequest } from '../../types';
import { Card } from '../ui/Card';
import { StatusBadge } from '../ui/StatusBadge';

function formatUgx(n: number) {
  return new Intl.NumberFormat('en-UG').format(n) + ' UGX';
}

const SOURCING_LABEL: Record<string, string> = {
  specific_market: 'Specific market',
  specific_shop: 'Specific shop',
  social_seller: 'Social media seller',
  shopper_choice: 'Shopper’s choice',
};

interface RequestCardProps {
  request: ShoppingRequest;
  onClick?: () => void;
}

export function RequestCard({ request, onClick }: RequestCardProps) {
  const offersIn = request.status === 'offer_received';

  return (
    <Card onClick={onClick} hover={!!onClick} tone={offersIn ? 'warning' : 'default'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-h3 font-medium text-brand-green-deep">{request.title}</h3>
          <p className="mt-1 text-caption uppercase tracking-wide text-ink-3">
            {SOURCING_LABEL[request.sourcing_type]}
          </p>
        </div>
        <StatusBadge status={request.status} />
      </div>

      {request.description && (
        <p className="mt-3 line-clamp-2 text-small text-ink-2">{request.description}</p>
      )}

      {offersIn && (
        <p className="mt-3 flex items-center gap-1 text-small font-semibold text-warning">
          Offers are in. Choose a shopper <ArrowRight size={14} strokeWidth={2.5} className="shrink-0" />
        </p>
      )}
      {request.status === 'open' && (
        <p className="mt-3 text-caption text-ink-3">Waiting for shoppers to offer.</p>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-small font-semibold tabular-nums text-brand-green-deep">
          Up to {formatUgx(request.budget_max_ugx)}
        </span>
        <span className="shrink-0 text-caption text-ink-3">
          {new Date(request.created_at).toLocaleDateString('en-UG', { day: 'numeric', month: 'short' })}
        </span>
      </div>
    </Card>
  );
}
