-- ---------------------------------------------------------------------------
-- 010: admin operations — an audit trail, and the columns the new powers need
--
-- The admin panel is about to gain the ability to suspend people, reset their
-- passwords, promote other admins, pay shoppers out and message everyone at
-- once. Powers like that must be attributable: every one of them writes a row
-- here, naming the admin, before anything else is reported as done.
--
-- Deliberately append-only in practice — nothing in the API updates or deletes
-- from this table. A log an admin can edit is not a log.
--
-- Re-runnable.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Kept even if the admin's account is later removed: who did it is the whole
  -- point, so the row must not disappear with them.
  admin_id     UUID REFERENCES users(id) ON DELETE SET NULL,
  admin_name   TEXT NOT NULL,
  action       VARCHAR(60) NOT NULL,
  target_type  VARCHAR(40),
  target_id    UUID,
  summary      TEXT NOT NULL,
  metadata     JSONB,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_recent ON admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_target ON admin_audit_log(target_type, target_id);

-- Why an account was suspended, so the next admin to look does not have to
-- guess, and so the person can be told something specific.
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- Forces a password change on next login, after an admin resets one.
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

-- Paying a shopper out needs a record of when and by whom.
ALTER TABLE shopper_earnings ADD COLUMN IF NOT EXISTS paid_out_at TIMESTAMPTZ;
ALTER TABLE shopper_earnings ADD COLUMN IF NOT EXISTS paid_out_by UUID REFERENCES users(id);
