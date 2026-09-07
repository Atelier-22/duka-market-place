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

UPDATE payments p
   SET amount_ugx = o.total_amount_ugx
  FROM orders o
 WHERE p.order_id = o.id
   AND o.total_amount_ugx IS NOT NULL
   AND p.amount_ugx <> o.total_amount_ugx;

UPDATE customer_profiles cp
   SET total_spent_ugx = COALESCE(actual.spent, 0)
  FROM (
    SELECT customer_id, sum(total_amount_ugx) AS spent
      FROM orders WHERE status = 'completed' GROUP BY customer_id
  ) actual
 WHERE cp.user_id = actual.customer_id
   AND cp.total_spent_ugx <> COALESCE(actual.spent, 0);
