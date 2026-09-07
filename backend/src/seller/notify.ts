import { query, queryOne } from '../db/pool';
import { createNotification } from '../models/notification.model';

async function push(input: { userId: string; title: string; body?: string | null; link?: string | null }) {
  try {
    await createNotification(input);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to write seller notification', err);
  }
}

async function sellerWants(sellerId: string, flag: 'notify_orders' | 'notify_reviews' | 'notify_followers' | 'notify_low_stock' | 'notify_product_changes'): Promise<boolean> {
  const row = await queryOne<Record<string, boolean>>(`SELECT ${flag} FROM seller_settings WHERE user_id = $1`, [sellerId]);
  return row ? row[flag] !== false : true;
}

export async function notifySellerNewOrder(input: { sellerId: string; orderId: string; orderNumber: number; totalUgx: number; customerName: string }) {
  if (!(await sellerWants(input.sellerId, 'notify_orders'))) return;
  await push({
    userId: input.sellerId,
    title: `New order #${input.orderNumber}`,
    body: `${input.customerName} ordered ${new Intl.NumberFormat('en-UG').format(input.totalUgx)} UGX from your store.`,
    link: `/seller/orders/${input.orderId}`,
  });
}

export async function notifySellerOrderCancelled(input: { sellerId: string; orderId: string; orderNumber: number }) {
  if (!(await sellerWants(input.sellerId, 'notify_orders'))) return;
  await push({
    userId: input.sellerId,
    title: `Order #${input.orderNumber} was cancelled`,
    body: 'The customer cancelled before you confirmed it. Reserved stock has been released.',
    link: `/seller/orders/${input.orderId}`,
  });
}

export async function notifySellerReview(input: { sellerId: string; stars: number; storeReview: boolean; productName?: string }) {
  if (!(await sellerWants(input.sellerId, 'notify_reviews'))) return;
  await push({
    userId: input.sellerId,
    title: input.storeReview ? `New ${input.stars}-star store review` : `New ${input.stars}-star review on ${input.productName}`,
    body: 'Open Reviews to read it and reply.',
    link: '/seller/reviews',
  });
}

export async function notifySellerFollower(input: { sellerId: string; followerName: string }) {
  if (!(await sellerWants(input.sellerId, 'notify_followers'))) return;
  await push({
    userId: input.sellerId,
    title: `${input.followerName} followed your store`,
    body: 'They will hear about the products you publish next.',
    link: '/seller/followers',
  });
}

export async function notifySellerLowStock(input: { sellerId: string; productId: string; productName: string; remaining: number }) {
  if (!(await sellerWants(input.sellerId, 'notify_low_stock'))) return;
  const recent = await queryOne(
    `SELECT id FROM notifications
      WHERE user_id = $1 AND link = $2 AND title LIKE 'Low stock:%' AND created_at > now() - interval '12 hours'
      LIMIT 1`,
    [input.sellerId, `/seller/inventory?product=${input.productId}`]
  );
  if (recent) return;
  await push({
    userId: input.sellerId,
    title: `Low stock: ${input.productName}`,
    body: input.remaining === 0 ? 'It is out of stock and hidden from buyers until you restock.' : `Only ${input.remaining} left.`,
    link: `/seller/inventory?product=${input.productId}`,
  });
}

export async function notifySellerVerification(input: { sellerId: string; verified: boolean; note?: string | null }) {
  await push({
    userId: input.sellerId,
    title: input.verified ? 'Your store is now verified' : 'Verification was not approved',
    body: input.verified
      ? 'Buyers will see the verified badge on your store and products.'
      : (input.note || 'Open Settings to see the reason and submit again.'),
    link: '/seller/settings/verification',
  });
}

export async function notifySellerProductModerated(input: { sellerId: string; productId: string; productName: string; action: 'unpublished' | 'flagged'; reason: string }) {
  if (!(await sellerWants(input.sellerId, 'notify_product_changes'))) return;
  await push({
    userId: input.sellerId,
    title: input.action === 'unpublished' ? `${input.productName} was unpublished by Duka` : `${input.productName} needs your attention`,
    body: input.reason,
    link: `/seller/products/${input.productId}/edit`,
  });
}

export async function notifySellerSuspension(input: { sellerId: string; suspended: boolean; reason?: string | null }) {
  await push({
    userId: input.sellerId,
    title: input.suspended ? 'Your store has been suspended' : 'Your store is active again',
    body: input.suspended ? (input.reason || 'Contact Duka support for details.') : 'Your products are visible to buyers again.',
    link: '/seller',
  });
}

export async function notifyCustomerOrderStatus(input: { customerId: string; orderId: string; orderNumber: number; status: string; storeName: string }) {
  const wants = await queryOne<{ notify_orders: boolean }>('SELECT notify_orders FROM user_preferences WHERE user_id = $1', [input.customerId]);
  if (wants && wants.notify_orders === false) return;
  const titles: Record<string, string> = {
    confirmed: `${input.storeName} confirmed your order`,
    preparing: `${input.storeName} is preparing your order`,
    ready: `Your order from ${input.storeName} is ready`,
    completed: `Order #${input.orderNumber} delivered`,
    cancelled: `${input.storeName} cancelled order #${input.orderNumber}`,
    refunded: `Order #${input.orderNumber} was refunded`,
  };
  const title = titles[input.status];
  if (!title) return;
  await push({
    userId: input.customerId,
    title,
    body: input.status === 'completed' ? 'Rate the store and the products when you have a moment.' : null,
    link: `/app/purchases/${input.orderId}`,
  });
}

export async function notifyFollowersOfNewProduct(input: { storeId: string; storeName: string; productId: string; productName: string; ownerId: string }): Promise<number> {
  const rows = await query<{ user_id: string }>(
    `INSERT INTO notifications (user_id, channel, title, body, link)
     SELECT f.follower_id, 'in_app', $2, $3, $4
       FROM seller_followers f
       JOIN users u ON u.id = f.follower_id AND u.is_active
       LEFT JOIN user_preferences p ON p.user_id = f.follower_id
      WHERE f.store_id = $1
        AND f.follower_id <> $5
        AND COALESCE(p.notify_store_updates, TRUE)
        AND NOT EXISTS (
          SELECT 1 FROM notifications n
           WHERE n.user_id = f.follower_id AND n.link = $4
        )
     RETURNING user_id`,
    [
      input.storeId,
      `New from ${input.storeName}: ${input.productName}`,
      'A store you follow just published this.',
      `/product/${input.productId}`,
      input.ownerId,
    ]
  );
  return rows.length;
}
