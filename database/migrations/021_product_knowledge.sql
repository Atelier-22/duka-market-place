CREATE TABLE IF NOT EXISTS product_kinds (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category          TEXT NOT NULL,
  name              VARCHAR(80) NOT NULL,
  slug              VARCHAR(90) NOT NULL,
  version_type      VARCHAR(60),
  is_default        BOOLEAN NOT NULL DEFAULT FALSE,
  status            TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('active', 'candidate', 'rejected', 'deprecated')),
  source            TEXT NOT NULL DEFAULT 'bootstrap' CHECK (source IN ('bootstrap', 'admin', 'seller_structured', 'seller_description', 'system_inference')),
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 1,
  observation_count INTEGER NOT NULL DEFAULT 0,
  seller_count      INTEGER NOT NULL DEFAULT 0,
  merged_into       UUID REFERENCES product_kinds(id) ON DELETE SET NULL,
  position          INTEGER NOT NULL DEFAULT 0,
  last_observed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category, slug)
);
CREATE INDEX IF NOT EXISTS idx_product_kinds_category_status ON product_kinds(category, status);

CREATE TABLE IF NOT EXISTS product_attributes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key               VARCHAR(60) NOT NULL UNIQUE,
  name              VARCHAR(60) NOT NULL,
  type              TEXT NOT NULL DEFAULT 'select' CHECK (type IN ('text', 'number', 'currency', 'boolean', 'select', 'multi_select', 'measurement', 'colour', 'date', 'year', 'range')),
  unit              VARCHAR(20),
  status            TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('active', 'candidate', 'rejected', 'deprecated')),
  source            TEXT NOT NULL DEFAULT 'bootstrap' CHECK (source IN ('bootstrap', 'admin', 'seller_structured', 'seller_description', 'system_inference')),
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 1,
  observation_count INTEGER NOT NULL DEFAULT 0,
  seller_count      INTEGER NOT NULL DEFAULT 0,
  merged_into       UUID REFERENCES product_attributes(id) ON DELETE SET NULL,
  last_observed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_kind_attributes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind_id           UUID NOT NULL REFERENCES product_kinds(id) ON DELETE CASCADE,
  attribute_id      UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  role              TEXT NOT NULL DEFAULT 'optional' CHECK (role IN ('variant', 'required', 'optional')),
  position          INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('active', 'candidate', 'rejected', 'deprecated')),
  source            TEXT NOT NULL DEFAULT 'bootstrap' CHECK (source IN ('bootstrap', 'admin', 'seller_structured', 'seller_description', 'system_inference')),
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 1,
  observation_count INTEGER NOT NULL DEFAULT 0,
  seller_count      INTEGER NOT NULL DEFAULT 0,
  last_observed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (kind_id, attribute_id)
);

CREATE TABLE IF NOT EXISTS product_attribute_options (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attribute_id      UUID NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  kind_id           UUID REFERENCES product_kinds(id) ON DELETE CASCADE,
  category          TEXT,
  brand_slug        VARCHAR(80),
  value             VARCHAR(80) NOT NULL,
  value_norm        VARCHAR(80) NOT NULL,
  display_hex       VARCHAR(9) CHECK (display_hex IS NULL OR display_hex ~ '^#[0-9A-Fa-f]{6}$'),
  position          INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('active', 'candidate', 'rejected', 'deprecated')),
  source            TEXT NOT NULL DEFAULT 'bootstrap' CHECK (source IN ('bootstrap', 'admin', 'seller_structured', 'seller_description', 'system_inference')),
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 1,
  observation_count INTEGER NOT NULL DEFAULT 0,
  seller_count      INTEGER NOT NULL DEFAULT 0,
  merged_into       UUID REFERENCES product_attribute_options(id) ON DELETE SET NULL,
  last_observed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_product_attribute_options_scope
  ON product_attribute_options(attribute_id, COALESCE(kind_id, '00000000-0000-0000-0000-000000000000'::uuid), COALESCE(category, ''), COALESCE(brand_slug, ''), value_norm);
CREATE INDEX IF NOT EXISTS idx_product_attribute_options_kind ON product_attribute_options(kind_id, status);
CREATE INDEX IF NOT EXISTS idx_product_attribute_options_category ON product_attribute_options(category, status);
CREATE INDEX IF NOT EXISTS idx_product_attribute_options_brand ON product_attribute_options(brand_slug, status);
CREATE INDEX IF NOT EXISTS idx_product_attribute_options_status ON product_attribute_options(status, last_observed_at DESC);

