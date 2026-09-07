ALTER TABLE addresses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE addresses ADD COLUMN IF NOT EXISTS replaced_by UUID REFERENCES addresses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_addresses_user_live
  ON addresses(user_id, is_default DESC, created_at DESC)
  WHERE deleted_at IS NULL;
