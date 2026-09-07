INSERT INTO locations (name, type, city, lat, lng, description)
SELECT v.name, v.type, v.city, v.lat, v.lng, v.description
FROM (VALUES

  ('Nakawa Market',            'market',      'Kampala',    0.329700, 32.619700, 'Produce, household goods and second-hand clothing east of the centre.'),
  ('Wandegeya Market',         'market',      'Kampala',    0.335000, 32.573000, 'Produce and everyday goods next to Makerere.'),
  ('Kasubi Market',            'market',      'Kampala',    0.336900, 32.552500, 'Fresh produce, fish and household goods.'),
  ('Nateete Market',           'market',      'Kampala',    0.300000, 32.535000, 'Busy produce and general goods market on the western approach.'),
  ('Kireka Market',            'market',      'Kampala',    0.345000, 32.650000, 'Produce and general goods along the Jinja road corridor.'),
  ('Garden City Mall',         'mall',        'Kampala',    0.314000, 32.590000, 'Supermarket, electronics and retail under one roof.'),
  ('Acacia Mall',              'mall',        'Kampala',    0.335000, 32.590000, 'Kololo mall — groceries, pharmacy, electronics.'),
  ('Ntinda Shopping Complex',  'mall',        'Kampala',    0.355000, 32.610000, 'Supermarkets and retail serving Ntinda and Naguru.'),
  ('Kabalagala Trading Centre','shop',        'Kampala',    0.295000, 32.600000, 'Late-opening shops, pharmacies and food vendors.'),

  ('Nansana Market',           'market',      'Nansana',    0.365000, 32.525000, 'Main produce and general goods market for Nansana.'),
  ('Kyengera Market',          'market',      'Kyengera',   0.290000, 32.510000, 'Roadside produce and household goods on the Masaka road.'),
  ('Kajjansi Trading Centre',  'shop',        'Kajjansi',   0.180000, 32.530000, 'Shops and produce between Kampala and Entebbe.'),

  ('Entebbe Main Market',      'market',      'Entebbe',    0.064000, 32.479000, 'Fresh produce, fish from the lake, and household goods.'),
  ('Victoria Mall',            'mall',        'Entebbe',    0.057000, 32.464000, 'Supermarket, pharmacy and retail in central Entebbe.'),

  ('Mukono Central Market',    'market',      'Mukono',     0.353600, 32.755400, 'Produce and general goods for Mukono town.'),
  ('Njeru Market',             'market',      'Njeru',      0.428000, 33.159000, 'Produce and household goods west of the Nile.'),

  ('Jinja Central Market',     'market',      'Jinja',      0.447800, 33.202600, 'The main market — produce, fish, clothing and hardware.'),
  ('Jinja Main Street Shops',  'shop',        'Jinja',      0.439000, 33.204000, 'Electronics, hardware and general retail.'),

  ('Mbale Central Market',     'market',      'Mbale',      1.082000, 34.175000, 'Produce, clothing and hardware at the foot of Elgon.'),
  ('Tororo Main Market',       'market',      'Tororo',     0.693000, 34.181000, 'Produce and general goods near the border.'),
  ('Soroti Central Market',    'market',      'Soroti',     1.715000, 33.611000, 'Produce, grain and household goods.'),
  ('Iganga Main Market',       'market',      'Iganga',     0.609000, 33.469000, 'Produce and general goods on the Jinja–Mbale road.'),

  ('Gulu Main Market',         'market',      'Gulu',       2.774600, 32.299000, 'The main market for northern Uganda — produce, clothing, hardware.'),
  ('Lira Main Market',         'market',      'Lira',       2.235000, 32.910000, 'Produce, grain and general goods.'),
  ('Arua Main Market',         'market',      'Arua',       3.020000, 30.911000, 'Produce and cross-border trade goods.'),
  ('Kitgum Main Market',       'market',      'Kitgum',     3.278000, 32.878000, 'Produce and household goods.'),

  ('Mbarara Central Market',   'market',      'Mbarara',   -0.607200, 30.654500, 'The main market for the south-west — produce, dairy, clothing.'),
  ('Fort Portal Central Market','market',     'Fort Portal',0.671000, 30.275000, 'Produce and household goods below the Rwenzoris.'),
  ('Kasese Central Market',    'market',      'Kasese',     0.183000, 30.088000, 'Produce, fish and general goods.'),
  ('Hoima Central Market',     'market',      'Hoima',      1.435000, 31.352000, 'Produce and general goods for the oil region.'),
  ('Kabale Central Market',    'market',      'Kabale',    -1.249000, 29.989000, 'Produce and household goods in the far south-west.'),
  ('Bushenyi Market',          'market',      'Bushenyi',  -0.585000, 30.213000, 'Produce, dairy and general goods.'),

  ('Masaka Central Market',    'market',      'Masaka',    -0.341000, 31.734000, 'Produce, clothing and hardware for greater Masaka.'),
  ('Mityana Main Market',      'market',      'Mityana',    0.401000, 32.043000, 'Produce and general goods on the Fort Portal road.'),
  ('Luweero Market',           'market',      'Luweero',    0.849000, 32.473000, 'Produce and household goods on the Gulu highway.'),
  ('Mubende Main Market',      'market',      'Mubende',    0.559000, 31.395000, 'Produce and general goods at the western junction.')
) AS v(name, type, city, lat, lng, description)
WHERE NOT EXISTS (
  SELECT 1 FROM locations l WHERE l.name = v.name AND l.city = v.city
);

CREATE INDEX IF NOT EXISTS idx_locations_city_name ON locations(city, name);
