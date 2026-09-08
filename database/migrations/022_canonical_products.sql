CREATE TABLE IF NOT EXISTS canonical_products (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand             VARCHAR(80) NOT NULL,
  brand_slug        VARCHAR(80) NOT NULL,
  model             VARCHAR(120) NOT NULL,
  model_slug        VARCHAR(120) NOT NULL,
  category          TEXT NOT NULL,
  kind_id           UUID REFERENCES product_kinds(id) ON DELETE SET NULL,
  display_name      VARCHAR(200) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'merged', 'disabled')),
  merged_into       UUID REFERENCES canonical_products(id) ON DELETE SET NULL,
  listing_count     INTEGER NOT NULL DEFAULT 0,
  researched_at     TIMESTAMPTZ,
  created_by        TEXT NOT NULL DEFAULT 'system' CHECK (created_by IN ('system', 'admin', 'seller')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (brand_slug, model_slug)
);
CREATE INDEX IF NOT EXISTS idx_canonical_products_category ON canonical_products(category, status);

CREATE TABLE IF NOT EXISTS canonical_specs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  attribute_key     VARCHAR(60) NOT NULL,
  label             VARCHAR(60) NOT NULL,
  value             VARCHAR(200) NOT NULL,
  value_norm        VARCHAR(200) NOT NULL,
  unit              VARCHAR(20),
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('verified', 'pending', 'conflict', 'rejected')),
  source_count      INTEGER NOT NULL DEFAULT 0,
  best_tier         SMALLINT,
  locked_by_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, attribute_key)
);

CREATE TABLE IF NOT EXISTS canonical_spec_sources (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  attribute_key     VARCHAR(60) NOT NULL,
  value             VARCHAR(200) NOT NULL,
  value_norm        VARCHAR(200) NOT NULL,
  source_type       TEXT NOT NULL CHECK (source_type IN ('manufacturer', 'retailer', 'unknown', 'seller', 'admin')),
  trust_tier        SMALLINT NOT NULL CHECK (trust_tier BETWEEN 1 AND 4),
  source_url        TEXT,
  source_title      VARCHAR(300),
  seller_id         UUID,
  admin_id          UUID,
  observed_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_canonical_spec_sources_identity
  ON canonical_spec_sources(product_id, attribute_key, value_norm, COALESCE(source_url, ''), COALESCE(seller_id, '00000000-0000-0000-0000-000000000000'::uuid));
CREATE INDEX IF NOT EXISTS idx_canonical_spec_sources_lookup ON canonical_spec_sources(product_id, attribute_key);

CREATE TABLE IF NOT EXISTS canonical_corrections (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  attribute_key     VARCHAR(60) NOT NULL,
  label             VARCHAR(60) NOT NULL,
  canonical_value   VARCHAR(200),
  proposed_value    VARCHAR(200) NOT NULL,
  proposed_norm     VARCHAR(200) NOT NULL,
  seller_id         UUID NOT NULL,
  listing_id        UUID REFERENCES seller_products(id) ON DELETE SET NULL,
  status            TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'superseded')),
  decided_by        UUID,
  decided_at        TIMESTAMPTZ,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, attribute_key, seller_id, proposed_norm)
);
CREATE INDEX IF NOT EXISTS idx_canonical_corrections_status ON canonical_corrections(status, created_at DESC);

CREATE TABLE IF NOT EXISTS research_jobs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES canonical_products(id) ON DELETE CASCADE,
  status            TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'done', 'failed', 'skipped')),
  provider          VARCHAR(30) NOT NULL DEFAULT 'tavily',
  query             VARCHAR(300),
  results_count     INTEGER NOT NULL DEFAULT 0,
  specs_found       INTEGER NOT NULL DEFAULT 0,
  error             TEXT,
  requested_by      UUID,
  started_at        TIMESTAMPTZ,
  finished_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_research_jobs_product ON research_jobs(product_id, created_at DESC);

ALTER TABLE seller_products ADD COLUMN IF NOT EXISTS canonical_product_id UUID REFERENCES canonical_products(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_seller_products_canonical ON seller_products(canonical_product_id);
