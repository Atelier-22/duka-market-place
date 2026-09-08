-- Stores say how buyers get their goods: the store delivers, buyers collect,
-- or buyers send a Duka shopper. Sellers can be verified automatically, and
-- everyone starts in the light theme.

ALTER TABLE seller_stores
  ADD COLUMN IF NOT EXISTS fulfilment TEXT NOT NULL DEFAULT 'delivery'
  CHECK (fulfilment IN ('delivery', 'pickup', 'shopper'));

ALTER TABLE seller_profiles
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by TEXT CHECK (verified_by IS NULL OR verified_by IN ('auto', 'admin'));

ALTER TABLE user_preferences ALTER COLUMN theme SET DEFAULT 'light';
UPDATE user_preferences SET theme = 'light' WHERE theme = 'system';
