-- 003: per-user settings.
--
-- Everything the settings screen writes lives here rather than on `users`,
-- so preference churn never touches the auth-critical row.
--
-- Safe to run more than once.

BEGIN;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Appearance
  theme              VARCHAR(10)  NOT NULL DEFAULT 'system',   -- system | light | dark
  accent             VARCHAR(20)  NOT NULL DEFAULT 'green',    -- green | ocean | sunset | grape | charcoal

  -- General
  language           VARCHAR(10)  NOT NULL DEFAULT 'en',

  -- Personalization: how the product speaks to this person
  tone               VARCHAR(20)  NOT NULL DEFAULT 'friendly',
  traits             TEXT[]       NOT NULL DEFAULT '{}',

  -- Notifications
  notify_messages    BOOLEAN NOT NULL DEFAULT TRUE,
  notify_orders      BOOLEAN NOT NULL DEFAULT TRUE,
  notify_offers      BOOLEAN NOT NULL DEFAULT TRUE,
  notify_marketing   BOOLEAN NOT NULL DEFAULT FALSE,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
