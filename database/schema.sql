
CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

CREATE TYPE user_role AS ENUM ('customer', 'shopper', 'admin');

CREATE TYPE verification_status AS ENUM ('unverified', 'pending', 'approved', 'rejected');

CREATE TYPE sourcing_type AS ENUM ('specific_market', 'specific_shop', 'social_seller', 'shopper_choice');

CREATE TYPE request_status AS ENUM (
  'draft',
  'open',              -- posted, visible to shoppers, awaiting offers/acceptance
  'offer_received',    -- at least one shopper offer exists (find-it-for-me mode)
  'assigned',          -- a shopper has been assigned / accepted
  'cancelled',
  'expired'
);

CREATE TYPE order_status AS ENUM (
  'requested',
  'shopper_assigned',
  'shopping',
  'item_found',
  'awaiting_customer_approval',
  'purchased',
  'out_for_delivery',
  'delivered',
  'completed',
  'cancelled',
  'disputed',
  'refunded'
);

CREATE TYPE offer_status AS ENUM ('pending', 'accepted', 'declined', 'withdrawn');

CREATE TYPE payment_method AS ENUM ('cash_on_delivery', 'mobile_money', 'card', 'manual');

CREATE TYPE payment_status AS ENUM ('pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded');

CREATE TYPE transaction_type AS ENUM (
  'item_charge', 'shopping_fee', 'delivery_fee', 'platform_fee',
  'shopper_payout', 'refund', 'adjustment'
);

CREATE TYPE dispute_status AS ENUM ('open', 'under_review', 'resolved_customer', 'resolved_shopper', 'resolved_split', 'closed');

CREATE TYPE notification_channel AS ENUM ('in_app', 'sms', 'email', 'push');

CREATE TYPE evidence_type AS ENUM ('item_photo', 'receipt', 'delivery_proof', 'verification_document', 'dispute_evidence');

CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role              user_role NOT NULL,
  full_name         VARCHAR(150) NOT NULL,
  email             VARCHAR(255),
  phone             VARCHAR(30) NOT NULL,
  password_hash     TEXT NOT NULL,
  avatar_url        TEXT,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  phone_verified_at TIMESTAMPTZ,
  email_verified_at TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  -- Touched on every authenticated request; "online" in chat means this is
  -- within the last minute. Distinct from shopper_profiles.is_online, which is
  -- a deliberate "available for jobs" switch.
  last_seen_at      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uniqueness is scoped to the role, not the whole table: one person may hold
  -- both a customer and a shopper account on the same email/phone, but never
  -- two accounts of the same role. Two separate constraints are required —
  -- a single UNIQUE (email, phone, role) would compare the three columns as one
  -- tuple and still allow a duplicate phone within a role under a new email.
  CONSTRAINT users_email_role_key UNIQUE (email, role),
  CONSTRAINT users_phone_role_key UNIQUE (phone, role)
);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_last_seen ON users(last_seen_at);

