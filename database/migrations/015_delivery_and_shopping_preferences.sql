-- Settings restructure: delivery preferences, delivery instructions,
-- security notifications, and shopping defaults, all on user_preferences.

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS delivery_instructions TEXT;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS delivery_handoff TEXT NOT NULL DEFAULT 'meet';

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS delivery_contact TEXT NOT NULL DEFAULT 'either';

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS notify_security BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS default_city TEXT;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS default_sourcing TEXT;
