CREATE TABLE IF NOT EXISTS identity_registry (

  id_hash          TEXT PRIMARY KEY,

  id_masked        VARCHAR(40) NOT NULL,
  document_type    VARCHAR(50) NOT NULL DEFAULT 'national_id',

  outcome          VARCHAR(20) NOT NULL DEFAULT 'pending',
  outcome_reason   TEXT,

  fraud_flag       BOOLEAN NOT NULL DEFAULT FALSE,

  first_user_id    UUID,
  last_user_id     UUID,
  seen_count       INTEGER NOT NULL DEFAULT 1,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_registry_fraud ON identity_registry(fraud_flag) WHERE fraud_flag;
CREATE INDEX IF NOT EXISTS idx_identity_registry_last_user ON identity_registry(last_user_id);

ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS storage_key         TEXT;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS id_hash             TEXT;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS id_masked           VARCHAR(40);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS extracted_name      TEXT;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS extracted_dob       DATE;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS extracted_expiry    DATE;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS extracted_doc_type  VARCHAR(50);

ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS ocr_status          VARCHAR(20);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS ocr_engine          VARCHAR(32);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS ocr_notes           TEXT;

ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS auto_decision       VARCHAR(20);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS auto_reason         TEXT;

ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS document_deleted_at TIMESTAMPTZ;

ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_verification_status_created
  ON verification_records(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_id_hash
  ON verification_records(id_hash);

UPDATE verification_records
   SET storage_key = document_url
 WHERE storage_key IS NULL AND document_url IS NOT NULL;
