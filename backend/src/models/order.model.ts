import { query, queryOne } from '../db/pool';
import { OrderStatus, UserRole } from '../types';

export interface OrderRow {
  id: string;
  request_id: string;
  accepted_offer_id: string | null;
  customer_id: string;
  shopper_id: string;
  status: OrderStatus;
  item_price_ugx: number | null;
  shopping_fee_ugx: number;
  delivery_fee_ugx: number;
  platform_fee_ugx: number;
  total_amount_ugx: number | null;
  delivery_address_id: string;

  // Delivery clock — see migration 002_live_tracking.sql
  shopping_done_at: string | null;
  delivery_started_at: string | null;
  delivery_eta_minutes: number | null;
  delivery_deferred_to: string | null;

  created_at: string;
  updated_at: string;
}

export async function createOrder(input: {
  requestId: string;
  acceptedOfferId: string;
  customerId: string;
  shopperId: string;
  shoppingFeeUgx: number;
  deliveryFeeUgx: number;
  deliveryAddressId: string;
}): Promise<OrderRow> {
  const row = await queryOne<OrderRow>(
    `INSERT INTO orders
      (request_id, accepted_offer_id, customer_id, shopper_id, shopping_fee_ugx, delivery_fee_ugx, delivery_address_id, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'requested')
     RETURNING *`,
    [
      input.requestId,
      input.acceptedOfferId,
      input.customerId,
      input.shopperId,
      input.shoppingFeeUgx,
      input.deliveryFeeUgx,
      input.deliveryAddressId,
    ]
  );
  if (!row) throw new Error('Failed to create order');
  await recordStatusHistory(row.id, null, 'requested', input.customerId, 'Order created from accepted offer');
  return row;
}

export async function findOrderById(id: string): Promise<OrderRow | null> {
  return queryOne<OrderRow>('SELECT * FROM orders WHERE id = $1', [id]);
}

export async function listOrdersForUser(userId: string, role: UserRole): Promise<OrderRow[]> {
  const column = role === 'shopper' ? 'shopper_id' : 'customer_id';
  return query<OrderRow>(`SELECT * FROM orders WHERE ${column} = $1 ORDER BY created_at DESC`, [userId]);
}

export async function recordStatusHistory(
  orderId: string,
  from: OrderStatus | null,
  to: OrderStatus,
  changedBy: string,
  note?: string
) {
  return query(
    `INSERT INTO order_status_history (order_id, from_status, to_status, changed_by, note)
     VALUES ($1,$2,$3,$4,$5)`,
    [orderId, from, to, changedBy, note ?? null]
  );
}

export async function updateOrderStatus(
  orderId: string,
  to: OrderStatus,
  changedBy: string,
  extra: Partial<{
    itemPriceUgx: number;
    platformFeeUgx: number;
    totalAmountUgx: number;
    note: string;
  }> = {}
): Promise<OrderRow> {
  const current = await findOrderById(orderId);
  if (!current) throw new Error('Order not found');

  const timestampColumn: Partial<Record<OrderStatus, string>> = {
    shopper_assigned: 'assigned_at',
    shopping: 'shopping_started_at',
    item_found: 'item_found_at',
    awaiting_customer_approval: null as any,
    purchased: 'purchased_at',
    out_for_delivery: 'out_for_delivery_at',
    delivered: 'delivered_at',
    completed: 'completed_at',
    cancelled: 'cancelled_at',
  };

  const setClauses: string[] = ['status = $2'];
  const params: unknown[] = [orderId, to];
  let idx = 3;

  const tsCol = timestampColumn[to];
  if (tsCol) {
    setClauses.push(`${tsCol} = now()`);
  }
  if (extra.itemPriceUgx !== undefined) {
    setClauses.push(`item_price_ugx = $${idx++}`);
    params.push(extra.itemPriceUgx);
  }
  if (extra.platformFeeUgx !== undefined) {
    setClauses.push(`platform_fee_ugx = $${idx++}`);
    params.push(extra.platformFeeUgx);
  }
  if (extra.totalAmountUgx !== undefined) {
    setClauses.push(`total_amount_ugx = $${idx++}`);
    params.push(extra.totalAmountUgx);
  }

  const row = await queryOne<OrderRow>(
    `UPDATE orders SET ${setClauses.join(', ')} WHERE id = $1 RETURNING *`,
    params
  );
  if (!row) throw new Error('Failed to update order');

  await recordStatusHistory(orderId, current.status, to, changedBy, extra.note);
  return row;
}

export async function getOrderStatusHistory(orderId: string) {
  return query(
    'SELECT * FROM order_status_history WHERE order_id = $1 ORDER BY created_at ASC',
    [orderId]
  );
}
