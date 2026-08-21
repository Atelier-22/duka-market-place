-- ---------------------------------------------------------------------------
-- 006: live location works both ways
--
-- Only the shopper could ever report a position, and the only thing the map
-- had to show them in return was the delivery address — which is NULL on every
-- address in the database, because nothing has ever captured coordinates. So a
-- shopper's map showed exactly one thing: themselves. Useless for the one
-- question they actually have, which is where the customer is.
--
-- The table is generalised rather than duplicated: one row per position report,
-- tagged with which party sent it.
--
-- Re-runnable: every statement is guarded.
-- ---------------------------------------------------------------------------

-- The table is no longer shopper-specific; neither is the column.
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

-- Which side of the order this position belongs to. Existing rows are all
-- shopper reports, which is what the default records.
ALTER TABLE order_locations ADD COLUMN IF NOT EXISTS party VARCHAR(16) NOT NULL DEFAULT 'shopper';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'order_locations_party_check') THEN
    ALTER TABLE order_locations ADD CONSTRAINT order_locations_party_check
      CHECK (party IN ('shopper', 'customer'));
  END IF;
END $$;

-- "Latest position for this order and this party" is the only read there is.
CREATE INDEX IF NOT EXISTS idx_order_locations_latest
  ON order_locations(order_id, party, recorded_at DESC);
