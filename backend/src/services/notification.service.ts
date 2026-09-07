import { createNotification } from '../models/notification.model';
import { MAX_ACTIVE_JOBS } from '../models/order.model';
import { query } from '../db/pool';
import { OrderStatus, UserRole } from '../types';

interface Recipient {
  userId: string;
  role: Extract<UserRole, 'customer' | 'shopper'>;
}

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

export async function notifyShoppersOfNewRequest(input: {
  requestId: string;
  customerId: string;
  title: string;
  budgetMaxUgx: number | null;
}): Promise<number> {
  try {
    const budget = input.budgetMaxUgx
      ? `Budget up to ${new Intl.NumberFormat('en-UG').format(Number(input.budgetMaxUgx))} UGX`
      : 'Open budget';

    const rows = await query<{ user_id: string }>(
      `INSERT INTO notifications (user_id, channel, title, body, link)
       SELECT u.id, 'in_app', $2, $3, '/shopper/available'
         FROM users u
         JOIN shopper_profiles sp ON sp.user_id = u.id
         LEFT JOIN user_preferences p ON p.user_id = u.id
        WHERE u.role = 'shopper'
          AND u.is_active
          AND COALESCE(p.notify_new_requests, TRUE)
          AND u.id <> $1
          -- Same person holding both roles: matched on the identity they
          -- registered with, since the two accounts are separate rows.
          AND NOT EXISTS (
            SELECT 1 FROM users c
             WHERE c.id = $1
               AND (
                 (c.email IS NOT NULL AND u.email IS NOT NULL AND lower(c.email) = lower(u.email))
                 OR regexp_replace(c.phone, '[^0-9+]', '', 'g') = regexp_replace(u.phone, '[^0-9+]', '', 'g')
               )
          )
          AND (
            SELECT count(*) FROM orders o
             WHERE o.shopper_id = u.id
               AND o.status NOT IN ('completed', 'cancelled', 'refunded')
          ) < $4
        RETURNING user_id`,
      [input.customerId, `New job: ${input.title}`, budget, MAX_ACTIVE_JOBS]
    );
    return rows.length;
  } catch (err) {

    // eslint-disable-next-line no-console
    console.error('Failed to notify shoppers of a new request', err);
    return 0;
  }
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

export async function notifyDeliveryStarted(input: {
  customerId: string;
  orderId: string;
  etaMinutes: number;
  actorId: string;
}) {
  if (input.customerId === input.actorId) return;
  await notify({
    userId: input.customerId,
    title: 'Your shopper has finished shopping and is setting off',
    body: `Estimated arrival in about ${input.etaMinutes} minutes`,
    link: orderLink('customer', input.orderId),
  });
}

export async function notifyDeliveryScheduled(input: {
  customerId: string;
  orderId: string;
  when: string;
  actorId: string;
}) {
  if (input.customerId === input.actorId) return;
  await notify({
    userId: input.customerId,
    title: 'Your delivery has been scheduled',
    body: `Your shopper will deliver at ${new Date(input.when).toLocaleString('en-UG', { dateStyle: 'medium', timeStyle: 'short' })}`,
    link: orderLink('customer', input.orderId),
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
