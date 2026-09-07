DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema = 'public' AND table_name = 'shopper_locations')
     AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                      WHERE table_schema = 'public' AND table_name = 'order_locations')
  THEN
    ALTER TABLE shopper_locations RENAME TO order_locations;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_name = 'order_locations' AND column_name = 'shopper_id')
  THEN
    ALTER TABLE order_locations RENAME COLUMN shopper_id TO user_id;
  END IF;
END $$;

ALTER TABLE order_locations ADD COLUMN IF NOT EXISTS party VARCHAR(16) NOT NULL DEFAULT 'shopper';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_locations_party_check') THEN
    ALTER TABLE order_locations ADD CONSTRAINT order_locations_party_check
      CHECK (party IN ('shopper', 'customer'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_order_locations_latest
  ON order_locations(order_id, party, recorded_at DESC);
