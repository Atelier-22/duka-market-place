-- A product option (colour, size, model) carries the price the seller typed,
-- not a difference from the product price. Sellers were typing full prices
-- into the difference field, so buyers saw the two added together.
--
-- Existing rows: when any option of a product has a "difference" of at least
-- half the product price, the seller clearly typed full prices, so those are
-- kept as they are. Small differences are converted to the price they meant.

ALTER TABLE seller_product_variations
  ADD COLUMN IF NOT EXISTS price_ugx BIGINT CHECK (price_ugx IS NULL OR price_ugx > 0);

WITH intent AS (
  SELECT v.product_id,
         bool_or(abs(v.price_delta_ugx) >= p.price_ugx / 2) AS typed_full_prices
    FROM seller_product_variations v
    JOIN seller_products p ON p.id = v.product_id
   GROUP BY v.product_id
)
UPDATE seller_product_variations v
   SET price_ugx = CASE
                     WHEN v.price_delta_ugx = 0 THEN NULL
                     WHEN i.typed_full_prices AND v.price_delta_ugx > 0 THEN v.price_delta_ugx
                     ELSE GREATEST(1, p.price_ugx + v.price_delta_ugx)
                   END
  FROM seller_products p, intent i
 WHERE p.id = v.product_id AND i.product_id = v.product_id AND v.price_ugx IS NULL;

UPDATE seller_product_variations SET price_delta_ugx = 0;
