# Product knowledge

Every product a seller publishes teaches Duka something about products. This document describes how that works, where the knowledge lives, and how to operate it.

## Shape

```
category (static list of 53 keys, backend/src/seller/categories.ts)
  └── product kind            product_kinds            e.g. Trousers, Smartphones, Jumpsuit
        ├── kind rules         product_kind_attributes  which attributes apply, as variant / required / optional
        │     └── attribute    product_attributes       Waist, Storage, Material, Mileage… with a type and unit
        │           └── option product_attribute_options values scoped to a kind, a category, a brand, or global
        ├── brands             product_brands + product_brand_categories
        └── synonyms           product_synonyms         pants → Trousers, iphone → Apple
```

Colours are the `colour` attribute with `display_hex` on each option. Sizes, waists, storage and the like are the kind's **variant** attribute; the seller form calls it "versions". Each `seller_product_variations` row is one version in one colour with its own stock, so inventory, orders and the buyer picker already work per combination.

Per-product structured data lives in `seller_product_attributes` (one row per attribute value on a product, normalised, with unit, numeric value, source and confidence). Marketplace filters, search interpretation, product pages and comparison read from it.

## Status, source and confidence

Every knowledge row carries `status` (`active`, `candidate`, `rejected`, `deprecated`), `source` (`bootstrap`, `admin`, `seller_structured`, `seller_description`, `system_inference`), `confidence`, `observation_count`, `seller_count` and `last_observed_at`.

- Built-in and admin-approved rows keep confidence 1 and are never re-scored.
- Learned rows are re-scored on every observation: `confidence = avg(source confidence) × (1 − e^(−sellers / 1.2))`, capped at 0.99. Two sellers of structured input give 0.81, three give 0.92.
- Source confidence: structured fields 1.0; values read out of the description 0.8; brand inferred from the name 0.75; colour words found in the name 0.7. Description-only evidence saturates below the promotion bar, so it can never promote on its own.

## Learning

`backend/src/seller/events.ts` is a small in-process event bus. `product.published` and `product.updated` fire after the response is sent; `backend/src/knowledge/index.ts` subscribes and calls `observeProduct` for published products only. Drafts teach nothing.

`observeProduct` (`learn.ts`) rebuilds the product's observations and structured attributes inside one transaction:

1. The subcategory resolves to a kind (by slug, plural, or synonym). Unknown kinds are created as candidates.
2. The brand resolves to a brand (or synonym); unknown brands become candidates. If the seller left it blank, the name is scanned for known brands (inferred, 0.75).
3. Each version value becomes an option of the kind's variant attribute (candidate if new), each colour an option of `colour` (scoped to the brand for phone-like categories, otherwise to the kind).
4. Each detail (specification) resolves to an attribute by name or synonym; unknown labels become candidate attributes with an inferred type. Select-type values become candidate options of the kind. Numbers with units are parsed into `numeric_value` and `unit`.
5. Deterministic text rules add low-confidence observations: storage and RAM for phones and computers, "size NN" for shoes, colour words in the name when no colours were given.
6. Counts on every touched row are recomputed from the observations table, so republishing never double counts.

A seller only ever writes observations and their own product's attributes. Global rows change only through the promotion rules or an admin.

## Promotion

`promote.ts` holds the rules:

| Entity | Auto-promotes when | Otherwise |
| --- | --- | --- |
| Option on a low-risk attribute (size, colour, material, storage…) | 2 sellers, 3 products, confidence ≥ 0.8 | admin |
| Option on any other attribute | 4 sellers, 6 products, confidence ≥ 0.8 | admin |
| Product kind | 3 sellers, 5 products, confidence ≥ 0.85 | admin |
| Attribute | 5 sellers, 10 products, confidence ≥ 0.9 | admin |
| Attribute on a kind | 3 sellers, 5 products, confidence ≥ 0.85 | admin |
| Brand | 2 sellers, 3 products, confidence ≥ 0.8 | admin |

Only `candidate` rows promote. Rejected rows stay rejected no matter how often they are seen again. Every promotion is written to `product_knowledge_audit` by actor `system` with the reason.

## Serving

`GET /api/knowledge/form?category=&kind=&brand=` returns what the seller form needs: active kinds for the category, the resolved kind (or the category default), the variant label and its active values, the kind's attributes with roles and known values, brands seen in the category, the colour range (brand first, then kind and category), and the generic palette. The frontend hook `useProductKnowledge` caches per combination and falls back to an empty set if the API is unreachable.

