-- A sellable unit of a product is a version (Pro, Pro Max, Large) combined with
-- a colour. Each row of seller_product_variations is one combination with its
-- own stock; the version carries the price, the colour carries a swatch.

ALTER TABLE seller_product_variations
  ADD COLUMN IF NOT EXISTS color_name VARCHAR(40),
  ADD COLUMN IF NOT EXISTS color_hex VARCHAR(9) CHECK (color_hex IS NULL OR color_hex ~ '^#[0-9A-Fa-f]{6}$');

CREATE INDEX IF NOT EXISTS idx_seller_product_variations_combo
  ON seller_product_variations(product_id, value, COALESCE(color_name, ''));
