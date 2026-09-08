CREATE TABLE IF NOT EXISTS canonical_variants (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  dimension         TEXT NOT NULL CHECK (dimension IN ('colour', 'storage', 'size')),
  value             VARCHAR(80) NOT NULL,
  value_norm        VARCHAR(80) NOT NULL,
  display_hex       VARCHAR(9) CHECK (display_hex IS NULL OR display_hex ~ '^#[0-9A-Fa-f]{6}$'),
  position          INTEGER NOT NULL DEFAULT 0,
  source            TEXT NOT NULL DEFAULT 'catalogue' CHECK (source IN ('catalogue', 'admin', 'seller')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, dimension, value_norm)
);
CREATE INDEX IF NOT EXISTS idx_canonical_variants_product ON canonical_variants(product_id, dimension, position);

ALTER TABLE canonical_spec_sources DROP CONSTRAINT IF EXISTS canonical_spec_sources_source_type_check;
ALTER TABLE canonical_spec_sources ADD CONSTRAINT canonical_spec_sources_source_type_check
  CHECK (source_type IN ('catalogue', 'manufacturer', 'retailer', 'unknown', 'seller', 'admin'));
