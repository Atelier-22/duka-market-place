import { Request, Response } from 'express';
import { z } from 'zod';
import { mediaUrl } from '../utils/validators';
import {
  MAX_ACTIVE_JOBS, countActiveJobs, findOrderById, listOrdersForUser,
  updateOrderStatus, getOrderStatusHistory,
} from '../models/order.model';
import { assertValidTransition } from '../utils/orderStateMachine';
import { computePricing } from '../services/pricing.service';
import { notifyOrderStatus } from '../services/notification.service';
import { query, queryOne } from '../db/pool';
import { ApiError } from '../middleware/errorHandler';
import { OrderStatus } from '../types';

async function loadOrderOrThrow(id: string) {
  const order = await findOrderById(id);
  if (!order) throw new ApiError(404, 'Order not found');
  return order;
}

function assertParticipant(order: { customer_id: string; shopper_id: string }, userId: string, role: string) {
  if (role === 'admin') return;
  if (order.customer_id !== userId && order.shopper_id !== userId) {
    throw new ApiError(403, 'Not authorized to act on this order');
  }
}

export async function getById(req: Request, res: Response) {
  const order = await loadOrderOrThrow(req.params.id);
  assertParticipant(order, req.user!.id, req.user!.role);
  const history = await getOrderStatusHistory(order.id);
  const items = await query('SELECT * FROM order_items WHERE order_id = $1 ORDER BY created_at', [order.id]);

  // Who is doing the shopping. The customer had no way to see this on the order
  // itself — only a name buried in the chat — so they were tracking a stranger
  // on a map. Balances and earnings are deliberately not included.
  const shopper = order.shopper_id
    ? await queryOne(
        `SELECT u.id, u.full_name, u.avatar_url, u.phone,
                sp.verification_status, sp.rating_avg, sp.rating_count,
                sp.completed_jobs, sp.operating_area
           FROM users u
           LEFT JOIN shopper_profiles sp ON sp.user_id = u.id
          WHERE u.id = $1`,
        [order.shopper_id]
      )
    : null;

  res.json({ order, history, items, shopper });
}

export async function listMine(req: Request, res: Response) {
  const orders = await listOrdersForUser(req.user!.id, req.user!.role);
  res.json({ orders });
}

/** Generic guarded transition used by the simple (no-payload) status changes. */
async function transition(req: Request, res: Response, to: OrderStatus, note?: string) {
  const order = await loadOrderOrThrow(req.params.id);
  assertParticipant(order, req.user!.id, req.user!.role);
  assertValidTransition(order.status, to, req.user!.role);
  const updated = await updateOrderStatus(order.id, to, req.user!.id, { note });
  await notifyOrderStatus(updated, to, req.user!.id);
  res.json({ order: updated });
}

// shopper: requested -> shopper_assigned (redundant safety endpoint; normally
// set automatically by offer.controller.acceptOffer, exposed here for the
// "shopper taps Accept directly on an open request with no prior offer" path)
export async function markAssigned(req: Request, res: Response) {
  // Taking on a job is where the cap belongs — the order already exists and
  // already names this shopper, so it is excluded from its own count.
  const order = await loadOrderOrThrow(req.params.id);
  if (order.shopper_id === req.user!.id) {
    const carrying = await countActiveJobs(req.user!.id, order.id);
    if (carrying >= MAX_ACTIVE_JOBS) {
      throw new ApiError(409,
        `You already have ${MAX_ACTIVE_JOBS} jobs on the go — finish or hand one back before taking another`);
    }
  }
  await transition(req, res, 'shopper_assigned');
}

// shopper: shopper_assigned -> shopping ("On my way / searching")
export async function markShopping(req: Request, res: Response) {
  await transition(req, res, 'shopping', 'Shopper is at the location searching for the item');
}

const itemFoundSchema = z.object({
  actualPriceUgx: z.number().int().positive(),
  photoUrl: mediaUrl,
  shopName: z.string().max(150).optional(),
});

