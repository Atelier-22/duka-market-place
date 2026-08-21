import { createNotification } from '../models/notification.model';
import { OrderStatus, UserRole } from '../types';

/**
 * Every in-app notification is raised through here rather than inserted at the
 * call site, so the copy for a given event lives in one place and a failure to
 * notify can never fail the action that triggered it — see `notify`.
 */

interface Recipient {
  userId: string;
  role: Extract<UserRole, 'customer' | 'shopper'>;
}

/**
 * Notifications are a side effect of an action that has already succeeded. If
 * the insert fails the user must still get their 200 — losing a bell entry is
 * far better than failing a delivery confirmation because of it.
 */
async function notify(input: { userId: string; title: string; body?: string; link?: string }) {
  try {
    await createNotification(input);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write notification', err);
  }
}

function orderLink(role: Recipient['role'], orderId: string): string {
  return role === 'shopper' ? `/shopper/orders/${orderId}` : `/app/orders/${orderId}`;
}

/**
 * What each side should be told when an order reaches a given status. A null
 * entry means that side took the action themselves and does not need telling.
 */
const STATUS_COPY: Partial<Record<OrderStatus, { customer: string | null; shopper: string | null }>> = {
  shopper_assigned: {
    customer: 'A shopper accepted your request',
    shopper: null,
  },
  shopping: {
    customer: 'Your shopper is at the location searching',
    shopper: null,
  },
  item_found: {
    customer: 'Your shopper found the item — review the photo and price',
    shopper: null,
  },
  awaiting_customer_approval: {
    customer: 'Waiting for your approval to purchase',
    shopper: null,
  },
  purchased: {
    customer: null,
    shopper: 'The customer approved — go ahead and purchase',
  },
  out_for_delivery: {
    customer: 'Your order is on the way',
    shopper: null,
  },
  delivered: {
    customer: null,
    shopper: 'The customer confirmed delivery',
  },
  completed: {
    customer: 'Order complete — leave a rating for your shopper',
    shopper: 'Job complete — your earnings have been released',
  },
  cancelled: {
    customer: 'This order was cancelled',
    shopper: 'This order was cancelled',
  },
  disputed: {
    customer: 'A dispute was opened on this order',
    shopper: 'A dispute was opened on this order',
  },
  refunded: {
    customer: 'This order was refunded',
    shopper: 'This order was refunded',
  },
};

/**
 * Tells whichever side did not perform the transition. `actorId` is skipped so
 * nobody is notified about their own tap.
 */
export async function notifyOrderStatus(order: {
  id: string;
  customer_id: string;
  shopper_id: string | null;
  reference?: string | null;
}, to: OrderStatus, actorId: string) {
  const copy = STATUS_COPY[to];
  if (!copy) return;

  const short = `Order #${order.id.slice(0, 8)}`;

  if (copy.customer && order.customer_id !== actorId) {
    await notify({
      userId: order.customer_id,
      title: copy.customer,
      body: short,
      link: orderLink('customer', order.id),
    });
  }
  if (copy.shopper && order.shopper_id && order.shopper_id !== actorId) {
    await notify({
      userId: order.shopper_id,
      title: copy.shopper,
      body: short,
      link: orderLink('shopper', order.id),
    });
  }
}

export async function notifyNewMessage(input: {
  orderId: string;
  recipientId: string;
  recipientRole: Recipient['role'];
  senderName: string;
  preview: string;
}) {
  await notify({
    userId: input.recipientId,
    title: `New message from ${input.senderName}`,
    body: input.preview.slice(0, 140),
    link: `${orderLink(input.recipientRole, input.orderId)}/messages`,
  });
}

export async function notifyNewOffer(input: {
  requestId: string;
  customerId: string;
  shopperName: string;
  feeUgx: number;
}) {
  await notify({
    userId: input.customerId,
    title: `${input.shopperName} offered to shop for you`,
    body: `Shopping fee ${new Intl.NumberFormat('en-UG').format(input.feeUgx)} UGX`,
    link: `/app/requests/${input.requestId}`,
  });
}

export async function notifyOfferAccepted(input: { shopperId: string; orderId: string }) {
  await notify({
    userId: input.shopperId,
    title: 'Your offer was accepted',
    body: `Order #${input.orderId.slice(0, 8)} is yours — head to the location when ready`,
    link: orderLink('shopper', input.orderId),
  });
}

export async function notifyNewRating(input: {
  userId: string;
  stars: number;
  fromName: string;
  orderId: string;
  role: Recipient['role'];
}) {
  await notify({
    userId: input.userId,
    title: `${input.fromName} rated you ${input.stars} star${input.stars === 1 ? '' : 's'}`,
    link: orderLink(input.role, input.orderId),
  });
}
