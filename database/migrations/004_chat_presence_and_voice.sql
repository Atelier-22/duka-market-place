ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);

ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

UPDATE messages SET delivered_at = read_at WHERE read_at IS NOT NULL AND delivered_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_messages_undelivered
  ON messages(order_id, sender_id) WHERE delivered_at IS NULL;

ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(16);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_duration_ms INTEGER;

UPDATE messages SET attachment_type = 'image'
 WHERE attachment_url IS NOT NULL AND attachment_type IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'messages_attachment_type_check'
  ) THEN
    ALTER TABLE messages ADD CONSTRAINT messages_attachment_type_check
      CHECK (attachment_type IS NULL OR attachment_type IN ('image', 'audio', 'file'));
  END IF;
END $$;
