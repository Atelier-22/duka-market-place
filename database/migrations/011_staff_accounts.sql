DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'staff_role') THEN
    CREATE TYPE staff_role AS ENUM ('admin', 'super_admin');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS staff (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role                 staff_role NOT NULL DEFAULT 'admin',
  full_name            VARCHAR(150) NOT NULL,
  email                VARCHAR(255) UNIQUE,

  phone                VARCHAR(30) NOT NULL UNIQUE,
  password_hash        TEXT NOT NULL,
  avatar_url           TEXT,
  is_active            BOOLEAN NOT NULL DEFAULT TRUE,
  must_change_password BOOLEAN NOT NULL DEFAULT FALSE,

  created_by           UUID REFERENCES staff(id) ON DELETE SET NULL,
  last_login_at        TIMESTAMPTZ,
  suspended_at         TIMESTAMPTZ,
  suspended_reason     TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_staff_role ON staff(role);

DO $$
DECLARE c RECORD;
BEGIN
  FOR c IN
    SELECT unnest(ARRAY[
      'admin_audit_log_admin_id_fkey',
      'audit_logs_actor_id_fkey',
      'disputes_resolved_by_fkey',
      'order_status_history_changed_by_fkey',
      'platform_settings_updated_by_fkey',
      'shopper_earnings_paid_out_by_fkey',
      'verification_records_reviewed_by_fkey',

      'user_preferences_user_id_fkey',
      'uploaded_files_uploaded_by_fkey'
    ]) AS name
  LOOP
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = c.name) THEN
      EXECUTE format('ALTER TABLE %I DROP CONSTRAINT %I',
        (SELECT conrelid::regclass::text FROM pg_constraint WHERE conname = c.name), c.name);
    END IF;
  END LOOP;
END $$;

INSERT INTO staff (id, role, full_name, email, phone, password_hash, avatar_url, is_active, created_at)
SELECT u.id, 'super_admin', u.full_name, u.email, u.phone, u.password_hash, u.avatar_url, u.is_active, u.created_at
  FROM users u
 WHERE u.role = 'admin'
   AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = u.id)
ON CONFLICT (phone) DO NOTHING;

DELETE FROM users WHERE role = 'admin' AND EXISTS (SELECT 1 FROM staff s WHERE s.id = users.id);