// shopper: shopping -> item_found. Records the real price + photo evidence.
export async function markItemFound(req: Request, res: Response) {
  const input = itemFoundSchema.parse(req.body);
  const order = await loadOrderOrThrow(req.params.id);
  assertParticipant(order, req.user!.id, req.user!.role);
  assertValidTransition(order.status, 'item_found', req.user!.role);

  await query(
    `INSERT INTO evidence (order_id, uploaded_by, type, file_url, caption) VALUES ($1,$2,'item_photo',$3,$4)`,
    [order.id, req.user!.id, input.photoUrl, input.shopName ?? null]
  );

  const updated = await updateOrderStatus(order.id, 'item_found', req.user!.id, {
    itemPriceUgx: input.actualPriceUgx,
    note: `Item found at ${input.shopName ?? 'the location'} for the recorded price`,
  });

  // Immediately move to awaiting_customer_approval so the customer sees a
  // single actionable "approve this purchase" screen rather than two steps.
  assertValidTransition(updated.status, 'awaiting_customer_approval', req.user!.role);
  const awaiting = await updateOrderStatus(updated.id, 'awaiting_customer_approval', req.user!.id);
  await notifyOrderStatus(awaiting, 'awaiting_customer_approval', req.user!.id);

  res.json({ order: awaiting, pricing: computePricing({
    itemPriceUgx: input.actualPriceUgx,
    shoppingFeeUgx: awaiting.shopping_fee_ugx,
    deliveryFeeUgx: awaiting.delivery_fee_ugx,
  }) });
}

// customer: awaiting_customer_approval -> purchased
export async function approvePurchase(req: Request, res: Response) {
  const order = await loadOrderOrThrow(req.params.id);
  assertParticipant(order, req.user!.id, req.user!.role);
  assertValidTransition(order.status, 'purchased', req.user!.role);
  if (order.customer_id !== req.user!.id) throw new ApiError(403, 'Only the customer can approve a purchase');
  if (!order.item_price_ugx) throw new ApiError(409, 'No item price has been recorded yet');

  const pricing = computePricing({
    itemPriceUgx: order.item_price_ugx,
    shoppingFeeUgx: order.shopping_fee_ugx,
    deliveryFeeUgx: order.delivery_fee_ugx,
  });

  const updated = await updateOrderStatus(order.id, 'purchased', req.user!.id, {
    platformFeeUgx: pricing.platformFeeUgx,
    totalAmountUgx: pricing.totalAmountUgx,
    note: 'Customer approved the purchase price and photo',
  });
  await notifyOrderStatus(updated, 'purchased', req.user!.id);

  await query(
    `INSERT INTO payments (order_id, payer_id, method, status, amount_ugx)
     VALUES ($1,$2,'cash_on_delivery','pending',$3)`,
    [order.id, order.customer_id, pricing.totalAmountUgx]
  );

  res.json({ order: updated, pricing });
}

// The amount is optional: by this point the customer has already approved a
// price and it is on the order. Requiring the client to send it again meant a
// shopper who reloaded the page — losing the form state from the earlier step —
// could not file a receipt at all.
const receiptSchema = z.object({
  receiptPhotoUrl: mediaUrl,
  amountUgx: z.number().int().positive().optional(),
});

