-- ---------------------------------------------------------------------------
-- 013: ID verification
--
-- Two things live here, and they have deliberately different lifetimes.
--
-- ── verification_records: the working file, and it is temporary ──
-- Extra columns hold what OCR read off the document and what the automated
-- checks decided. The document image itself is deleted the moment a final
-- decision is made — approved or rejected — and document_deleted_at records
-- when. Nothing here is meant to outlive the decision.
--
-- ── identity_registry: the part that must outlive everything ──
-- Catching a banned user who re-registers with the same national ID means
-- remembering that ID after their account is gone. verification_records
-- cannot do that: it is ON DELETE CASCADE from users, so deleting the account
-- erases exactly the evidence the check depends on. So the registry holds no
-- foreign key to users at all. The user ids in it are plain UUIDs, kept as a
-- trail, and they are allowed to point at rows that no longer exist.
--
-- It stores a keyed hash of the ID number, never the number. That is enough
-- to answer "have we seen this document before", which is the only question
-- asked of it, and it means a copy of this table is not a list of Ugandan
-- national ID numbers. The masked form exists so a reviewer can talk about a
-- record without it being re-identifying on its own.
--
-- Re-runnable.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS identity_registry (
  -- HMAC-SHA256 of the normalised ID number, keyed by ID_HASH_SECRET. Not a
  -- bare digest: an unkeyed hash of a national ID number is reversible by
  -- anyone willing to enumerate the format.
  id_hash          TEXT PRIMARY KEY,
  -- "CM••••••••1234" — enough for a reviewer to refer to it, not enough to be
  -- the number.
  id_masked        VARCHAR(40) NOT NULL,
  document_type    VARCHAR(50) NOT NULL DEFAULT 'national_id',

  -- The outcome that matters for future submissions.
  outcome          VARCHAR(20) NOT NULL DEFAULT 'pending',
  outcome_reason   TEXT,
  -- Set when an account holding this ID was suspended, or when the ID was
  -- rejected for fraud rather than for a fixable problem like a blurry photo.
  fraud_flag       BOOLEAN NOT NULL DEFAULT FALSE,

  -- Deliberately NOT foreign keys. These must survive the accounts they name.
  first_user_id    UUID,
  last_user_id     UUID,
  seen_count       INTEGER NOT NULL DEFAULT 1,

  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_registry_fraud ON identity_registry(fraud_flag) WHERE fraud_flag;
CREATE INDEX IF NOT EXISTS idx_identity_registry_last_user ON identity_registry(last_user_id);

-- What OCR read, and what the automated pass decided about it. -------------
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS storage_key         TEXT;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS id_hash             TEXT;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS id_masked           VARCHAR(40);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS extracted_name      TEXT;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS extracted_dob       DATE;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS extracted_expiry    DATE;
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS extracted_doc_type  VARCHAR(50);

-- 'pending' | 'ok' | 'unreadable' | 'refused' | 'skipped' | 'error'
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS ocr_status          VARCHAR(20);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS ocr_engine          VARCHAR(32);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS ocr_notes           TEXT;

-- 'auto_rejected' | 'queued'. The automated pass never approves — see
-- services/verification.service.ts for why format checks cannot prove
-- identity.
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS auto_decision       VARCHAR(20);
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS auto_reason         TEXT;

-- When the image was destroyed. Non-null means the bytes are gone and only
-- the extracted fields and the decision remain.
ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS document_deleted_at TIMESTAMPTZ;

ALTER TABLE verification_records ADD COLUMN IF NOT EXISTS submitted_at        TIMESTAMPTZ NOT NULL DEFAULT now();

-- The review queue is read by status, newest first.
CREATE INDEX IF NOT EXISTS idx_verification_status_created
  ON verification_records(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verification_id_hash
  ON verification_records(id_hash);

-- Existing rows predate the storage_key column; document_url has always held
-- the storage key rather than a URL for this table, so carry it across.
UPDATE verification_records
   SET storage_key = document_url
 WHERE storage_key IS NULL AND document_url IS NOT NULL;
