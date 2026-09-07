import { OrderStatus, UserRole } from '../types';

export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  requested: ['shopper_assigned', 'cancelled'],
  shopper_assigned: ['shopping', 'cancelled'],
  shopping: ['item_found', 'cancelled', 'disputed'],
  item_found: ['awaiting_customer_approval', 'cancelled', 'disputed'],
  awaiting_customer_approval: ['purchased', 'cancelled', 'disputed'],
  purchased: ['out_for_delivery', 'disputed'],
  out_for_delivery: ['delivered', 'disputed'],
  delivered: ['completed', 'disputed'],
  completed: ['disputed'],
  cancelled: [],
  disputed: ['refunded', 'completed', 'cancelled'],
  refunded: [],
};

export const TRANSITION_ACTOR: Partial<Record<`${OrderStatus}->${OrderStatus}`, UserRole[]>> = {
  'requested->shopper_assigned': ['shopper'],
  'shopper_assigned->shopping': ['shopper'],
  'shopping->item_found': ['shopper'],
  'item_found->awaiting_customer_approval': ['shopper'],
  'awaiting_customer_approval->purchased': ['customer'],
  'purchased->out_for_delivery': ['shopper'],
  'out_for_delivery->delivered': ['customer'],
  'delivered->completed': ['customer', 'shopper'],
};

export class InvalidTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition order from "${from}" to "${to}"`);
    this.name = 'InvalidTransitionError';
  }
}

export class UnauthorizedTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus, role: ActorRole) {
    super(`Role "${role}" is not permitted to move an order from "${from}" to "${to}"`);
    this.name = 'UnauthorizedTransitionError';
  }
}

export type ActorRole = UserRole | 'super_admin';

export function assertValidTransition(from: OrderStatus, to: OrderStatus, actor: ActorRole): void {
  const actorRole: UserRole = actor === 'super_admin' ? 'admin' : actor;
  const allowedNext = ORDER_TRANSITIONS[from] ?? [];
  if (!allowedNext.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }

  if (actorRole === 'admin') return;

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
