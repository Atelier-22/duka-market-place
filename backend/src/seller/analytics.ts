import { query, queryOne } from '../db/pool';

export type RangeKey = 'today' | '7d' | '30d' | '90d' | '12m' | 'custom';

export function resolveRange(range: RangeKey, from?: string, to?: string): { from: Date; to: Date; bucket: 'day' | 'week' | 'month' } {
  const end = to ? new Date(to) : new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  let bucket: 'day' | 'week' | 'month' = 'day';
  switch (range) {
    case 'today': start.setHours(0, 0, 0, 0); break;
    case '7d': start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0); break;
    case '30d': start.setDate(start.getDate() - 29); start.setHours(0, 0, 0, 0); break;
    case '90d': start.setDate(start.getDate() - 89); start.setHours(0, 0, 0, 0); bucket = 'week'; break;
    case '12m': start.setMonth(start.getMonth() - 11); start.setDate(1); start.setHours(0, 0, 0, 0); bucket = 'month'; break;
    case 'custom': {
      const s = from ? new Date(from) : new Date(end.getTime() - 29 * 86_400_000);
      s.setHours(0, 0, 0, 0);
      const days = Math.max(1, Math.round((end.getTime() - s.getTime()) / 86_400_000));
      bucket = days > 200 ? 'month' : days > 60 ? 'week' : 'day';
      return { from: s, to: end, bucket };
    }
  }
  return { from: start, to: end, bucket };
}

