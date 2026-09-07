import { query, queryOne } from '../db/pool';
import { ApiError } from '../middleware/errorHandler';
import { Tx, txOne, txQuery, withTransaction } from './db';
import { effectivePrice } from './pricing';
import { availableQuantity, livePromotionsFor, refreshProductRating } from './product.model';
import { refreshStoreCounters } from './store.model';
import {
  notifyCustomerOrderStatus, notifySellerLowStock, notifySellerNewOrder, notifySellerOrderCancelled, notifySellerReview,
} from './notify';

export type SellerOrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed' | 'cancelled' | 'refunded';

export const SELLER_ORDER_TRANSITIONS: Record<SellerOrderStatus, SellerOrderStatus[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'ready', 'completed', 'cancelled'],
  preparing: ['ready', 'completed', 'cancelled'],
  ready: ['completed', 'cancelled'],
  completed: ['refunded'],
  cancelled: [],
  refunded: [],
};

export interface SellerOrderRow {
  id: string;
  order_number: number;
  store_id: string;
  seller_id: string;
  customer_id: string;
  status: SellerOrderStatus;
  subtotal_ugx: number;
  delivery_fee_ugx: number;
  total_ugx: number;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'refunded';
  delivery_address_id: string | null;
  delivery_line1: string | null;
  delivery_city: string | null;
  delivery_notes: string | null;
  customer_name: string;
  customer_phone: string;
  cancel_reason: string | null;
  cancelled_by: string | null;
  confirmed_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CartLine {
  productId: string;
  variationId?: string | null;
  quantity: number;
}

interface PricedLine {
  productId: string;
  variationId: string | null;
  storeId: string;
  sellerId: string;
  storeName: string;
  deliveryFeeUgx: number;
  productName: string;
  variationLabel: string | null;
  imageUrl: string | null;
  unitPriceUgx: number;
  quantity: number;
}

async function priceLines(tx: Tx, lines: CartLine[]): Promise<PricedLine[]> {
  const ids = [...new Set(lines.map((l) => l.productId))];
  const rows = await txQuery<any>(
    tx,
    `SELECT p.*, s.name AS store_name, s.delivery_fee_ugx AS store_delivery_fee, s.status AS store_status,
            sp.is_suspended, u.is_active AS owner_active,
            (SELECT url FROM seller_product_images i WHERE i.product_id = p.id ORDER BY position, created_at LIMIT 1) AS image_url
       FROM seller_products p
       JOIN seller_stores s ON s.id = p.store_id
       JOIN seller_profiles sp ON sp.user_id = s.owner_id
       JOIN users u ON u.id = s.owner_id
      WHERE p.id = ANY($1)
      FOR UPDATE OF p`,
    [ids]
  );
  const byId = new Map<string, any>(rows.map((r) => [r.id, r]));
  const promos = await livePromotionsFor(ids);

  const priced: PricedLine[] = [];
  for (const line of lines) {
    const p = byId.get(line.productId);
    if (!p || p.status !== 'published' || p.store_status !== 'active' || p.is_suspended || !p.owner_active || p.flagged_at) {
      throw new ApiError(409, 'One of the items is no longer available');
    }
    const pricing = effectivePrice(p, promos[p.id] ?? []);
    let unit = pricing.price;
    let label: string | null = null;
    let available = availableQuantity(p);

    if (line.variationId) {
      const v = await txOne<any>(
        tx,
        'SELECT * FROM seller_product_variations WHERE id = $1 AND product_id = $2 FOR UPDATE',
        [line.variationId, p.id]
      );
      if (!v) throw new ApiError(409, `That option of ${p.name} is not available`);
      unit = Math.max(1, unit + Number(v.price_delta_ugx));
      label = `${v.name}: ${v.value}`;
      available = availableQuantity(v);
    }
    if (line.quantity > available) {
      throw new ApiError(409, available === 0 ? `${p.name} is out of stock` : `Only ${available} of ${p.name} left`);
    }
    priced.push({
      productId: p.id,
      variationId: line.variationId ?? null,
      storeId: p.store_id,
      sellerId: p.owner_id,
      storeName: p.store_name,
      deliveryFeeUgx: Number(p.store_delivery_fee),
      productName: p.name,
      variationLabel: label,
      imageUrl: p.image_url,
      unitPriceUgx: unit,
      quantity: line.quantity,
    });
  }
  return priced;
}

async function moveStock(tx: Tx, line: { productId: string; variationId: string | null; quantity: number }, phase: 'reserve' | 'commit' | 'release', actorId: string) {
  const q = line.quantity;
  if (phase === 'reserve') {
    if (line.variationId) {
      const ok = await txOne(tx, 'UPDATE seller_product_variations SET reserved_quantity = reserved_quantity + $2 WHERE id = $1 AND stock_quantity - reserved_quantity >= $2 RETURNING id', [line.variationId, q]);
      if (!ok) throw new ApiError(409, 'Not enough stock for that option');
    }
    const ok = await txOne(tx, 'UPDATE seller_products SET reserved_quantity = reserved_quantity + $2 WHERE id = $1 AND stock_quantity - reserved_quantity >= $2 RETURNING stock_quantity, reserved_quantity', [line.productId, q]);
    if (!ok) throw new ApiError(409, 'Not enough stock');
    await txQuery(tx, `INSERT INTO seller_inventory_events (product_id, variation_id, delta, quantity_after, reason, actor_id) VALUES ($1,$2,$3,$4,'order_reserved',$5)`,
      [line.productId, line.variationId, -q, Number(ok.stock_quantity) - Number(ok.reserved_quantity), actorId]);
  } else if (phase === 'commit') {
    if (line.variationId) {
      await txQuery(tx, 'UPDATE seller_product_variations SET stock_quantity = GREATEST(0, stock_quantity - $2), reserved_quantity = GREATEST(0, reserved_quantity - $2) WHERE id = $1', [line.variationId, q]);
    }
    const row = await txOne(tx, 'UPDATE seller_products SET stock_quantity = GREATEST(0, stock_quantity - $2), reserved_quantity = GREATEST(0, reserved_quantity - $2), sales_count = sales_count + $2, updated_at = now() WHERE id = $1 RETURNING stock_quantity, reserved_quantity', [line.productId, q]);
    await txQuery(tx, `INSERT INTO seller_inventory_events (product_id, variation_id, delta, quantity_after, reason, actor_id) VALUES ($1,$2,$3,$4,'order_committed',$5)`,
      [line.productId, line.variationId, -q, Number(row?.stock_quantity ?? 0), actorId]);
  } else {
    if (line.variationId) {
      await txQuery(tx, 'UPDATE seller_product_variations SET reserved_quantity = GREATEST(0, reserved_quantity - $2) WHERE id = $1', [line.variationId, q]);
    }
    const row = await txOne(tx, 'UPDATE seller_products SET reserved_quantity = GREATEST(0, reserved_quantity - $2), updated_at = now() WHERE id = $1 RETURNING stock_quantity, reserved_quantity', [line.productId, q]);
    await txQuery(tx, `INSERT INTO seller_inventory_events (product_id, variation_id, delta, quantity_after, reason, actor_id) VALUES ($1,$2,$3,$4,'order_released',$5)`,
      [line.productId, line.variationId, q, Number(row?.stock_quantity ?? 0) - Number(row?.reserved_quantity ?? 0), actorId]);
  }
}

export async function placeOrders(input: {
  customer: { id: string; fullName: string; phone: string };
  lines: CartLine[];
  addressId: string;
  notes?: string | null;
}): Promise<SellerOrderRow[]> {
  const address = await queryOne<{ id: string; line1: string; city: string; phone: string | null }>(
    'SELECT id, line1, city, phone FROM addresses WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [input.addressId, input.customer.id]
  );
  if (!address) throw new ApiError(400, 'Choose one of your saved delivery addresses');

  const merged = new Map<string, CartLine>();
  for (const l of input.lines) {
    const key = `${l.productId}|${l.variationId ?? ''}`;
    const existing = merged.get(key);
    if (existing) existing.quantity += l.quantity;
    else merged.set(key, { ...l, variationId: l.variationId ?? null });
  }

  const orders = await withTransaction(async (tx) => {
    const priced = await priceLines(tx, [...merged.values()]);
    const byStore = new Map<string, PricedLine[]>();
    for (const line of priced) (byStore.get(line.storeId) ?? byStore.set(line.storeId, []).get(line.storeId)!).push(line);

    const created: SellerOrderRow[] = [];
    for (const [storeId, lines] of byStore) {
      for (const line of lines) await moveStock(tx, line, 'reserve', input.customer.id);
      const subtotal = lines.reduce((sum, l) => sum + l.unitPriceUgx * l.quantity, 0);
      const delivery = lines[0].deliveryFeeUgx;
      const settings = await txOne<{ auto_confirm_orders: boolean }>(tx, 'SELECT auto_confirm_orders FROM seller_settings WHERE user_id = $1', [lines[0].sellerId]);
      const status: SellerOrderStatus = settings?.auto_confirm_orders ? 'confirmed' : 'pending';

      const order = await txOne<SellerOrderRow>(
        tx,
        `INSERT INTO seller_orders
           (store_id, seller_id, customer_id, status, subtotal_ugx, delivery_fee_ugx, total_ugx,
            delivery_address_id, delivery_line1, delivery_city, delivery_notes, customer_name, customer_phone, confirmed_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13, CASE WHEN $4 = 'confirmed' THEN now() ELSE NULL END)
         RETURNING *`,
        [
          storeId, lines[0].sellerId, input.customer.id, status, subtotal, delivery, subtotal + delivery,
          address.id, address.line1, address.city, input.notes ?? null, input.customer.fullName,
          address.phone || input.customer.phone,
        ]
      );
      if (!order) throw new Error('Failed to create order');
      for (const line of lines) {
        await txQuery(
          tx,
          `INSERT INTO seller_order_items (order_id, product_id, variation_id, product_name, variation_label, image_url, unit_price_ugx, quantity, line_total_ugx)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
          [order.id, line.productId, line.variationId, line.productName, line.variationLabel, line.imageUrl, line.unitPriceUgx, line.quantity, line.unitPriceUgx * line.quantity]
        );
      }
      await txQuery(tx, `INSERT INTO seller_order_events (order_id, status, actor_id, actor_role, note) VALUES ($1,'pending',$2,'customer','Order placed')`, [order.id, input.customer.id]);
      if (status === 'confirmed') {
        await txQuery(tx, `INSERT INTO seller_order_events (order_id, status, actor_id, actor_role, note) VALUES ($1,'confirmed',$2,'seller','Confirmed automatically')`, [order.id, lines[0].sellerId]);
      }
      created.push({ ...order, storeName: lines[0].storeName } as SellerOrderRow);
    }
    return created;
  });

  for (const order of orders) {
    await notifySellerNewOrder({
      sellerId: order.seller_id, orderId: order.id, orderNumber: Number(order.order_number),
      totalUgx: Number(order.total_ugx), customerName: input.customer.fullName,
    });
    await lowStockCheck(order.id);
  }
  return orders;
}

async function lowStockCheck(orderId: string) {
  const rows = await query<{ id: string; name: string; owner_id: string; available: number; low_stock_threshold: number }>(
    `SELECT DISTINCT p.id, p.name, p.owner_id, (p.stock_quantity - p.reserved_quantity)::int AS available, p.low_stock_threshold
       FROM seller_order_items i JOIN seller_products p ON p.id = i.product_id
      WHERE i.order_id = $1 AND (p.stock_quantity - p.reserved_quantity) <= p.low_stock_threshold`,
    [orderId]
  );
  for (const r of rows) {
    await notifySellerLowStock({ sellerId: r.owner_id, productId: r.id, productName: r.name, remaining: Math.max(0, r.available) });
  }
}

export async function findOrder(id: string): Promise<SellerOrderRow | null> {
  return queryOne<SellerOrderRow>('SELECT * FROM seller_orders WHERE id = $1', [id]);
}

export async function orderItems(orderId: string) {
  return query('SELECT * FROM seller_order_items WHERE order_id = $1 ORDER BY id', [orderId]);
}

export async function orderEvents(orderId: string) {
  return query('SELECT * FROM seller_order_events WHERE order_id = $1 ORDER BY created_at', [orderId]);
}

export async function orderWithDetails(id: string) {
  const order = await queryOne<any>(
    `SELECT o.*, s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo, s.contact_phone AS store_phone,
            (SELECT count(*)::int FROM seller_store_reviews r WHERE r.order_id = o.id) AS reviewed
       FROM seller_orders o JOIN seller_stores s ON s.id = o.store_id
      WHERE o.id = $1`,
    [id]
  );
  if (!order) return null;
  const [items, events] = await Promise.all([orderItems(id), orderEvents(id)]);
  return { order, items, events };
}

export async function listStoreOrders(storeId: string, status?: SellerOrderStatus | 'open' | 'all', limit = 100) {
  const conditions = ['o.store_id = $1'];
  const params: unknown[] = [storeId];
  if (status && status !== 'all') {
    if (status === 'open') conditions.push(`o.status IN ('pending','confirmed','preparing','ready')`);
    else { params.push(status); conditions.push(`o.status = $${params.length}`); }
  }
  params.push(limit);
  return query(
    `SELECT o.*, (SELECT count(*)::int FROM seller_order_items i WHERE i.order_id = o.id) AS item_count,
            (SELECT string_agg(i.product_name, ', ' ORDER BY i.id) FROM seller_order_items i WHERE i.order_id = o.id) AS summary
       FROM seller_orders o
      WHERE ${conditions.join(' AND ')}
      ORDER BY o.created_at DESC
      LIMIT $${params.length}`,
    params
  );
}

export async function listCustomerOrders(customerId: string) {
  return query(
    `SELECT o.*, s.name AS store_name, s.slug AS store_slug, s.logo_url AS store_logo,
            (SELECT count(*)::int FROM seller_order_items i WHERE i.order_id = o.id) AS item_count,
            (SELECT string_agg(i.product_name, ', ' ORDER BY i.id) FROM seller_order_items i WHERE i.order_id = o.id) AS summary,
            (SELECT i.image_url FROM seller_order_items i WHERE i.order_id = o.id AND i.image_url IS NOT NULL ORDER BY i.id LIMIT 1) AS image_url,
            (SELECT count(*)::int FROM seller_store_reviews r WHERE r.order_id = o.id) AS reviewed
       FROM seller_orders o JOIN seller_stores s ON s.id = o.store_id
      WHERE o.customer_id = $1
      ORDER BY o.created_at DESC`,
    [customerId]
  );
}

export async function transitionOrder(input: {
  orderId: string;
  to: SellerOrderStatus;
  actor: { id: string; role: 'seller' | 'customer' | 'admin' };
  note?: string | null;
}): Promise<SellerOrderRow> {
  const result = await withTransaction(async (tx) => {
    const order = await txOne<SellerOrderRow>(tx, 'SELECT * FROM seller_orders WHERE id = $1 FOR UPDATE', [input.orderId]);
    if (!order) throw new ApiError(404, 'Order not found');

    const allowed = SELLER_ORDER_TRANSITIONS[order.status] ?? [];
    if (!allowed.includes(input.to)) {
      throw new ApiError(409, `An order that is ${order.status} cannot be marked ${input.to}`);
    }
    if (input.actor.role === 'customer') {
      if (input.to !== 'cancelled') throw new ApiError(403, 'Only the store can move an order forward');
      if (order.status !== 'pending') throw new ApiError(409, 'The store has already confirmed this order. Message them to cancel.');
    }
    if (input.actor.role === 'seller' && input.to === 'refunded') {
      throw new ApiError(403, 'Refunds are recorded by Duka support');
    }

    const items = await txQuery<{ product_id: string | null; variation_id: string | null; quantity: number }>(tx, 'SELECT product_id, variation_id, quantity FROM seller_order_items WHERE order_id = $1', [order.id]);
    if (input.to === 'completed') {
      for (const i of items) if (i.product_id) await moveStock(tx, { productId: i.product_id, variationId: i.variation_id, quantity: i.quantity }, 'commit', input.actor.id);
      await txQuery(tx, 'UPDATE seller_stores SET sales_count = sales_count + 1, updated_at = now() WHERE id = $1', [order.store_id]);
    } else if (input.to === 'cancelled') {
      for (const i of items) if (i.product_id) await moveStock(tx, { productId: i.product_id, variationId: i.variation_id, quantity: i.quantity }, 'release', input.actor.id);
    }

    const updated = await txOne<SellerOrderRow>(
      tx,
      `UPDATE seller_orders SET
         status = $2,
         confirmed_at = CASE WHEN $2 = 'confirmed' THEN now() ELSE confirmed_at END,
         completed_at = CASE WHEN $2 = 'completed' THEN now() ELSE completed_at END,
         cancelled_at = CASE WHEN $2 = 'cancelled' THEN now() ELSE cancelled_at END,
         cancelled_by = CASE WHEN $2 = 'cancelled' THEN $3 ELSE cancelled_by END,
         cancel_reason = CASE WHEN $2 = 'cancelled' THEN $4 ELSE cancel_reason END,
         payment_status = CASE WHEN $2 = 'completed' THEN 'paid' WHEN $2 = 'refunded' THEN 'refunded' ELSE payment_status END,
         updated_at = now()
       WHERE id = $1 RETURNING *`,
      [order.id, input.to, input.actor.id, input.note ?? null]
    );
    await txQuery(tx, 'INSERT INTO seller_order_events (order_id, status, actor_id, actor_role, note) VALUES ($1,$2,$3,$4,$5)', [order.id, input.to, input.actor.id, input.actor.role, input.note ?? null]);
    return updated!;
  });

  const store = await queryOne<{ name: string }>('SELECT name FROM seller_stores WHERE id = $1', [result.store_id]);
  if (input.actor.role !== 'customer') {
    await notifyCustomerOrderStatus({ customerId: result.customer_id, orderId: result.id, orderNumber: Number(result.order_number), status: input.to, storeName: store?.name ?? 'The store' });
  } else if (input.to === 'cancelled') {
    await notifySellerOrderCancelled({ sellerId: result.seller_id, orderId: result.id, orderNumber: Number(result.order_number) });
  }
  return result;
}

export async function listStoreCustomers(storeId: string) {
  return query(
    `SELECT u.id, u.full_name, u.avatar_url,
            count(o.id)::int AS orders,
            count(o.id) FILTER (WHERE o.status = 'completed')::int AS completed_orders,
            COALESCE(SUM(o.total_ugx) FILTER (WHERE o.status = 'completed'), 0)::bigint AS total_spent_ugx,
            MAX(o.created_at) AS last_order_at,
            MIN(o.created_at) AS first_order_at,
            EXISTS (SELECT 1 FROM seller_followers f WHERE f.follower_id = u.id AND f.store_id = $1) AS follows,
            (SELECT ROUND(AVG(r.stars)::numeric, 1) FROM seller_store_reviews r WHERE r.author_id = u.id AND r.store_id = $1) AS rating_given
       FROM seller_orders o JOIN users u ON u.id = o.customer_id
      WHERE o.store_id = $1
      GROUP BY u.id
      ORDER BY last_order_at DESC`,
    [storeId]
  );
}

export async function reviewOrder(input: {
  orderId: string;
  authorId: string;
  storeStars: number;
  storeComment?: string | null;
  products: { productId: string; stars: number; comment?: string | null }[];
}) {
  const order = await findOrder(input.orderId);
  if (!order) throw new ApiError(404, 'Order not found');
  if (order.customer_id !== input.authorId) throw new ApiError(403, 'Only the buyer can review this order');
  if (order.status !== 'completed') throw new ApiError(409, 'You can review once the order is completed');

  const items = await orderItems(order.id);
  const orderedProductIds = new Set(items.map((i: any) => i.product_id).filter(Boolean));

  await withTransaction(async (tx) => {
    await txQuery(
      tx,
      `INSERT INTO seller_store_reviews (store_id, order_id, author_id, stars, comment)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (order_id) DO UPDATE SET stars = EXCLUDED.stars, comment = EXCLUDED.comment`,
      [order.store_id, order.id, input.authorId, input.storeStars, input.storeComment ?? null]
    );
    for (const p of input.products) {
      if (!orderedProductIds.has(p.productId)) continue;
      await txQuery(
        tx,
        `INSERT INTO seller_product_reviews (product_id, order_id, author_id, stars, comment)
         VALUES ($1,$2,$3,$4,$5)
         ON CONFLICT (order_id, product_id) DO UPDATE SET stars = EXCLUDED.stars, comment = EXCLUDED.comment`,
        [p.productId, order.id, input.authorId, p.stars, p.comment ?? null]
      );
    }
  });

  await refreshStoreCounters(order.store_id);
  for (const p of input.products) if (orderedProductIds.has(p.productId)) await refreshProductRating(p.productId);
  await notifySellerReview({ sellerId: order.seller_id, stars: input.storeStars, storeReview: true });
  return { ok: true };
}

export async function listStoreReviews(storeId: string, limit = 100) {
  return query(
    `SELECT r.*, u.full_name AS author_name, u.avatar_url AS author_avatar, o.order_number,
            (SELECT string_agg(i.product_name, ', ' ORDER BY i.id) FROM seller_order_items i WHERE i.order_id = r.order_id) AS bought
       FROM seller_store_reviews r
       JOIN users u ON u.id = r.author_id
       JOIN seller_orders o ON o.id = r.order_id
      WHERE r.store_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2`,
    [storeId, limit]
  );
}

export async function listStoreProductReviews(storeId: string, limit = 100) {
  return query(
    `SELECT r.*, u.full_name AS author_name, u.avatar_url AS author_avatar, p.name AS product_name
       FROM seller_product_reviews r
       JOIN users u ON u.id = r.author_id
       JOIN seller_products p ON p.id = r.product_id
      WHERE p.store_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2`,
    [storeId, limit]
  );
}

export async function replyToReview(storeId: string, reviewId: string, reply: string) {
  return queryOne(
    'UPDATE seller_store_reviews SET reply = $3, replied_at = now() WHERE id = $1 AND store_id = $2 RETURNING *',
    [reviewId, storeId, reply]
  );
}

export async function publicStoreReviews(storeId: string, limit = 20) {
  return query(
    `SELECT r.id, r.stars, r.comment, r.reply, r.replied_at, r.created_at, u.full_name AS author_name, u.avatar_url AS author_avatar
       FROM seller_store_reviews r JOIN users u ON u.id = r.author_id
      WHERE r.store_id = $1 ORDER BY r.created_at DESC LIMIT $2`,
    [storeId, limit]
  );
}
