BEGIN;

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id            UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  theme              VARCHAR(10)  NOT NULL DEFAULT 'system',
  accent             VARCHAR(20)  NOT NULL DEFAULT 'green',

  language           VARCHAR(10)  NOT NULL DEFAULT 'en',

  tone               VARCHAR(20)  NOT NULL DEFAULT 'friendly',
  traits             TEXT[]       NOT NULL DEFAULT '{}',

  notify_messages    BOOLEAN NOT NULL DEFAULT TRUE,
  notify_orders      BOOLEAN NOT NULL DEFAULT TRUE,
  notify_offers      BOOLEAN NOT NULL DEFAULT TRUE,
  notify_marketing   BOOLEAN NOT NULL DEFAULT FALSE,

  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