export async function storeAnalytics(storeId: string, range: RangeKey, from?: string, to?: string) {
  const r = resolveRange(range, from, to);
  const params = [storeId, r.from.toISOString(), r.to.toISOString()];

  const [totals, previous, series, topProducts, slowProducts, categories, followers, reviews, viewsRow, statusMix] = await Promise.all([
    queryOne<any>(
      `SELECT count(*)::int AS orders,
              count(*) FILTER (WHERE status = 'completed')::int AS completed,
              count(*) FILTER (WHERE status = 'cancelled')::int AS cancelled,
              COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_ugx,
              COALESCE(SUM(total_ugx) FILTER (WHERE status NOT IN ('cancelled','refunded')), 0)::bigint AS booked_ugx,
              COALESCE(AVG(total_ugx) FILTER (WHERE status = 'completed'), 0)::bigint AS avg_order_ugx,
              count(DISTINCT customer_id)::int AS customers
         FROM seller_orders WHERE store_id = $1 AND created_at BETWEEN $2 AND $3`,
      params
    ),
    queryOne<any>(
      `SELECT count(*)::int AS orders,
              COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_ugx
         FROM seller_orders WHERE store_id = $1 AND created_at BETWEEN $2::timestamptz - ($3::timestamptz - $2::timestamptz) AND $2`,
      params
    ),
    query<any>(
      `SELECT date_trunc($4, o.created_at) AS bucket,
              count(*)::int AS orders,
              COALESCE(SUM(o.total_ugx) FILTER (WHERE o.status = 'completed'), 0)::bigint AS revenue_ugx,
              COALESCE(SUM(i.quantity), 0)::int AS units
         FROM seller_orders o
         LEFT JOIN seller_order_items i ON i.order_id = o.id
        WHERE o.store_id = $1 AND o.created_at BETWEEN $2 AND $3
        GROUP BY 1 ORDER BY 1`,
      [...params, r.bucket]
    ),
    query<any>(
      `SELECT p.id, p.name, SUM(i.quantity)::int AS units, SUM(i.line_total_ugx)::bigint AS revenue_ugx,
              (SELECT url FROM seller_product_images im WHERE im.product_id = p.id ORDER BY position LIMIT 1) AS image_url
         FROM seller_order_items i
         JOIN seller_orders o ON o.id = i.order_id
         JOIN seller_products p ON p.id = i.product_id
        WHERE o.store_id = $1 AND o.created_at BETWEEN $2 AND $3 AND o.status <> 'cancelled'
        GROUP BY p.id ORDER BY units DESC, revenue_ugx DESC LIMIT 8`,
      params
    ),
    query<any>(
      `SELECT p.id, p.name, p.stock_quantity - p.reserved_quantity AS available, p.view_count,
              COALESCE((SELECT SUM(i.quantity) FROM seller_order_items i JOIN seller_orders o ON o.id = i.order_id
                         WHERE i.product_id = p.id AND o.created_at BETWEEN $2 AND $3 AND o.status <> 'cancelled'), 0)::int AS units
         FROM seller_products p
        WHERE p.store_id = $1 AND p.status = 'published'
        ORDER BY units ASC, p.view_count ASC, p.published_at ASC LIMIT 8`,
      params
    ),
    query<any>(
      `SELECT p.category, SUM(i.quantity)::int AS units, SUM(i.line_total_ugx)::bigint AS revenue_ugx, count(DISTINCT o.id)::int AS orders
         FROM seller_order_items i
         JOIN seller_orders o ON o.id = i.order_id
         JOIN seller_products p ON p.id = i.product_id
        WHERE o.store_id = $1 AND o.created_at BETWEEN $2 AND $3 AND o.status <> 'cancelled'
        GROUP BY p.category ORDER BY revenue_ugx DESC`,
      params
    ),
    queryOne<any>(
      `SELECT count(*) FILTER (WHERE created_at BETWEEN $2 AND $3)::int AS gained, count(*)::int AS total
         FROM seller_followers WHERE store_id = $1`,
      params
    ),
    queryOne<any>(
      `SELECT count(*) FILTER (WHERE created_at BETWEEN $2 AND $3)::int AS received,
              COALESCE(ROUND(AVG(stars) FILTER (WHERE created_at BETWEEN $2 AND $3)::numeric, 2), 0) AS avg_in_range,
              COALESCE(ROUND(AVG(stars)::numeric, 2), 0) AS avg_all, count(*)::int AS total
         FROM seller_store_reviews WHERE store_id = $1`,
      params
    ),
    queryOne<any>(
      `SELECT COALESCE(SUM(v.views), 0)::int AS views
         FROM seller_product_views v JOIN seller_products p ON p.id = v.product_id
        WHERE p.store_id = $1 AND v.day BETWEEN $2::date AND $3::date`,
      params
    ),
    query<any>(
      `SELECT status, count(*)::int AS n FROM seller_orders WHERE store_id = $1 AND created_at BETWEEN $2 AND $3 GROUP BY status`,
      params
    ),
  ]);

  const orders = Number(totals?.orders ?? 0);
  const views = Number(viewsRow?.views ?? 0);
  return {
    range: { key: range, from: r.from.toISOString(), to: r.to.toISOString(), bucket: r.bucket },
    totals: {
      orders,
      completed: Number(totals?.completed ?? 0),
      cancelled: Number(totals?.cancelled ?? 0),
      revenueUgx: Number(totals?.revenue_ugx ?? 0),
      bookedUgx: Number(totals?.booked_ugx ?? 0),
      avgOrderUgx: Number(totals?.avg_order_ugx ?? 0),
      customers: Number(totals?.customers ?? 0),
      views,
      conversionPercent: views > 0 ? Math.round((orders / views) * 1000) / 10 : null,
      followersGained: Number(followers?.gained ?? 0),
      followersTotal: Number(followers?.total ?? 0),
      reviewsReceived: Number(reviews?.received ?? 0),
      ratingInRange: Number(reviews?.avg_in_range ?? 0),
      ratingAll: Number(reviews?.avg_all ?? 0),
      ratingCount: Number(reviews?.total ?? 0),
    },
    previous: { orders: Number(previous?.orders ?? 0), revenueUgx: Number(previous?.revenue_ugx ?? 0) },
    series: series.map((s) => ({ bucket: s.bucket, orders: Number(s.orders), revenueUgx: Number(s.revenue_ugx), units: Number(s.units) })),
    topProducts,
    slowProducts,
    categories,
    statusMix,
  };
}

