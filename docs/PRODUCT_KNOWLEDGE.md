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

## Search-as-you-type and lifecycle

Migration `023_canonical_lifecycle.sql` adds `family`, `released_on`, `lifecycle`, `lifecycle_override` and `aliases` to canonical products. `backend/src/knowledge/canonicalCatalogue.ts` seeds real product lines with release dates (iPhone 11 to 17, iPad, MacBook Air and Pro M1 to M4, Galaxy S20 to S25, A and Z series, Galaxy Tab and Book, Samsung Crystal UHD and QLED TVs, Pixel 6 to 10, Tecno, Infinix, Redmi, PlayStation, Xbox, Switch, and Toyota, Honda, Nissan and Subaru generations). The seed is idempotent and never overwrites admin edits.

`GET /api/knowledge/search?q=` serves the Product name typeahead from an in-memory index (rebuilt at most once a minute and on every change). Every token must prefix-match a word of brand, family, model, kind or alias. Results rank exact words first, then current before discontinued, then newest release first, and come back grouped by category, so "Samsung" spans phones, laptops and TVs while "iPhone" lists every generation. Unknown text returns nothing and the form behaves exactly as before; the existing background research is still triggered by brand and model, never by keystrokes.

Lifecycle is computed per brand, family and category: distinct release years are ranked newest first, the newest N count as current and the rest as discontinued. N is `CANONICAL_CURRENT_GENERATIONS` (default 2) with per-category rules in `CURRENT_GENERATIONS_BY_CATEGORY`: cars, motorcycles and bicycles keep one current generation because a vehicle generation lasts years; phones, computers, TVs, gaming, cameras and appliances keep two. Products without a release date are `unknown`, and an admin override always wins. When a listing's brand and model resolve to a discontinued product, the form sets Condition to Used with the note "This model is no longer manufactured, so it is listed as Used", disables the field, and the server coerces `new` to `used` on create and edit so the rule holds for API callers too. Refurbished stays allowed. Price is untouched.

## What Duka already knows about a product

`backend/src/knowledge/canonicalSpecs.ts` carries the fixed facts for the catalogue lines: screen, display type, chip, RAM, battery, camera, operating system for phones and tablets; screen, chip, RAM for MacBooks; processor, memory, storage type and resolution for consoles; resolution, panel and smart platform for TVs; engine, fuel, transmission, drive, seats and body type for vehicles. Each fact is stored as a `catalogue` source (trust tier 1, weight 0.85, so it is verified on its own but still flagged as a conflict if enough sellers or a manufacturer page disagree). Official colours (with display hex), storage options and TV sizes live in `canonical_variants` (migration 024).

When a seller picks a product from the name search, the form fills the official storage options as versions and the official colours as colour chips, so the seller only enters stock and prices. A "Use the official …" link re-applies them if the seller has already edited the lists, and both stay editable. Specs still arrive as chips the seller taps into detail rows. Price is never part of any of it.

## Every sellable product, not only electronics

The Product name search answers with three kinds of match, grouped by category: catalogue products (brand and model with release date), product types (the 430 kinds across all 53 categories, matched by name or synonym, singular or plural: trousers, underwear, sofas, fridges, cakes, land), and brands in each category they are known for (LG in appliances and TVs, Samsung in phones, laptops, TVs and appliances). Picking a type sets the category and kind and brings that kind's sizes, details and colours from the knowledge base; picking a brand sets brand and category; picking a product does everything at once.

The catalogue covers used and new markets: iPhones back to the 6s, MacBooks back to 2016, Galaxy S, A, M, Note, Z, FE, Tab and Buds lines, Tecno, Infinix, Itel, Redmi, Poco, Huawei, Nokia, Oppo, Vivo, Realme, Motorola and OnePlus, Dell, HP, Lenovo, Asus, Acer and Surface laptops by generation, LG, Samsung, Hisense, TCL and Sony TVs by year, JBL, Sony, Bose and Anker audio, Canon, Nikon, Sony, GoPro and DJI cameras, Apple Watch, Galaxy Watch, Casio, Seiko and Garmin, PlayStation, Xbox and Switch, Nike, Adidas, Converse, Vans, New Balance, Puma, Crocs, Birkenstock, Dr. Martens, Timberland, Clarks and Bata shoes with sizes, and Toyota, Nissan, Honda, Mazda, Subaru, Mitsubishi, Suzuki, Isuzu, Mercedes, BMW, Audi, Volkswagen, Land Rover, Hyundai, Kia, Ford, Lexus, Peugeot and Volvo generations, plus Bajaj, TVS, Honda, Yamaha and Haojue boda models. Shoes, clothing, furniture, home, kitchen, bags, sports and boda models are perennial: they never count as discontinued.

Fixing mistakes is guided: when publishing fails, the form lists every missing thing at the top, and tapping an item scrolls to and focuses that field. In production the public marketplace and store list never show accounts ending in `@example.test`, so automated test listings cannot appear to buyers even while a test is running.

## The form adapts to what is being sold

`GET /api/knowledge/form` returns `traits` per product kind: `colours` (any colour range is known for the kind, category or brand), `brand` (brands are known in the category) and `model` (the category has catalogue products or a model-like detail). The form hides the Colours card and the Model field when a trait is false, with an "add anyway" link, so cooking oil asks for litres, towels for size and material, knives for type, and a phone for everything. `backend/src/knowledge/collections.ts` adds everyday kinds (towels, knives, utensils, pens, printer ink, handkerchiefs, soap, detergents, cooking oil, sugar, flour, milk, pots and pans, baskets, shelves, socks, caps, phone accessories, eggs) with their sizes, details and synonyms, and the knowledge seed now runs incrementally at boot whenever the bootstrap has more kinds than the database.

Options can carry a `group_label` (migration 025). Jerseys use it: League is the group, Club the value, with Premier League, La Liga, Serie A, Bundesliga, Ligue 1, the Uganda Premier League, Saudi Pro League, MLS, other European and African clubs and national teams, plus Kit and Season. The form shows league chips then the clubs of the chosen league, and the name search offers club names directly ("Manchester United" resolves to a Premier League jersey). A `GROUPED_BY` map names the grouping attribute per value attribute.

The name field prompts with rotating examples from `GET /api/knowledge/examples`, has a search button to reopen matches, and a "Start over" link that clears the picked product, kind, brand, model, options and colours without leaving the page. On phones the versions × colours stock grid stacks one version per block instead of widening the page.

## Limitations

- Categories themselves are still a static list; new top-level categories are a code change. Kinds under them are fully data-driven.
- Text extraction is rule-based (storage, RAM, shoe size, colour words, brand names). There is no language model in the loop.
- Search interpretation picks the first kind with a given name when the same kind exists in several categories, and filters by subcategory name rather than category.
- Merging options rewrites observations and product attributes for that value, but does not rewrite the seller's variation rows.
- The built-in catalogue covers major phone, tablet, laptop, console, TV and vehicle lines with facts known at the time of writing; other products start empty and learn from sellers, admins and research.
- Research depends on Tavily's snippets; when a spec is only on a page Tavily does not summarise, it is not learned. The extractor covers phones, computers, TVs, cameras, gaming, appliances, solar, tools, kitchen, cars and motorcycles.
- Canonical products key on brand and model text. Two sellers writing the same model differently create two products until an admin merges them (merge is not yet exposed for canonical products).
