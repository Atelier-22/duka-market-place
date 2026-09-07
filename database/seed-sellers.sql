-- Development and demo data for the seller platform. Never run this against
-- production: it inserts a fictional seller, store, products, a follower and
-- a review. Requires migrations 016 and 017.
--
-- Password for every account below: Demo1234!

WITH seller AS (
  INSERT INTO users (role, full_name, email, phone, password_hash)
  VALUES ('seller', 'Grace Namono', 'techhub@example.test', '0700111222',
          '$2a$10$w7d5xW8s6d5m4Y1S7Uu4Xe0qyE4V1gQ3ZKk3n7g9pP5hMZ0y8dTbW')
  RETURNING id
), profile AS (
  INSERT INTO seller_profiles (user_id, verification_status)
  SELECT id, 'verified' FROM seller RETURNING user_id
), store AS (
  INSERT INTO seller_stores (owner_id, name, slug, tagline, description, category, city, location, contact_phone, delivery_fee_ugx)
  SELECT id, 'TechHub Electronics', 'techhub-electronics',
         'Phones, laptops and accessories in Kikuubo',
         'Genuine phones and accessories with a store warranty. We have been on Kikuubo Lane since 2018 and deliver across Kampala the same day.',
         'electronics', 'Kampala', 'Kikuubo Lane, shop 12', '0700111222', 4000
    FROM seller RETURNING id, owner_id
), settings AS (
  INSERT INTO seller_settings (user_id) SELECT owner_id FROM store RETURNING user_id
), phone AS (
  INSERT INTO seller_products (store_id, owner_id, name, description, category, brand, model, condition, price_ugx, sale_price_ugx, stock_quantity, low_stock_threshold, specifications, status, is_featured, published_at)
  SELECT id, owner_id, 'iPhone 15 Pro 256GB', 'Brand new, sealed, with a twelve month store warranty. Face ID, USB-C, titanium frame.', 'phones', 'Apple', 'A3102', 'new', 4800000, 4650000, 6, 2,
         '[{"label":"Storage","value":"256GB"},{"label":"Colour","value":"Natural titanium"},{"label":"Warranty","value":"12 months"}]'::jsonb,
         'published', TRUE, now() - interval '9 days'
    FROM store RETURNING id
), galaxy AS (
  INSERT INTO seller_products (store_id, owner_id, name, description, category, brand, model, condition, price_ugx, stock_quantity, low_stock_threshold, specifications, status, published_at)
  SELECT id, owner_id, 'Samsung Galaxy S24', 'Dual SIM, 8GB RAM, 256GB storage. Comes with charger and case.', 'phones', 'Samsung', 'SM-S921', 'new', 3200000, 10, 3,
         '[{"label":"Storage","value":"256GB"},{"label":"RAM","value":"8GB"}]'::jsonb,
         'published', now() - interval '6 days'
    FROM store RETURNING id
), airpods AS (
  INSERT INTO seller_products (store_id, owner_id, name, description, category, brand, condition, price_ugx, stock_quantity, low_stock_threshold, status, is_featured, published_at)
  SELECT id, owner_id, 'AirPods Pro (2nd gen)', 'Active noise cancelling, USB-C case, sealed box.', 'electronics', 'Apple', 'new', 950000, 12, 3, 'published', TRUE, now() - interval '3 days'
    FROM store RETURNING id
), charger AS (
  INSERT INTO seller_products (store_id, owner_id, name, description, category, brand, condition, price_ugx, stock_quantity, low_stock_threshold, status, published_at)
  SELECT id, owner_id, 'USB-C fast charger 25W', 'Original fast charger with a one metre cable. Works with Samsung, Apple and most Android phones.', 'electronics', 'Samsung', 'new', 45000, 40, 5, 'published', now() - interval '2 days'
    FROM store RETURNING id
), draft AS (
  INSERT INTO seller_products (store_id, owner_id, name, description, category, brand, condition, price_ugx, stock_quantity, status)
  SELECT id, owner_id, 'MacBook Air M3', 'Draft: photos coming.', 'electronics', 'Apple', 'new', 5900000, 2, 'draft' FROM store RETURNING id
), variations AS (
  INSERT INTO seller_product_variations (product_id, name, value, price_delta_ugx, stock_quantity, position)
  SELECT id, 'Colour', 'Onyx black', 0, 6, 0 FROM galaxy
  UNION ALL SELECT id, 'Colour', 'Cobalt violet', 50000, 4, 1 FROM galaxy
  RETURNING id
)
UPDATE seller_stores s SET product_count = (SELECT count(*) FROM seller_products p WHERE p.store_id = s.id AND p.status = 'published')
 WHERE s.slug = 'techhub-electronics';
