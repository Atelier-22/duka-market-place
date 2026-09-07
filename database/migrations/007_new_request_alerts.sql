ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notify_new_requests BOOLEAN NOT NULL DEFAULT TRUE;

CREATE INDEX IF NOT EXISTS idx_shopper_profiles_available
  ON shopper_profiles(verification_status, is_online);
