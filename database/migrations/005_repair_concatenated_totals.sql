-- ---------------------------------------------------------------------------
-- 005: repair totals that were string-concatenated instead of added
--
-- The `pg` driver returns BIGINT as a string, so computePricing was building
-- total_amount_ugx with `"100000" + "5000" + "5000" + "500"` — producing
-- 10000050005000500 instead of 110500. Customers were quoted, and payment rows
-- were written for, a figure ten orders of magnitude too large.
--
-- The driver now parses int8 as a number (backend/src/db/pool.ts), so no new
-- rows can be wrong. This repairs the ones already stored.
--
-- Only rows whose total disagrees with their own line items are touched, and
-- each is recomputed from those line items — the same sum the pricing service
-- produces. Re-runnable: a second run matches nothing.
-- ---------------------------------------------------------------------------

UPDATE orders
   SET total_amount_ugx = COALESCE(item_price_ugx, 0)
                        + COALESCE(shopping_fee_ugx, 0)
                        + COALESCE(delivery_fee_ugx, 0)
                        + COALESCE(platform_fee_ugx, 0)
 WHERE total_amount_ugx IS NOT NULL
   AND total_amount_ugx <> COALESCE(item_price_ugx, 0)
                         + COALESCE(shopping_fee_ugx, 0)
                         + COALESCE(delivery_fee_ugx, 0)
                         + COALESCE(platform_fee_ugx, 0);

-- Payment rows were written from the same bad total.
UPDATE payments p
   SET amount_ugx = o.total_amount_ugx
  FROM orders o
 WHERE p.order_id = o.id
   AND o.total_amount_ugx IS NOT NULL
   AND p.amount_ugx <> o.total_amount_ugx;

-- And a customer's lifetime spend accumulated it on completion.
UPDATE customer_profiles cp
   SET total_spent_ugx = COALESCE(actual.spent, 0)
  FROM (
    SELECT customer_id, sum(total_amount_ugx) AS spent
      FROM orders WHERE status = 'completed' GROUP BY customer_id
  ) actual
 WHERE cp.user_id = actual.customer_id
   AND cp.total_spent_ugx <> COALESCE(actual.spent, 0);
