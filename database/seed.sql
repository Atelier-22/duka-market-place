-- Seed data for local/dev environments.
-- Any test account created from this file uses the password "Password123!" — dev only, never use in production.

INSERT INTO locations (id, name, type, city, lat, lng, description) VALUES
  (gen_random_uuid(), 'Owino Market', 'market', 'Kampala', 0.3132, 32.5764, 'Largest open-air market in Kampala — clothes, shoes, fabric, produce.'),
  (gen_random_uuid(), 'Kalerwe Market', 'market', 'Kampala', 0.3592, 32.5689, 'Fresh produce and household goods market.'),
  (gen_random_uuid(), 'Nakasero Market', 'market', 'Kampala', 0.3163, 32.5822, 'Fresh fruit, vegetables and spices in the city centre.'),
  (gen_random_uuid(), 'Nakumatt/Capital Shoppers', 'supermarket', 'Kampala', 0.3095, 32.5825, 'General supermarket goods.'),
  (gen_random_uuid(), 'Kikuubo Lane', 'shop', 'Kampala', 0.3141, 32.5750, 'Wholesale electronics and general goods.');

INSERT INTO platform_settings (key, value) VALUES
  ('platform_fee_percentage', '10'),
  ('default_delivery_fee_ugx', '5000'),
  ('support_phone', '"+256700000000"'),
  ('support_email', '"support@duka.app"');

INSERT INTO fees (name, fee_type, value) VALUES
  ('Standard platform fee', 'platform_percentage', 10.00),
  ('Standard delivery fee', 'flat_delivery', 5000.00);
