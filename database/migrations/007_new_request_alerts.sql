-- ---------------------------------------------------------------------------
-- 007: alert shoppers when a job is posted
--
-- Shoppers had to keep reopening "Available jobs" to find out whether anything
-- had come in. Every other event in the app raises a bell entry; the one that
-- decides whether a shopper earns anything did not.
--
-- This is its own preference rather than folding into notify_offers, which is
-- the customer-facing "a shopper offered on your request" switch. They point in
-- opposite directions and a shopper wanting to mute job alerts should not have
-- to mute anything else.
--
-- Re-runnable.
-- ---------------------------------------------------------------------------

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notify_new_requests BOOLEAN NOT NULL DEFAULT TRUE;

-- The fan-out reads every candidate shopper on each new request, so the
-- filtering columns are worth an index once there are more than a handful.
CREATE INDEX IF NOT EXISTS idx_shopper_profiles_available
  ON shopper_profiles(verification_status, is_online);