// shopper: purchased -> out_for_delivery, with receipt evidence
export async function markOutForDelivery(req: Request, res: Response) {
  const input = receiptSchema.parse(req.body);
  const order = await loadOrderOrThrow(req.params.id);
  assertParticipant(order, req.user!.id, req.user!.role);
  assertValidTransition(order.status, 'out_for_delivery', req.user!.role);

  const receiptAmount = input.amountUgx ?? Number(order.item_price_ugx ?? 0);
  if (!receiptAmount) {
    throw new ApiError(409, 'No purchase price has been recorded for this order yet');
  }

  const evidence = await queryOne<{ id: string }>(
    `INSERT INTO evidence (order_id, uploaded_by, type, file_url) VALUES ($1,$2,'receipt',$3) RETURNING id`,
    [order.id, req.user!.id, input.receiptPhotoUrl]
  );
  await query(
    `INSERT INTO receipts (order_id, evidence_id, amount_ugx) VALUES ($1,$2,$3)`,
    [order.id, evidence?.id ?? null, receiptAmount]
  );

  const updated = await updateOrderStatus(order.id, 'out_for_delivery', req.user!.id, {
    note: 'Shopper purchased the item and is delivering it',
  });
  await notifyOrderStatus(updated, 'out_for_delivery', req.user!.id);
  res.json({ order: updated });
}

// customer: out_for_delivery -> delivered (only the customer may confirm this)
export async function confirmDelivered(req: Request, res: Response) {
  const order = await loadOrderOrThrow(req.params.id);
  assertParticipant(order, req.user!.id, req.user!.role);
  if (order.customer_id !== req.user!.id && req.user!.role !== 'admin') {
    throw new ApiError(403, 'Only the customer can confirm delivery');
  }
  assertValidTransition(order.status, 'delivered', req.user!.role);
  const updated = await updateOrderStatus(order.id, 'delivered', req.user!.id, {
    note: 'Customer confirmed receipt of the item',
  });
  await notifyOrderStatus(updated, 'delivered', req.user!.id);
  res.json({ order: updated });
}

// customer or shopper: delivered -> completed. Releases the shopper's earnings.
export async function complete(req: Request, res: Response) {
  const order = await loadOrderOrThrow(req.params.id);
  assertParticipant(order, req.user!.id, req.user!.role);
  assertValidTransition(order.status, 'completed', req.user!.role);

  const updated = await updateOrderStatus(order.id, 'completed', req.user!.id);
  await notifyOrderStatus(updated, 'completed', req.user!.id);

  const pricing = computePricing({
    itemPriceUgx: order.item_price_ugx ?? 0,
    shoppingFeeUgx: order.shopping_fee_ugx,
    deliveryFeeUgx: order.delivery_fee_ugx,
  });

  await query(
    `INSERT INTO shopper_earnings (shopper_id, order_id, amount_ugx, status, released_at)
     VALUES ($1,$2,$3,'available', now())
     ON CONFLICT (order_id) DO NOTHING`,
    [order.shopper_id, order.id, pricing.shopperPayoutUgx]
  );
  await query(
    `UPDATE shopper_profiles SET
       available_balance_ugx = available_balance_ugx + $2,
       lifetime_earnings_ugx = lifetime_earnings_ugx + $2,
       completed_jobs = completed_jobs + 1
     WHERE user_id = $1`,
    [order.shopper_id, pricing.shopperPayoutUgx]
  );
  await query(
    `INSERT INTO transactions (order_id, user_id, type, amount_ugx, description)
     VALUES ($1,$2,'shopper_payout',$3,'Earnings released on order completion')`,
    [order.id, order.shopper_id, pricing.shopperPayoutUgx]
  );
  await query(
    `UPDATE customer_profiles SET
       total_orders = total_orders + 1,
       total_spent_ugx = total_spent_ugx + $2
     WHERE user_id = $1`,
    [order.customer_id, order.total_amount_ugx ?? 0]
  );

  res.json({ order: updated });
}

const cancelSchema = z.object({ reason: z.string().max(500).optional() });

export async function cancel(req: Request, res: Response) {
  const { reason } = cancelSchema.parse(req.body);
  const order = await loadOrderOrThrow(req.params.id);
  assertParticipant(order, req.user!.id, req.user!.role);
  assertValidTransition(order.status, 'cancelled', req.user!.role);
  const updated = await updateOrderStatus(order.id, 'cancelled', req.user!.id, { note: reason });
  await notifyOrderStatus(updated, 'cancelled', req.user!.id);
  res.json({ order: updated });
}
