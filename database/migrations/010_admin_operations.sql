CREATE TABLE IF NOT EXISTS admin_audit_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),

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

ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at     TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE shopper_earnings ADD COLUMN IF NOT EXISTS paid_out_at TIMESTAMPTZ;
ALTER TABLE shopper_earnings ADD COLUMN IF NOT EXISTS paid_out_by UUID REFERENCES users(id);
