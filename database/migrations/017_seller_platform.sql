-- The seller platform: profiles, stores, products, media, variations,
-- inventory history, marketplace orders, followers, reviews, promotions,
-- settings, verification, and a daily view counter for analytics.
--
-- Every seller-owned row hangs off seller_stores or seller_profiles with
-- ON DELETE CASCADE so removing a seller account removes their data, and
-- nothing here references customer or shopper business tables directly.

CREATE TABLE IF NOT EXISTS seller_profiles (
  user_id             UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  verification_status TEXT NOT NULL DEFAULT 'unverified'
                      CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected')),
  is_suspended        BOOLEAN NOT NULL DEFAULT FALSE,
  suspended_reason    TEXT,
  suspended_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seller_stores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  name             VARCHAR(120) NOT NULL,
  slug             VARCHAR(80) NOT NULL UNIQUE,
  tagline          VARCHAR(160),
  description      TEXT,
  category         TEXT NOT NULL DEFAULT 'general',
  city             TEXT NOT NULL DEFAULT 'Kampala',
  location         TEXT,
  contact_phone    VARCHAR(30),
  contact_email    VARCHAR(255),
  whatsapp         VARCHAR(30),
  logo_url         TEXT,
  cover_url        TEXT,
  policies         TEXT,
  delivery_fee_ugx BIGINT NOT NULL DEFAULT 5000 CHECK (delivery_fee_ugx >= 0),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'hidden', 'suspended')),
  rating_avg       NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count     INTEGER NOT NULL DEFAULT 0,
  follower_count   INTEGER NOT NULL DEFAULT 0,
  product_count    INTEGER NOT NULL DEFAULT 0,
  sales_count      INTEGER NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_stores_status   ON seller_stores(status);
CREATE INDEX IF NOT EXISTS idx_seller_stores_category ON seller_stores(category);
CREATE INDEX IF NOT EXISTS idx_seller_stores_city     ON seller_stores(city);