export async function storeForecast(storeId: string) {
  const rows = await query<any>(
    `SELECT p.id, p.name, p.stock_quantity - p.reserved_quantity AS available, p.low_stock_threshold, p.sales_count,
            (SELECT url FROM seller_product_images im WHERE im.product_id = p.id ORDER BY position LIMIT 1) AS image_url,
            COALESCE((SELECT SUM(i.quantity) FROM seller_order_items i JOIN seller_orders o ON o.id = i.order_id
                       WHERE i.product_id = p.id AND o.status <> 'cancelled' AND o.created_at > now() - interval '30 days'), 0)::int AS units_30,
            COALESCE((SELECT SUM(i.quantity) FROM seller_order_items i JOIN seller_orders o ON o.id = i.order_id
                       WHERE i.product_id = p.id AND o.status <> 'cancelled' AND o.created_at > now() - interval '7 days'), 0)::int AS units_7,
            COALESCE((SELECT SUM(i.quantity) FROM seller_order_items i JOIN seller_orders o ON o.id = i.order_id
                       WHERE i.product_id = p.id AND o.status <> 'cancelled' AND o.created_at BETWEEN now() - interval '60 days' AND now() - interval '30 days'), 0)::int AS units_prev_30,
            COALESCE((SELECT SUM(v.views) FROM seller_product_views v WHERE v.product_id = p.id AND v.day > CURRENT_DATE - 30), 0)::int AS views_30,
            GREATEST(1, LEAST(30, EXTRACT(DAY FROM now() - COALESCE(p.published_at, p.created_at))::int)) AS days_live
       FROM seller_products p
      WHERE p.store_id = $1 AND p.status = 'published'
      ORDER BY units_30 DESC, p.view_count DESC`,
    [storeId]
  );

  const products = rows.map((r) => {
    const daily = Number(r.units_30) / Number(r.days_live);
    const recentDaily = Number(r.units_7) / Math.min(7, Number(r.days_live));
    const weighted = daily * 0.6 + recentDaily * 0.4;
    const available = Number(r.available);
    const daysOfStock = weighted > 0 ? Math.floor(available / weighted) : null;
    const coverDays = 30;
    const recommended = weighted > 0 ? Math.max(0, Math.ceil(weighted * coverDays) - available) : 0;
    const prev = Number(r.units_prev_30);
    const trend = prev === 0 ? (Number(r.units_30) > 0 ? 'new' : 'flat') : Number(r.units_30) > prev * 1.15 ? 'up' : Number(r.units_30) < prev * 0.85 ? 'down' : 'flat';
    const risk = daysOfStock === null ? 'none' : daysOfStock <= 3 ? 'critical' : daysOfStock <= 10 ? 'soon' : 'ok';
    return {
      id: r.id,
      name: r.name,
      imageUrl: r.image_url,
      available,
      lowStockThreshold: Number(r.low_stock_threshold),
      unitsLast30: Number(r.units_30),
      unitsLast7: Number(r.units_7),
      unitsPrevious30: prev,
      views30: Number(r.views_30),
      dailyRate: Math.round(weighted * 100) / 100,
      daysOfStock,
      stockoutDate: daysOfStock !== null ? new Date(Date.now() + daysOfStock * 86_400_000).toISOString() : null,
      recommendedRestock: recommended,
      trend,
      risk,
    };
  });

  const fast = [...products].filter((p) => p.dailyRate > 0).sort((a, b) => b.dailyRate - a.dailyRate).slice(0, 5);
  const slow = [...products].filter((p) => p.unitsLast30 === 0).sort((a, b) => b.available - a.available).slice(0, 5);
  const atRisk = products.filter((p) => p.risk === 'critical' || p.risk === 'soon');
  const weekday = await query<any>(
    `SELECT EXTRACT(ISODOW FROM created_at)::int AS dow, count(*)::int AS orders
       FROM seller_orders WHERE store_id = $1 AND status <> 'cancelled' AND created_at > now() - interval '90 days'
      GROUP BY 1 ORDER BY 1`,
    [storeId]
  );

  return {
    method: 'Weighted average of the last 30 and 7 days of confirmed sales per product, projected forward. No external model.',
    generatedAt: new Date().toISOString(),
    products,
    fastMoving: fast,
    slowMoving: slow,
    stockoutRisk: atRisk,
    weekdayPattern: weekday,
  };
}

