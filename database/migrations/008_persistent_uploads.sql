CREATE TABLE IF NOT EXISTS uploaded_files (

  key          TEXT PRIMARY KEY,
  folder       VARCHAR(64) NOT NULL,
  filename     TEXT,
  mime_type    VARCHAR(128) NOT NULL,
  byte_size    INTEGER NOT NULL,
  data         BYTEA NOT NULL,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_uploaded_files_folder ON uploaded_files(folder, created_at DESC);