`GET /api/knowledge/filters?category=&kind=` builds facets from `seller_product_attributes` on published products. `GET /api/marketplace/products?attr_<key>=value&kind=&brand=` filters on them. `GET /api/marketplace/search?q=` runs `interpretQuery` (kinds, brands, colours, storage and RAM patterns, the kind's variant values) and searches with the structure first, falling back to plain text when nothing matches. `GET /api/marketplace/compare?ids=` aligns attributes across products.

Product pages show `attributes` (only rows with confidence ≥ 0.9, so inferred values never reach buyers) and fall back to the raw specifications for products without them.

## Admin

`/admin/knowledge` (Product intelligence) shows an overview, pending suggestions (new kinds with their example products and candidate attributes, new attributes, attributes on kinds, new values, new brands), and browsable lists of kinds, attributes, options, colours, brands, observations and the audit trail. Every row has **Why**, which explains the evidence: observation and seller counts, sources, common values, example products and history. Actions: approve, reject, disable, enable, rename (old name kept as a synonym), merge (everything moves to the target and the old name becomes a synonym).

## Bootstrap and migration

`backend/src/knowledge/catalogue.ts` and `bootstrap.ts` hold the starting knowledge. `seedKnowledge` loads it with bulk inserts and `ON CONFLICT DO NOTHING`, so admin edits are never overwritten, and it runs at boot when the tables are empty. Migration `021_product_knowledge.sql` creates the tables and copies existing specifications into `seller_product_attributes`. `npm run knowledge:backfill` re-seeds and re-observes every published product. `scripts/purge-test-data.cjs --apply` also removes candidate knowledge that only test products produced.

## Canonical products, research and corrections

Migration `022_canonical_products.sql` adds a product identity layer on top of the knowledge tables:

- `canonical_products` is one row per brand and model (unique on their slugs). `seller_products.canonical_product_id` links a listing to it. Price, stock, condition and images stay on the listing and are never part of canonical data.
- `canonical_specs` holds one value per fixed specification (screen size, processor, RAM, battery, engine size, capacity, material…) with `confidence`, `status` (`verified`, `pending`, `conflict`, `rejected`), the number of agreeing sources and the best trust tier. `canonical_spec_sources` keeps every piece of evidence: manufacturer (tier 1, weight 0.7), retailer (tier 2, 0.45), unknown site (tier 3, 0.2), seller (tier 4, 0.3 per distinct seller), admin (locks the value at 1.0). Confidence is `1 − Π(1 − weight)` over distinct agreeing sources. A value reaches `verified` at 0.6. A second value at 0.3 or more marks the spec `conflict`.
- `canonical_corrections` records a seller whose structured detail differs from the canonical value. It stays pending until an admin decides, unless three independent sellers report the same value, which promotes it automatically and marks the corrections approved with no decider. Matching seller values become agreeing sources. Admin decisions lock the field.
- `research_jobs` is the async queue. `backend/src/knowledge/research.ts` calls the Tavily search API when `TAVILY_API_KEY` is set (two calls at most per product: a general query and one restricted to the manufacturer's domains when known), classifies each result by domain into a trust tier, and runs the deterministic extractor `extractSpecs` over the returned snippets. Only pattern matches become sources; nothing is inferred beyond the text. Duka never fetches pages itself, so no robots.txt or terms are crossed. A product is researched at most once per 90 days. Without a key the job is recorded as `skipped` with the reason, publishing continues, and the admin page says research is off.

Publishing never waits for any of this. The seller form asks `GET /api/knowledge/product?brand&model` after a short pause, and `POST /api/knowledge/research` when the product is new. Known specs are offered as chips the seller taps to copy into editable detail rows. A listing-quality indicator counts filled category details plus photos, description and price.

Admins manage this under Product intelligence → Products and Corrections: provenance per spec with source links, conflicts with the competing values, approve or reject corrections, add or edit specs (which locks them), and re-run research. The overview shows the most corrected fields and categories as a data-quality signal.

## Limitations

- Categories themselves are still a static list; new top-level categories are a code change. Kinds under them are fully data-driven.
- Text extraction is rule-based (storage, RAM, shoe size, colour words, brand names). There is no language model in the loop.
- Search interpretation picks the first kind with a given name when the same kind exists in several categories, and filters by subcategory name rather than category.
- Merging options rewrites observations and product attributes for that value, but does not rewrite the seller's variation rows.
- Research depends on Tavily's snippets; when a spec is only on a page Tavily does not summarise, it is not learned. The extractor covers phones, computers, TVs, cameras, gaming, appliances, solar, tools, kitchen, cars and motorcycles.
- Canonical products key on brand and model text. Two sellers writing the same model differently create two products until an admin merges them (merge is not yet exposed for canonical products).