CREATE TABLE IF NOT EXISTS product_brands (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(80) NOT NULL,
  slug              VARCHAR(80) NOT NULL UNIQUE,
  status            TEXT NOT NULL DEFAULT 'candidate' CHECK (status IN ('active', 'candidate', 'rejected', 'deprecated')),
  source            TEXT NOT NULL DEFAULT 'bootstrap' CHECK (source IN ('bootstrap', 'admin', 'seller_structured', 'seller_description', 'system_inference')),
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 1,
  observation_count INTEGER NOT NULL DEFAULT 0,
  seller_count      INTEGER NOT NULL DEFAULT 0,
  merged_into       UUID REFERENCES product_brands(id) ON DELETE SET NULL,
  last_observed_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_brand_categories (
  brand_id          UUID NOT NULL REFERENCES product_brands(id) ON DELETE CASCADE,
  category          TEXT NOT NULL,
  observation_count INTEGER NOT NULL DEFAULT 0,
  seller_count      INTEGER NOT NULL DEFAULT 0,
  last_observed_at  TIMESTAMPTZ,
  PRIMARY KEY (brand_id, category)
);

CREATE TABLE IF NOT EXISTS product_synonyms (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term              VARCHAR(80) NOT NULL,
  term_norm         VARCHAR(80) NOT NULL,
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('kind', 'attribute', 'option', 'brand')),
  entity_id         UUID NOT NULL,
  status            TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'candidate', 'rejected', 'deprecated')),
  source            TEXT NOT NULL DEFAULT 'bootstrap' CHECK (source IN ('bootstrap', 'admin', 'seller_structured', 'seller_description', 'system_inference')),
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 1,
  observation_count INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (term_norm, entity_type, entity_id)
);
CREATE INDEX IF NOT EXISTS idx_product_synonyms_term ON product_synonyms(term_norm) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS product_observations (
  id                BIGSERIAL PRIMARY KEY,
  product_id        UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  seller_id         UUID NOT NULL,
  category          TEXT NOT NULL,
  kind_id           UUID REFERENCES product_kinds(id) ON DELETE SET NULL,
  kind_name         VARCHAR(80),
  brand_slug        VARCHAR(80),
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('kind', 'attribute', 'option', 'brand')),
  attribute_key     VARCHAR(60),
  value             VARCHAR(120) NOT NULL,
  value_norm        VARCHAR(120) NOT NULL,
  display_hex       VARCHAR(9),
  source            TEXT NOT NULL CHECK (source IN ('seller_structured', 'seller_description', 'system_inference')),
  confidence        NUMERIC(4,3) NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_observations_product ON product_observations(product_id);
CREATE INDEX IF NOT EXISTS idx_product_observations_value ON product_observations(entity_type, attribute_key, value_norm);
CREATE INDEX IF NOT EXISTS idx_product_observations_kind ON product_observations(kind_id, attribute_key);
CREATE INDEX IF NOT EXISTS idx_product_observations_created ON product_observations(created_at DESC);

CREATE TABLE IF NOT EXISTS product_knowledge_audit (
  id                BIGSERIAL PRIMARY KEY,
  entity_type       TEXT NOT NULL CHECK (entity_type IN ('kind', 'attribute', 'option', 'brand', 'kind_attribute', 'synonym')),
  entity_id         UUID NOT NULL,
  action            TEXT NOT NULL,
  actor_type        TEXT NOT NULL CHECK (actor_type IN ('system', 'admin')),
  actor_id          UUID,
  previous          JSONB,
  next              JSONB,
  reason            TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_knowledge_audit_entity ON product_knowledge_audit(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_product_knowledge_audit_created ON product_knowledge_audit(created_at DESC);

CREATE TABLE IF NOT EXISTS seller_product_attributes (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id        UUID NOT NULL REFERENCES seller_products(id) ON DELETE CASCADE,
  attribute_id      UUID REFERENCES product_attributes(id) ON DELETE SET NULL,
  attribute_key     VARCHAR(60) NOT NULL,
  label             VARCHAR(60) NOT NULL,
  value             VARCHAR(200) NOT NULL,
  value_norm        VARCHAR(200) NOT NULL,
  unit              VARCHAR(20),
  numeric_value     NUMERIC,
  source            TEXT NOT NULL DEFAULT 'seller_structured' CHECK (source IN ('seller_structured', 'seller_description', 'system_inference')),
  confidence        NUMERIC(4,3) NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, attribute_key, value_norm)
);
CREATE INDEX IF NOT EXISTS idx_seller_product_attributes_lookup ON seller_product_attributes(attribute_key, value_norm);
CREATE INDEX IF NOT EXISTS idx_seller_product_attributes_product ON seller_product_attributes(product_id);

INSERT INTO seller_product_attributes (product_id, attribute_key, label, value, value_norm, source, confidence)
SELECT p.id,
       left(regexp_replace(lower(trim(s->>'label')), '[^a-z0-9]+', '-', 'g'), 60),
       left(trim(s->>'label'), 60),
       left(trim(s->>'value'), 200),
       left(regexp_replace(lower(trim(s->>'value')), '\s+', ' ', 'g'), 200),
       'seller_structured', 1
  FROM seller_products p, jsonb_array_elements(p.specifications) s
 WHERE jsonb_typeof(p.specifications) = 'array'
   AND coalesce(trim(s->>'label'), '') <> '' AND coalesce(trim(s->>'value'), '') <> ''
ON CONFLICT DO NOTHING;
