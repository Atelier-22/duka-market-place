ALTER TABLE canonical_products
  ADD COLUMN IF NOT EXISTS family VARCHAR(80),
  ADD COLUMN IF NOT EXISTS family_slug VARCHAR(80),
  ADD COLUMN IF NOT EXISTS released_on DATE,
  ADD COLUMN IF NOT EXISTS lifecycle TEXT NOT NULL DEFAULT 'unknown' CHECK (lifecycle IN ('current', 'discontinued', 'unknown')),
  ADD COLUMN IF NOT EXISTS lifecycle_override TEXT CHECK (lifecycle_override IS NULL OR lifecycle_override IN ('current', 'discontinued')),
  ADD COLUMN IF NOT EXISTS aliases TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_canonical_products_family ON canonical_products(brand_slug, family_slug);
CREATE INDEX IF NOT EXISTS idx_canonical_products_search ON canonical_products(lower(display_name) text_pattern_ops);
