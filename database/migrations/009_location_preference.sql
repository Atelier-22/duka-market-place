ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS share_location BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS location_prompt_dismissed_at TIMESTAMPTZ;