CREATE TABLE customer_profiles (
  user_id           UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_address_id UUID, -- FK added after addresses table exists
  total_orders      INTEGER NOT NULL DEFAULT 0,
  total_spent_ugx   BIGINT NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shopper_profiles (
  user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  bio                     TEXT,
  operating_area          VARCHAR(150),      -- human-readable primary area, e.g. "Kampala Central"
  operating_lat           NUMERIC(9,6),
  operating_lng           NUMERIC(9,6),
  operating_radius_km     NUMERIC(5,2) NOT NULL DEFAULT 5,
  specialties             TEXT[] NOT NULL DEFAULT '{}', -- e.g. {'markets','electronics','groceries'}
  verification_status     verification_status NOT NULL DEFAULT 'unverified',
  is_online               BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg              NUMERIC(3,2) NOT NULL DEFAULT 0,
  rating_count            INTEGER NOT NULL DEFAULT 0,
  completed_jobs          INTEGER NOT NULL DEFAULT 0,
  cancelled_jobs          INTEGER NOT NULL DEFAULT 0,
  completion_rate         NUMERIC(5,2) NOT NULL DEFAULT 100,
  available_balance_ugx   BIGINT NOT NULL DEFAULT 0,
  lifetime_earnings_ugx   BIGINT NOT NULL DEFAULT 0,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shopper_verification ON shopper_profiles(verification_status);
CREATE INDEX idx_shopper_online ON shopper_profiles(is_online);

CREATE TABLE verification_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type     VARCHAR(50) NOT NULL, -- national_id, selfie, proof_of_address, etc.
  document_url      TEXT NOT NULL,        -- storage abstraction key, never exposed raw to other users
  status            verification_status NOT NULL DEFAULT 'pending',
  reviewed_by       UUID REFERENCES users(id),
  reviewed_at       TIMESTAMPTZ,
  rejection_reason  TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_verification_shopper ON verification_records(shopper_id);

CREATE TABLE locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          VARCHAR(150) NOT NULL,
  type          VARCHAR(30) NOT NULL DEFAULT 'market', -- market, mall, shop, supermarket
  city          VARCHAR(100) NOT NULL DEFAULT 'Kampala',
  lat           NUMERIC(9,6),
  lng           NUMERIC(9,6),
  description   TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_locations_city ON locations(city);

CREATE TABLE addresses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  label         VARCHAR(50) NOT NULL DEFAULT 'Home', -- Home, Work, Other
  line1         VARCHAR(255) NOT NULL,
  landmark      VARCHAR(255),
  city          VARCHAR(100) NOT NULL DEFAULT 'Kampala',
  lat           NUMERIC(9,6),
  lng           NUMERIC(9,6),
  phone         VARCHAR(30),
  is_default    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_addresses_user ON addresses(user_id);

ALTER TABLE customer_profiles
  ADD CONSTRAINT fk_customer_default_address
  FOREIGN KEY (default_address_id) REFERENCES addresses(id) ON DELETE SET NULL;

CREATE TABLE shopping_requests (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title              VARCHAR(200) NOT NULL,           -- "Black shoes, size 42"
  description        TEXT,
  sourcing_type      sourcing_type NOT NULL,
  location_id        UUID REFERENCES locations(id),   -- when sourcing_type = specific_market/shop
  social_seller_url  TEXT,                             -- when sourcing_type = social_seller
  budget_min_ugx     BIGINT,
  budget_max_ugx     BIGINT NOT NULL,
  delivery_address_id UUID NOT NULL REFERENCES addresses(id),
  status             request_status NOT NULL DEFAULT 'open',
  notes_for_shopper  TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_budget_positive CHECK (budget_max_ugx > 0)
);
CREATE INDEX idx_requests_customer ON shopping_requests(customer_id);
CREATE INDEX idx_requests_status ON shopping_requests(status);
CREATE INDEX idx_requests_location ON shopping_requests(location_id);

CREATE TABLE shopping_request_items (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id    UUID NOT NULL REFERENCES shopping_requests(id) ON DELETE CASCADE,
  name          VARCHAR(200) NOT NULL,
  quantity      VARCHAR(50) NOT NULL DEFAULT '1',
  description   TEXT,
  reference_photo_url TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_request_items_request ON shopping_request_items(request_id);

CREATE TABLE shopper_offers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id            UUID NOT NULL REFERENCES shopping_requests(id) ON DELETE CASCADE,
  shopper_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  estimated_item_price_ugx BIGINT,
  shopping_fee_ugx      BIGINT NOT NULL,
  delivery_fee_ugx      BIGINT NOT NULL,
  estimated_minutes     INTEGER,
  message               TEXT,
  status                offer_status NOT NULL DEFAULT 'pending',
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, shopper_id)
);
CREATE INDEX idx_offers_request ON shopper_offers(request_id);
CREATE INDEX idx_offers_shopper ON shopper_offers(shopper_id);

CREATE TABLE orders (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id          UUID NOT NULL REFERENCES shopping_requests(id),
  accepted_offer_id   UUID REFERENCES shopper_offers(id),
  customer_id         UUID NOT NULL REFERENCES users(id),
  shopper_id          UUID NOT NULL REFERENCES users(id),
  status              order_status NOT NULL DEFAULT 'requested',

  item_price_ugx      BIGINT,              
  shopping_fee_ugx    BIGINT NOT NULL DEFAULT 0,
  delivery_fee_ugx    BIGINT NOT NULL DEFAULT 0,
  platform_fee_ugx    BIGINT NOT NULL DEFAULT 0,
  total_amount_ugx    BIGINT,              

  delivery_address_id UUID NOT NULL REFERENCES addresses(id),

  requested_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  assigned_at         TIMESTAMPTZ,
  shopping_started_at TIMESTAMPTZ,
  item_found_at       TIMESTAMPTZ,
  approved_at         TIMESTAMPTZ,
  purchased_at        TIMESTAMPTZ,
  out_for_delivery_at TIMESTAMPTZ,
  delivered_at        TIMESTAMPTZ,
  completed_at        TIMESTAMPTZ,
  cancelled_at         TIMESTAMPTZ,

  -- Delivery clock. The shopper marks shopping done, then either starts
  -- delivering now (begins the ETA countdown) or defers to a later time
  -- agreed with the customer directly.
  shopping_done_at     TIMESTAMPTZ,
  delivery_started_at  TIMESTAMPTZ,
  delivery_eta_minutes INTEGER,
  delivery_deferred_to TIMESTAMPTZ,

  created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_shopper ON orders(shopper_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_request ON orders(request_id);

CREATE TABLE order_status_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  from_status   order_status,
  to_status     order_status NOT NULL,
  changed_by    UUID REFERENCES users(id),
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_status_history_order ON order_status_history(order_id);

CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  option_label    VARCHAR(50),           -- "Option 1", "Option 2"...
  name            VARCHAR(200) NOT NULL,
  price_ugx       BIGINT NOT NULL,
  photo_url       TEXT,
  shop_name       VARCHAR(150),
  is_selected     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_order_items_order ON order_items(order_id);

CREATE TABLE evidence (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID REFERENCES orders(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES users(id),
  type          evidence_type NOT NULL,
  file_url      TEXT NOT NULL,
  caption       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_evidence_order ON evidence(order_id);

CREATE TABLE receipts (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  evidence_id   UUID REFERENCES evidence(id),
  amount_ugx    BIGINT NOT NULL,
  shop_name     VARCHAR(150),
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_receipts_order ON receipts(order_id);

CREATE TABLE messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES users(id),
  body          TEXT,
  attachment_url TEXT,
  -- 'image' renders inline and opens in the zoom viewer; 'audio' is a voice
  -- note and needs a player, so the duration is captured at record time.
  attachment_type VARCHAR(16) CHECK (attachment_type IS NULL OR attachment_type IN ('image', 'audio', 'file')),
  attachment_duration_ms INTEGER,
  -- Two distinct facts, two columns: delivered = it reached their device
  -- (two ticks), read = they opened the thread (two green ticks).
  delivered_at  TIMESTAMPTZ,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_messages_order ON messages(order_id, created_at);
CREATE INDEX idx_messages_undelivered ON messages(order_id, sender_id) WHERE delivered_at IS NULL;

-- ----------------------------------------------------------------------------
-- PAYMENTS, FEES, TRANSACTIONS, EARNINGS
-- ----------------------------------------------------------------------------

-- Platform-wide fee configuration (admin-editable), versioned so historical
-- orders keep referring to the fee schedule that applied at the time.
CREATE TABLE fees (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  fee_type          VARCHAR(30) NOT NULL, -- 'platform_percentage' | 'flat_delivery' | 'per_km_delivery'
  value              NUMERIC(10,2) NOT NULL, -- percentage points or flat UGX depending on fee_type
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  effective_from    TIMESTAMPTZ NOT NULL DEFAULT now(),
  effective_to      TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE payments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  payer_id        UUID NOT NULL REFERENCES users(id),
  method          payment_method NOT NULL,
  status          payment_status NOT NULL DEFAULT 'pending',
  amount_ugx      BIGINT NOT NULL,
  provider        VARCHAR(50),          -- 'mtn_momo' | 'airtel_money' | 'card' | 'manual' — set by the abstraction
  provider_ref    VARCHAR(150),         -- external transaction id, once a real provider is wired in
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON payments(order_id);
CREATE INDEX idx_payments_status ON payments(status);

-- The immutable ledger. Every money movement (charges, fees, payouts,
-- refunds) is a row here. payments/shopper_earnings are derived views over
-- this for convenience; this table is the source of truth for accounting.
CREATE TABLE transactions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID REFERENCES orders(id),
  user_id       UUID REFERENCES users(id),      -- who this transaction is attributed to
  type          transaction_type NOT NULL,
  amount_ugx    BIGINT NOT NULL,                -- positive = credit to user_id, negative = debit
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_transactions_order ON transactions(order_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);

CREATE TABLE shopper_earnings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopper_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id      UUID NOT NULL REFERENCES orders(id),
  amount_ugx    BIGINT NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending | available | paid_out
  released_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id)
);
CREATE INDEX idx_earnings_shopper ON shopper_earnings(shopper_id);

CREATE TABLE deliveries (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id          UUID NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  dispatched_at     TIMESTAMPTZ,
  delivered_at      TIMESTAMPTZ,
  recipient_name    VARCHAR(150),
  proof_photo_url   TEXT,
  delivery_notes    TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Position trail for a shopper on an active order. The customer's map reads
-- the most recent row; older rows keep the route for support/disputes.
CREATE TABLE shopper_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shopper_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat           NUMERIC(9,6) NOT NULL,
  lng           NUMERIC(9,6) NOT NULL,
  accuracy_m    NUMERIC(8,2),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_shopper_locations_order ON shopper_locations(order_id, recorded_at DESC);

CREATE TABLE ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  rated_by      UUID NOT NULL REFERENCES users(id),
  rated_user    UUID NOT NULL REFERENCES users(id),
  stars         SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(order_id, rated_by)
);
CREATE INDEX idx_ratings_rated_user ON ratings(rated_user);

CREATE TABLE reviews (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rating_id     UUID NOT NULL REFERENCES ratings(id) ON DELETE CASCADE,
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE disputes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  raised_by       UUID NOT NULL REFERENCES users(id),
  reason          VARCHAR(100) NOT NULL, -- item_not_as_described, never_delivered, price_mismatch, etc.
  description     TEXT NOT NULL,
  status          dispute_status NOT NULL DEFAULT 'open',
  resolution_note TEXT,
  resolved_by     UUID REFERENCES users(id),
  resolved_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_disputes_order ON disputes(order_id);
CREATE INDEX idx_disputes_status ON disputes(status);

CREATE TABLE notifications (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel       notification_channel NOT NULL DEFAULT 'in_app',
  title         VARCHAR(150) NOT NULL,
  body          TEXT,
  link          TEXT,
  read_at       TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user ON notifications(user_id, read_at);

CREATE TABLE audit_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id      UUID REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,
  entity_type   VARCHAR(50) NOT NULL,
  entity_id     UUID,
  metadata      JSONB,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE platform_settings (
  key           VARCHAR(100) PRIMARY KEY,
  value         JSONB NOT NULL,
  updated_by    UUID REFERENCES users(id),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['users','customer_profiles','shopper_profiles','shopping_requests',
                            'shopper_offers','orders','payments'] LOOP
    EXECUTE format('CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON %I
                     FOR EACH ROW EXECUTE FUNCTION set_updated_at();', t, t);
  END LOOP;
END $$;
