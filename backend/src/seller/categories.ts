export const CATEGORY_LABELS = {
  electronics: 'Electronics',
  phones: 'Phones & tablets',
  computers: 'Computers & laptops',
  'tv-audio': 'TV & audio',
  cameras: 'Cameras & drones',
  gaming: 'Gaming',
  appliances: 'Home appliances',
  solar: 'Solar & power',
  cars: 'Cars',
  motorcycles: 'Motorcycles & boda',
  bicycles: 'Bicycles & scooters',
  automotive: 'Car parts & accessories',
  tyres: 'Tyres, rims & batteries',
  fashion: 'Clothing',
  mens: "Men's wear",
  womens: "Women's wear",
  'kids-fashion': "Kids' wear",
  shoes: 'Shoes',
  bags: 'Bags & luggage',
  jewellery: 'Jewellery & watches',
  fabrics: 'Fabrics & tailoring',
  beauty: 'Beauty & cosmetics',
  hair: 'Hair & wigs',
  health: 'Health & wellness',
  fitness: 'Fitness',
  home: 'Home & living',
  furniture: 'Furniture',
  kitchen: 'Kitchen',
  decor: 'Decor & art',
  lighting: 'Lighting',
  garden: 'Garden & outdoor',
  tools: 'Tools & hardware',
  building: 'Building materials',
  groceries: 'Groceries',
  fresh: 'Fresh produce & meat',
  drinks: 'Drinks',
  bakery: 'Bakery & sweets',
  'ready-food': 'Ready meals & catering',
  baby: 'Baby',
  toys: 'Toys & games',
  agriculture: 'Farm inputs & produce',
  livestock: 'Livestock & poultry',
  office: 'Office & stationery',
  industrial: 'Industrial & equipment',
  services: 'Services',
  property: 'Property & rentals',
  books: 'Books & education',
  sports: 'Sports & outdoors',
  music: 'Music & instruments',
  crafts: 'Crafts & handmade',
  pets: 'Pets & supplies',
  events: 'Events & party',
  general: 'Everything else',
} as const;

export const STORE_CATEGORIES = Object.keys(CATEGORY_LABELS) as [keyof typeof CATEGORY_LABELS, ...(keyof typeof CATEGORY_LABELS)[]];

export type StoreCategory = (typeof STORE_CATEGORIES)[number];

export function categoryLabel(key: string): string {
  return (CATEGORY_LABELS as Record<string, string>)[key] ?? key;
}

export function matchCategories(q: string): StoreCategory[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return STORE_CATEGORIES.filter((key) => key.includes(needle) || CATEGORY_LABELS[key].toLowerCase().includes(needle));
}
