-- ---------------------------------------------------------------------------
-- 008: uploads that survive a deploy
--
-- Photos and voice notes were written to a folder on the server's disk. Render
-- gives each deploy a fresh container with a fresh empty disk, so every deploy
-- silently deleted every image anyone had ever sent. The message rows survived
-- and kept pointing at files that no longer existed — which is exactly the
-- "pictures disappear from the chat" complaint.
--
-- The bytes now live in Postgres, which is the one thing in this stack that is
-- actually persistent. A receipt or an item photo is evidence in a dispute; it
-- has to outlive a deploy.
--
-- Storage is still behind services/storage.service.ts, so moving to S3 or R2
-- later means writing one driver and changing STORAGE_DRIVER — no route,
-- controller or stored URL has to change.
--
-- Re-runnable.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS uploaded_files (
  -- The storage key, exactly as it appears in the URL: "chat/<uuid>.jpg".
  -- Primary key rather than a synthetic id: every lookup is by key.
  key          TEXT PRIMARY KEY,
  folder       VARCHAR(64) NOT NULL,
  filename     TEXT,
  mime_type    VARCHAR(128) NOT NULL,
  byte_size    INTEGER NOT NULL,
  data         BYTEA NOT NULL,
  uploaded_by  UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- For the admin "how much are we storing" question, and for cleaning up a
-- folder wholesale if one is ever retired.
CREATE INDEX IF NOT EXISTS idx_uploaded_files_folder ON uploaded_files(folder, created_at DESC);

-- Deliberately NOT cascading from users: an account being deleted must not
-- destroy the receipt evidence attached to somebody else's disputed order.
-- The row keeps the bytes and forgets who sent them.