export async function sellerDashboard(storeId: string) {
  const [stock, orders, followers, recentOrders, recentReviews, lowStock, sales7, topProducts] = await Promise.all([
    queryOne<any>(
      `SELECT count(*)::int AS products,
              count(*) FILTER (WHERE status = 'published')::int AS published,
              count(*) FILTER (WHERE status = 'draft')::int AS drafts,
              COALESCE(SUM((stock_quantity - reserved_quantity) * COALESCE(sale_price_ugx, price_ugx)) FILTER (WHERE status <> 'archived'), 0)::bigint AS inventory_value_ugx,
              count(*) FILTER (WHERE status = 'published' AND stock_quantity - reserved_quantity <= low_stock_threshold)::int AS low_stock,
              count(*) FILTER (WHERE status = 'published' AND stock_quantity - reserved_quantity <= 0)::int AS out_of_stock
         FROM seller_products WHERE store_id = $1`,
      [storeId]
    ),
    queryOne<any>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'pending')::int AS pending,
              count(*) FILTER (WHERE status IN ('confirmed','preparing','ready'))::int AS in_progress,
              count(*) FILTER (WHERE status = 'completed')::int AS completed,
              COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_ugx,
              COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed' AND completed_at::date = CURRENT_DATE), 0)::bigint AS revenue_today_ugx,
              count(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS orders_today,
              count(DISTINCT customer_id)::int AS customers
         FROM seller_orders WHERE store_id = $1`,
      [storeId]
    ),
    queryOne<any>('SELECT count(*)::int AS total, count(*) FILTER (WHERE created_at > now() - interval \'7 days\')::int AS week FROM seller_followers WHERE store_id = $1', [storeId]),
    query<any>(
      `SELECT o.id, o.order_number, o.status, o.total_ugx, o.customer_name, o.created_at,
              (SELECT string_agg(i.product_name, ', ' ORDER BY i.id) FROM seller_order_items i WHERE i.order_id = o.id) AS summary
         FROM seller_orders o WHERE o.store_id = $1 ORDER BY o.created_at DESC LIMIT 6`,
      [storeId]
    ),
    query<any>(
      `SELECT r.id, r.stars, r.comment, r.created_at, u.full_name AS author_name
         FROM seller_store_reviews r JOIN users u ON u.id = r.author_id
        WHERE r.store_id = $1 ORDER BY r.created_at DESC LIMIT 4`,
      [storeId]
    ),
    query<any>(
      `SELECT id, name, stock_quantity - reserved_quantity AS available, low_stock_threshold
         FROM seller_products WHERE store_id = $1 AND status = 'published' AND stock_quantity - reserved_quantity <= low_stock_threshold
        ORDER BY available ASC, name LIMIT 6`,
      [storeId]
    ),
    query<any>(
      `SELECT d::date AS day,
              COALESCE((SELECT count(*) FROM seller_orders o WHERE o.store_id = $1 AND o.created_at::date = d::date), 0)::int AS orders,
              COALESCE((SELECT SUM(total_ugx) FROM seller_orders o WHERE o.store_id = $1 AND o.status = 'completed' AND o.completed_at::date = d::date), 0)::bigint AS revenue_ugx
         FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') d
        ORDER BY 1`,
      [storeId]
    ),
    query<any>(
      `SELECT p.id, p.name, p.sales_count, p.view_count, p.rating_avg,
              (SELECT url FROM seller_product_images im WHERE im.product_id = p.id ORDER BY position LIMIT 1) AS image_url
         FROM seller_products p WHERE p.store_id = $1 AND p.status = 'published'
        ORDER BY p.sales_count DESC, p.view_count DESC LIMIT 5`,
      [storeId]
    ),
  ]);

  return { stock, orders, followers, recentOrders, recentReviews, lowStock, sales14: sales7, topProducts };
}

export async function adminSellerStats() {
  const [sellers, stores, products, orders, reviews, followers, pendingVerifications, growth] = await Promise.all([
    queryOne<any>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE u.is_active AND NOT sp.is_suspended)::int AS active,
              count(*) FILTER (WHERE sp.is_suspended)::int AS suspended,
              count(*) FILTER (WHERE sp.verification_status = 'verified')::int AS verified,
              count(*) FILTER (WHERE sp.verification_status = 'pending')::int AS pending,
              count(*) FILTER (WHERE sp.verification_status IN ('unverified','rejected'))::int AS unverified,
              count(*) FILTER (WHERE u.created_at > now() - interval '30 days')::int AS new_30d,
              count(*) FILTER (WHERE u.created_at > now() - interval '7 days')::int AS new_7d
         FROM users u JOIN seller_profiles sp ON sp.user_id = u.id WHERE u.role = 'seller'`
    ),
    queryOne<any>(`SELECT count(*)::int AS total, count(*) FILTER (WHERE status = 'active')::int AS active FROM seller_stores`),
    queryOne<any>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status = 'published')::int AS published,
              count(*) FILTER (WHERE status = 'draft')::int AS drafts,
              count(*) FILTER (WHERE status = 'archived')::int AS archived,
              count(*) FILTER (WHERE status = 'published' AND stock_quantity - reserved_quantity <= 0)::int AS out_of_stock,
              count(*) FILTER (WHERE flagged_at IS NOT NULL)::int AS flagged
         FROM seller_products`
    ),
    queryOne<any>(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE status IN ('pending','confirmed','preparing','ready'))::int AS open,
              count(*) FILTER (WHERE status = 'completed')::int AS completed,
              COALESCE(SUM(total_ugx) FILTER (WHERE status = 'completed'), 0)::bigint AS revenue_ugx,
              count(*) FILTER (WHERE created_at::date = CURRENT_DATE)::int AS today
         FROM seller_orders`
    ),
    queryOne<any>(`SELECT count(*)::int AS total, COALESCE(ROUND(AVG(stars)::numeric, 2), 0) AS avg FROM seller_store_reviews`),
    queryOne<any>(`SELECT count(*)::int AS total FROM seller_followers`),
    queryOne<any>(`SELECT count(*)::int AS n FROM seller_verifications WHERE status = 'pending'`),
    query<any>(
      `SELECT d::date AS day, count(u.id)::int AS sellers
         FROM generate_series(CURRENT_DATE - 29, CURRENT_DATE, interval '1 day') d
         LEFT JOIN users u ON u.role = 'seller' AND u.created_at::date = d::date
        GROUP BY 1 ORDER BY 1`
    ),
  ]);
  return {
    sellers: {
      total: Number(sellers?.total ?? 0), active: Number(sellers?.active ?? 0), suspended: Number(sellers?.suspended ?? 0),
      verified: Number(sellers?.verified ?? 0), pending: Number(sellers?.pending ?? 0), unverified: Number(sellers?.unverified ?? 0),
      new30d: Number(sellers?.new_30d ?? 0), new7d: Number(sellers?.new_7d ?? 0),
    },
    stores: { total: Number(stores?.total ?? 0), active: Number(stores?.active ?? 0) },
    products: {
      total: Number(products?.total ?? 0), published: Number(products?.published ?? 0), drafts: Number(products?.drafts ?? 0),
      archived: Number(products?.archived ?? 0), outOfStock: Number(products?.out_of_stock ?? 0), flagged: Number(products?.flagged ?? 0),
    },
    orders: { total: Number(orders?.total ?? 0), open: Number(orders?.open ?? 0), completed: Number(orders?.completed ?? 0), revenueUgx: Number(orders?.revenue_ugx ?? 0), today: Number(orders?.today ?? 0) },
    reviews: { total: Number(reviews?.total ?? 0), avg: Number(reviews?.avg ?? 0) },
    followers: Number(followers?.total ?? 0),
    pendingVerifications: Number(pendingVerifications?.n ?? 0),
    growth,
  };
}
