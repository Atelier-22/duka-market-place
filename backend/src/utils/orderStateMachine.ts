import { OrderStatus, UserRole } from '../types';

/**
 * The single authoritative map of legal order-status transitions.
 *
 * Every route that changes an order's status MUST go through
 * `assertValidTransition` below rather than writing `status = X` directly.
 * This is what makes "do not allow arbitrary status changes" (from the
 * product brief) actually true rather than a comment.
 */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  requested: ['shopper_assigned', 'cancelled'],
  shopper_assigned: ['shopping', 'cancelled'],
  shopping: ['item_found', 'cancelled', 'disputed'],
  item_found: ['awaiting_customer_approval', 'cancelled', 'disputed'],
  awaiting_customer_approval: ['purchased', 'cancelled', 'disputed'],
  purchased: ['out_for_delivery', 'disputed'],
  out_for_delivery: ['delivered', 'disputed'],
  delivered: ['completed', 'disputed'],
  completed: ['disputed'], // a dispute can still be raised shortly after completion
  cancelled: [],
  disputed: ['refunded', 'completed', 'cancelled'], // resolution outcomes, admin-only
  refunded: [],
};

/**
 * Which role is allowed to *initiate* each transition. Admins can force any
 * transition (for dispute resolution / support intervention) — that's
 * enforced by the caller checking role === 'admin' first.
 */
export const TRANSITION_ACTOR: Partial<Record<`${OrderStatus}->${OrderStatus}`, UserRole[]>> = {
  'requested->shopper_assigned': ['shopper'],
  'shopper_assigned->shopping': ['shopper'],
  'shopping->item_found': ['shopper'],
  'item_found->awaiting_customer_approval': ['shopper'],
  'awaiting_customer_approval->purchased': ['customer'],
  'purchased->out_for_delivery': ['shopper'],
  'out_for_delivery->delivered': ['customer'], // delivery is only confirmed by the customer — prevents fake self-confirmation
  'delivered->completed': ['customer', 'shopper'],
};

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition order from "${from}" to "${to}"`);
    this.name = 'InvalidTransitionError';
  }
}

export class UnauthorizedTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus, role: UserRole) {
    super(`Role "${role}" is not permitted to move an order from "${from}" to "${to}"`);
    this.name = 'UnauthorizedTransitionError';
  }
}

export function assertValidTransition(from: OrderStatus, to: OrderStatus, actorRole: UserRole): void {
  const allowedNext = ORDER_TRANSITIONS[from] ?? [];
  if (!allowedNext.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }

  if (actorRole === 'admin') return; // admins can push disputes/refunds/overrides

  const key = `${from}->${to}` as const;
  const allowedRoles = TRANSITION_ACTOR[key];
  if (allowedRoles && !allowedRoles.includes(actorRole)) {
    throw new UnauthorizedTransitionError(from, to, actorRole);
  }
}

export const TERMINAL_STATUSES: OrderStatus[] = ['completed', 'cancelled', 'refunded'];

export function isTerminal(status: OrderStatus): boolean {
  return TERMINAL_STATUSES.includes(status);
}
