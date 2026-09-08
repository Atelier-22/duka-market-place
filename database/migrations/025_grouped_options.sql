ALTER TABLE product_attribute_options ADD COLUMN IF NOT EXISTS group_label VARCHAR(80);
CREATE INDEX IF NOT EXISTS idx_product_attribute_options_group ON product_attribute_options(attribute_id, group_label) WHERE group_label IS NOT NULL;
