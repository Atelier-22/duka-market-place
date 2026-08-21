-- ---------------------------------------------------------------------------
-- 004: presence, delivery receipts, and voice notes
--
-- Three things the chat could not express before:
--   1. Whether the other person is around right now (users.last_seen_at).
--   2. Whether a message actually reached their device (messages.delivered_at)
--      as distinct from whether they read it (messages.read_at, already there).
--   3. What kind of attachment a message carries — an image renders inline and
--      zooms, a voice note needs a player and a duration.
--
-- Re-runnable: every statement is guarded.
-- ---------------------------------------------------------------------------

-- 1. Presence -----------------------------------------------------------------
-- Touched by requireAuth on every authenticated request (throttled in-process),
-- so "online" means "has used the app in the last minute" for customers and
-- shoppers alike. shopper_profiles.is_online stays what it always was: a
-- shopper's deliberate "I am available for jobs" switch, which is a different
-- question from "are they at their phone".
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_users_last_seen ON users(last_seen_at);

-- 2. Delivery receipts --------------------------------------------------------
-- Stamped when the recipient's client fetches the message, which is the only
-- moment we can honestly claim it reached them.
ALTER TABLE messages ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

-- Backfill: anything already read was self-evidently delivered. Without this
-- every historic read message would render as a single "sent" tick.
UPDATE messages SET delivered_at = read_at WHERE read_at IS NOT NULL AND delivered_at IS NULL;

-- Drives the "mark everything addressed to me as delivered" sweep.
CREATE INDEX IF NOT EXISTS idx_messages_undelivered
  ON messages(order_id, sender_id) WHERE delivered_at IS NULL;

-- 3. Attachment kind ----------------------------------------------------------
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_type VARCHAR(16);
ALTER TABLE messages ADD COLUMN IF NOT EXISTS attachment_duration_ms INTEGER;

-- Existing rows only ever held photos.
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