CREATE TABLE IF NOT EXISTS seller_products (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id            UUID NOT NULL REFERENCES seller_stores(id) ON DELETE CASCADE,
  owner_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                VARCHAR(200) NOT NULL,
  description         TEXT,
  category            TEXT NOT NULL DEFAULT 'general',
  subcategory         TEXT,
  brand               VARCHAR(80),
  model               VARCHAR(80),
  condition           TEXT NOT NULL DEFAULT 'new' CHECK (condition IN ('new', 'used', 'refurbished')),
  price_ugx           BIGINT NOT NULL CHECK (price_ugx > 0),
  sale_price_ugx      BIGINT CHECK (sale_price_ugx IS NULL OR (sale_price_ugx > 0 AND sale_price_ugx < price_ugx)),
  currency            CHAR(3) NOT NULL DEFAULT 'UGX',
  sku                 VARCHAR(64),
  stock_quantity      INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity   INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  low_stock_threshold INTEGER NOT NULL DEFAULT 5 CHECK (low_stock_threshold >= 0),
  specifications      JSONB NOT NULL DEFAULT '[]'::jsonb,
  delivery_info       TEXT,
  status              TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  is_featured         BOOLEAN NOT NULL DEFAULT FALSE,
  published_at        TIMESTAMPTZ,
  rating_avg          NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count        INTEGER NOT NULL DEFAULT 0,
  sales_count         INTEGER NOT NULL DEFAULT 0,
  view_count          INTEGER NOT NULL DEFAULT 0,
  flagged_at          TIMESTAMPTZ,
  flagged_reason      TEXT,
  flagged_by          UUID,
  search_text         TSVECTOR GENERATED ALWAYS AS (
                        to_tsvector('simple',
                          coalesce(name, '') || ' ' || coalesce(brand, '') || ' ' || coalesce(model, '') || ' ' ||
                          coalesce(category, '') || ' ' || coalesce(subcategory, '') || ' ' || coalesce(description, ''))
                      ) STORED,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_products_store_status ON seller_products(store_id, status);
CREATE INDEX IF NOT EXISTS idx_seller_products_published    ON seller_products(published_at DESC) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_seller_products_category     ON seller_products(category) WHERE status = 'published';
CREATE INDEX IF NOT EXISTS idx_seller_products_search       ON seller_products USING GIN (search_text);
CREATE UNIQUE INDEX IF NOT EXISTS idx_seller_products_sku   ON seller_products(store_id, sku) WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS seller_product_images (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  url        TEXT NOT NULL,
  position   INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_product_images_product ON seller_product_images(product_id, position);

CREATE TABLE IF NOT EXISTS seller_product_variations (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id      UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  name            VARCHAR(60) NOT NULL,
  value           VARCHAR(80) NOT NULL,
  price_delta_ugx BIGINT NOT NULL DEFAULT 0,
  stock_quantity  INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  reserved_quantity INTEGER NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  sku             VARCHAR(64),
  position        INTEGER NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_product_variations_product ON seller_product_variations(product_id, position);

CREATE TABLE IF NOT EXISTS seller_inventory_events (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id     UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  variation_id   UUID REFERENCES seller_product_variations(id) ON DELETE SET NULL,
  delta          INTEGER NOT NULL,
  quantity_after INTEGER NOT NULL,
  reason         TEXT NOT NULL CHECK (reason IN ('manual', 'restock', 'order_reserved', 'order_committed', 'order_released', 'correction')),
  note           TEXT,
  actor_id       UUID,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_inventory_events_product ON seller_inventory_events(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seller_orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number        BIGINT GENERATED ALWAYS AS IDENTITY UNIQUE,
  store_id            UUID NOT NULL REFERENCES seller_stores(id) ON DELETE CASCADE,
  seller_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  customer_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status              TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'completed', 'cancelled', 'refunded')),
  subtotal_ugx        BIGINT NOT NULL CHECK (subtotal_ugx >= 0),
  delivery_fee_ugx    BIGINT NOT NULL DEFAULT 0 CHECK (delivery_fee_ugx >= 0),
  total_ugx           BIGINT NOT NULL CHECK (total_ugx >= 0),
  payment_method      TEXT NOT NULL DEFAULT 'cash_on_delivery' CHECK (payment_method IN ('cash_on_delivery', 'mobile_money', 'manual')),
  payment_status      TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  delivery_address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
  delivery_line1      TEXT,
  delivery_city       TEXT,
  delivery_notes      TEXT,
  customer_name       TEXT NOT NULL,
  customer_phone      TEXT NOT NULL,
  cancel_reason       TEXT,
  cancelled_by        UUID,
  confirmed_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at        TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_orders_store    ON seller_orders(store_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_orders_customer ON seller_orders(customer_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seller_order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
  product_id      UUID REFERENCES seller_products(id) ON DELETE SET NULL,
  variation_id    UUID REFERENCES seller_product_variations(id) ON DELETE SET NULL,
  product_name    TEXT NOT NULL,
  variation_label TEXT,
  image_url       TEXT,
  unit_price_ugx  BIGINT NOT NULL CHECK (unit_price_ugx >= 0),
  quantity        INTEGER NOT NULL CHECK (quantity > 0),
  line_total_ugx  BIGINT NOT NULL CHECK (line_total_ugx >= 0)
);
CREATE INDEX IF NOT EXISTS idx_seller_order_items_order   ON seller_order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_seller_order_items_product ON seller_order_items(product_id);

CREATE TABLE IF NOT EXISTS seller_order_events (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  actor_id   UUID,
  actor_role TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_order_events_order ON seller_order_events(order_id, created_at);

CREATE TABLE IF NOT EXISTS seller_followers (
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  store_id    UUID NOT NULL REFERENCES seller_stores(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, store_id)
);
CREATE INDEX IF NOT EXISTS idx_seller_followers_store ON seller_followers(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seller_store_reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES seller_stores(id) ON DELETE CASCADE,
  order_id   UUID NOT NULL UNIQUE REFERENCES seller_orders(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment    TEXT,
  reply      TEXT,
  replied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_store_reviews_store ON seller_store_reviews(store_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seller_product_reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  order_id   UUID NOT NULL REFERENCES seller_orders(id) ON DELETE CASCADE,
  author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stars      INTEGER NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment    TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_seller_product_reviews_product ON seller_product_reviews(product_id, created_at DESC);

CREATE TABLE IF NOT EXISTS seller_promotions (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id   UUID NOT NULL REFERENCES seller_stores(id) ON DELETE CASCADE,
  name       VARCHAR(100) NOT NULL,
  kind       TEXT NOT NULL CHECK (kind IN ('percentage', 'fixed')),
  value      BIGINT NOT NULL CHECK (value > 0),
  starts_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at    TIMESTAMPTZ,
  is_active  BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (kind <> 'percentage' OR value <= 90)
);
CREATE INDEX IF NOT EXISTS idx_seller_promotions_store ON seller_promotions(store_id, is_active);

CREATE TABLE IF NOT EXISTS seller_promotion_products (
  promotion_id UUID NOT NULL REFERENCES seller_promotions(id) ON DELETE CASCADE,
  product_id   UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  PRIMARY KEY (promotion_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_seller_promotion_products_product ON seller_promotion_products(product_id);

CREATE TABLE IF NOT EXISTS seller_settings (
  user_id                UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  notify_orders          BOOLEAN NOT NULL DEFAULT TRUE,
  notify_reviews         BOOLEAN NOT NULL DEFAULT TRUE,
  notify_followers       BOOLEAN NOT NULL DEFAULT TRUE,
  notify_low_stock       BOOLEAN NOT NULL DEFAULT TRUE,
  notify_product_changes BOOLEAN NOT NULL DEFAULT TRUE,
  auto_confirm_orders    BOOLEAN NOT NULL DEFAULT FALSE,
  processing_days        INTEGER NOT NULL DEFAULT 2 CHECK (processing_days BETWEEN 0 AND 30),
  payout_method          TEXT NOT NULL DEFAULT 'mobile_money' CHECK (payout_method IN ('mobile_money', 'bank')),
  payout_name            TEXT,
  payout_phone           TEXT,
  payout_bank            TEXT,
  payout_account         TEXT,
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS seller_verifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name       TEXT NOT NULL,
  registration_number TEXT,
  document_key        TEXT,
  note                TEXT,
  status              TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  review_note         TEXT,
  reviewed_by         UUID,
  reviewed_at         TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_seller ON seller_verifications(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seller_verifications_status ON seller_verifications(status) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS seller_product_views (
  product_id UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  day        DATE NOT NULL,
  views      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, day)
);

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notify_store_updates BOOLEAN NOT NULL DEFAULT TRUE;
