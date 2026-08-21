-- 001: scope user uniqueness to the role.
--
-- Before: email and phone were unique across the whole users table, so one
-- person could not hold both a customer and a shopper account.
-- After:  the same email/phone may appear once per role, never twice within
-- one role.
--
-- Two constraints, not one composite. UNIQUE (email, phone, role) would treat
-- the three columns as a single tuple and still permit a duplicate phone
-- inside a role as long as the email differed.
--
-- Safe to run more than once.

BEGIN;

-- The old table-wide constraints were created implicitly by the UNIQUE column
-- modifiers, so they carry Postgres' default names.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_key;

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_email_role_key;
ALTER TABLE users ADD  CONSTRAINT users_email_role_key UNIQUE (email, role);

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_role_key;
ALTER TABLE users ADD  CONSTRAINT users_phone_role_key UNIQUE (phone, role);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

COMMIT;
