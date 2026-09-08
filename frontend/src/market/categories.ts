export interface CategoryEntry { key: string; label: string }

export interface CategoryGroup { label: string; entries: CategoryEntry[] }

const c = (key: string, label: string): CategoryEntry => ({ key, label });

export const CATEGORY_GROUPS: CategoryGroup[] = [
  { label: 'Electronics & tech', entries: [c('electronics', 'Electronics'), c('phones', 'Phones & tablets'), c('computers', 'Computers & laptops'), c('tv-audio', 'TV & audio'), c('cameras', 'Cameras & drones'), c('gaming', 'Gaming'), c('appliances', 'Home appliances'), c('solar', 'Solar & power')] },
  { label: 'Vehicles', entries: [c('cars', 'Cars'), c('motorcycles', 'Motorcycles & boda'), c('bicycles', 'Bicycles & scooters'), c('automotive', 'Car parts & accessories'), c('tyres', 'Tyres, rims & batteries')] },
  { label: 'Fashion', entries: [c('fashion', 'Clothing'), c('mens', "Men's wear"), c('womens', "Women's wear"), c('kids-fashion', "Kids' wear"), c('shoes', 'Shoes'), c('bags', 'Bags & luggage'), c('jewellery', 'Jewellery & watches'), c('fabrics', 'Fabrics & tailoring')] },
  { label: 'Beauty & health', entries: [c('beauty', 'Beauty & cosmetics'), c('hair', 'Hair & wigs'), c('health', 'Health & wellness'), c('fitness', 'Fitness')] },
  { label: 'Home & building', entries: [c('home', 'Home & living'), c('furniture', 'Furniture'), c('kitchen', 'Kitchen'), c('decor', 'Decor & art'), c('lighting', 'Lighting'), c('garden', 'Garden & outdoor'), c('tools', 'Tools & hardware'), c('building', 'Building materials')] },
  { label: 'Food & drink', entries: [c('groceries', 'Groceries'), c('fresh', 'Fresh produce & meat'), c('drinks', 'Drinks'), c('bakery', 'Bakery & sweets'), c('ready-food', 'Ready meals & catering')] },
  { label: 'Baby & kids', entries: [c('baby', 'Baby'), c('toys', 'Toys & games')] },
  { label: 'Business, farm & services', entries: [c('agriculture', 'Farm inputs & produce'), c('livestock', 'Livestock & poultry'), c('office', 'Office & stationery'), c('industrial', 'Industrial & equipment'), c('services', 'Services'), c('property', 'Property & rentals')] },
  { label: 'Leisure & more', entries: [c('books', 'Books & education'), c('sports', 'Sports & outdoors'), c('music', 'Music & instruments'), c('crafts', 'Crafts & handmade'), c('pets', 'Pets & supplies'), c('events', 'Events & party'), c('general', 'Everything else')] },
];

export const CATEGORY_ENTRIES: CategoryEntry[] = CATEGORY_GROUPS.flatMap((g) => g.entries);

const BY_KEY = new Map(CATEGORY_ENTRIES.map((e) => [e.key, e]));

export function categoryEntry(key: string): CategoryEntry {
  return BY_KEY.get(key) ?? { key, label: key.charAt(0).toUpperCase() + key.slice(1) };
}
