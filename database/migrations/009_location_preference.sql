-- ---------------------------------------------------------------------------
-- 009: remember whether someone has agreed to share their location
--
-- The browser owns the actual permission, and it cannot be read across devices
-- or re-asked for once denied. What this column stores is the separate thing:
-- whether the person has said yes to us. That is what decides whether we prompt
-- them again on a later visit, and it has to survive logging in on a new phone.
--
-- Defaults to FALSE: nobody is sharing their location until they say so.
--
-- Re-runnable.
-- ---------------------------------------------------------------------------

ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS share_location BOOLEAN NOT NULL DEFAULT FALSE;

-- When they last dismissed the prompt, so it can come back occasionally rather
-- than either nagging on every page load or never appearing again.
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS location_prompt_dismissed_at TIMESTAMPTZ;
