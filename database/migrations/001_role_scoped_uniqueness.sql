BEGIN;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_role_key;
ALTER TABLE users ADD  CONSTRAINT users_email_role_key UNIQUE (email, role);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_role_key;
ALTER TABLE users ADD  CONSTRAINT users_phone_role_key UNIQUE (phone, role);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMIT;
