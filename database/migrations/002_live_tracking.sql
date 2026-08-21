-- 002: live delivery tracking.
--
-- Adds the shopper's position trail for an order plus the delivery clock:
-- a shopper marks shopping done, then either starts delivering immediately
-- (which begins the ETA countdown) or defers to a time agreed with the
-- customer over the phone.
--
-- Safe to run more than once.

BEGIN;

CREATE TABLE IF NOT EXISTS shopper_locations (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shopper_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lat           NUMERIC(9,6) NOT NULL,
  lng           NUMERIC(9,6) NOT NULL,
  accuracy_m    NUMERIC(8,2),
  recorded_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The common read is "latest position for this order", so index accordingly.
CREATE INDEX IF NOT EXISTS idx_shopper_locations_order
  ON shopper_locations(order_id, recorded_at DESC);

ALTER TABLE orders ADD COLUMN IF NOT EXISTS shopping_done_at     TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_started_at  TIMESTAMPTZ;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_eta_minutes INTEGER;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_deferred_to TIMESTAMPTZ;

COMMIT;
