export interface CategoryEntry {
  key: string;
  label: string;
  versionType: string;
  versions: string[];
  subcategories: string[];
}

export interface CategoryGroup {
  label: string;
  entries: CategoryEntry[];
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45'];
const PACKS = ['500g', '1kg', '2kg', '5kg', '10kg'];
const SML = ['Small', 'Medium', 'Large'];

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Electronics & tech',
    entries: [
      { key: 'electronics', label: 'Electronics', versionType: 'Model', versions: [], subcategories: ['TVs', 'Speakers', 'Cameras', 'Smart home', 'Accessories'] },
      { key: 'phones', label: 'Phones & tablets', versionType: 'Storage', versions: ['64GB', '128GB', '256GB', '512GB', '1TB'], subcategories: ['Smartphones', 'Tablets', 'Feature phones', 'Cases & covers', 'Chargers & cables', 'Earphones', 'Power banks', 'Screen protectors'] },
      { key: 'computers', label: 'Computers & laptops', versionType: 'Configuration', versions: ['8GB / 256GB', '16GB / 512GB', '32GB / 1TB'], subcategories: ['Laptops', 'Desktops', 'Monitors', 'Printers', 'Keyboards & mice', 'Storage drives', 'Networking', 'Software'] },
      { key: 'tv-audio', label: 'TV & audio', versionType: 'Size', versions: ['32"', '43"', '50"', '55"', '65"', '75"'], subcategories: ['Smart TVs', 'Soundbars', 'Home theatre', 'Bluetooth speakers', 'Headphones', 'Radios', 'Decoders'] },
      { key: 'cameras', label: 'Cameras & drones', versionType: 'Kit', versions: ['Body only', 'With lens'], subcategories: ['DSLR', 'Mirrorless', 'Action cameras', 'Drones', 'Lenses', 'Tripods & lighting', 'CCTV'] },
      { key: 'gaming', label: 'Gaming', versionType: 'Edition', versions: ['Standard', 'Digital', 'Bundle'], subcategories: ['Consoles', 'Games', 'Controllers', 'Gaming PCs', 'Headsets', 'Chairs'] },
      { key: 'appliances', label: 'Home appliances', versionType: 'Capacity', versions: ['7kg', '10kg', '200L', '300L'], subcategories: ['Fridges & freezers', 'Washing machines', 'Cookers & ovens', 'Microwaves', 'Fans & air conditioners', 'Water dispensers', 'Irons', 'Vacuum cleaners'] },
      { key: 'solar', label: 'Solar & power', versionType: 'Capacity', versions: ['100W', '200W', '400W', '3kVA', '5kVA'], subcategories: ['Solar panels', 'Inverters', 'Batteries', 'Generators', 'Solar lights', 'Cables & controllers'] },
    ],
  },
  {
    label: 'Vehicles',
    entries: [
      { key: 'cars', label: 'Cars', versionType: 'Trim', versions: ['Base', 'Mid', 'Premium'], subcategories: ['Saloon', 'SUV', 'Pickup', 'Van & minibus', 'Truck', 'Bus', 'Hybrid & electric'] },
      { key: 'motorcycles', label: 'Motorcycles & boda', versionType: 'Engine', versions: ['100cc', '125cc', '150cc', '250cc'], subcategories: ['Boda boda', 'Scooters', 'Sport bikes', 'Tricycles', 'Helmets & gear'] },
      { key: 'bicycles', label: 'Bicycles & scooters', versionType: 'Frame size', versions: ['S', 'M', 'L'], subcategories: ['Mountain bikes', 'Road bikes', 'Kids bikes', 'Electric scooters', 'Parts'] },
      { key: 'automotive', label: 'Car parts & accessories', versionType: 'Fits', versions: [], subcategories: ['Engine parts', 'Brakes & suspension', 'Lights', 'Car audio', 'Seat covers & mats', 'Oils & fluids', 'Tools'] },
      { key: 'tyres', label: 'Tyres, rims & batteries', versionType: 'Size', versions: ['R13', 'R14', 'R15', 'R16', 'R17', 'R18'], subcategories: ['Car tyres', 'Motorcycle tyres', 'Rims', 'Car batteries', 'Tubes'] },
    ],
  },
  {
    label: 'Fashion',
    entries: [
      { key: 'fashion', label: 'Clothing', versionType: 'Size', versions: SIZES, subcategories: ['T-shirts', 'Shirts', 'Dresses', 'Trousers', 'Jackets', 'Suits', 'Sportswear', 'Underwear', 'Traditional wear'] },
      { key: 'mens', label: "Men's wear", versionType: 'Size', versions: SIZES, subcategories: ['Shirts', 'T-shirts', 'Trousers', 'Suits', 'Jackets', 'Kanzu', 'Underwear', 'Belts'] },
      { key: 'womens', label: "Women's wear", versionType: 'Size', versions: SIZES, subcategories: ['Dresses', 'Tops', 'Skirts', 'Trousers', 'Gomesi', 'Abaya', 'Lingerie', 'Maternity'] },
      { key: 'kids-fashion', label: "Kids' wear", versionType: 'Age', versions: ['0-6m', '6-12m', '1-2y', '2-4y', '4-6y', '6-8y', '8-12y'], subcategories: ['Boys', 'Girls', 'School uniforms', 'Baby clothes', 'Shoes'] },
      { key: 'shoes', label: 'Shoes', versionType: 'Size', versions: SHOE_SIZES, subcategories: ['Sneakers', 'Sandals', 'Heels', 'Boots', 'Formal shoes', 'Slippers', 'Kids shoes', 'Sports shoes'] },
      { key: 'bags', label: 'Bags & luggage', versionType: 'Size', versions: SML, subcategories: ['Handbags', 'Backpacks', 'Suitcases', 'Laptop bags', 'Wallets', 'School bags'] },
      { key: 'jewellery', label: 'Jewellery & watches', versionType: 'Size', versions: [], subcategories: ['Watches', 'Necklaces', 'Rings', 'Earrings', 'Bracelets', 'Sunglasses'] },
      { key: 'fabrics', label: 'Fabrics & tailoring', versionType: 'Length', versions: ['2m', '4m', '6m'], subcategories: ['Kitenge', 'Lace', 'Cotton', 'Silk', 'Uniform material', 'Sewing supplies'] },
    ],
  },
  {
    label: 'Beauty & health',
    entries: [
      { key: 'beauty', label: 'Beauty & cosmetics', versionType: 'Size', versions: ['30ml', '50ml', '100ml', '200ml'], subcategories: ['Skincare', 'Makeup', 'Perfume', 'Lotions & oils', 'Nails', 'Men\'s grooming'] },
      { key: 'hair', label: 'Hair & wigs', versionType: 'Length', versions: ['10"', '12"', '14"', '18"', '22"', '26"'], subcategories: ['Wigs', 'Braids & extensions', 'Hair care', 'Tools & dryers', 'Barber supplies'] },
      { key: 'health', label: 'Health & wellness', versionType: 'Pack', versions: ['30 pieces', '60 pieces', '90 pieces'], subcategories: ['Supplements', 'First aid', 'Mobility aids', 'Medical devices', 'Personal care', 'Family planning'] },
      { key: 'fitness', label: 'Fitness', versionType: 'Weight', versions: ['5kg', '10kg', '20kg'], subcategories: ['Gym equipment', 'Weights', 'Yoga', 'Supplements', 'Sportswear'] },
    ],
  },
  {
    label: 'Home & building',
    entries: [
      { key: 'home', label: 'Home & living', versionType: 'Size', versions: SML, subcategories: ['Bedding', 'Curtains', 'Storage', 'Bathroom', 'Laundry', 'Cleaning'] },
      { key: 'furniture', label: 'Furniture', versionType: 'Size', versions: ['Single', 'Double', 'Queen', 'King'], subcategories: ['Beds', 'Sofas', 'Tables', 'Chairs', 'Wardrobes', 'Office furniture', 'Outdoor'] },
      { key: 'kitchen', label: 'Kitchen', versionType: 'Size', versions: ['1L', '3L', '5L', '10L'], subcategories: ['Cookware', 'Cutlery', 'Plates & cups', 'Small appliances', 'Storage', 'Gas cylinders'] },
      { key: 'decor', label: 'Decor & art', versionType: 'Size', versions: SML, subcategories: ['Wall art', 'Paintings', 'Vases', 'Rugs & carpets', 'Mirrors', 'Plants'] },
      { key: 'lighting', label: 'Lighting', versionType: 'Wattage', versions: ['5W', '9W', '12W', '18W'], subcategories: ['Bulbs', 'Ceiling lights', 'Lamps', 'Outdoor lights', 'Chandeliers'] },
      { key: 'garden', label: 'Garden & outdoor', versionType: 'Size', versions: SML, subcategories: ['Garden tools', 'Seeds & plants', 'Outdoor furniture', 'Water tanks', 'Pots'] },
      { key: 'tools', label: 'Tools & hardware', versionType: 'Size', versions: [], subcategories: ['Power tools', 'Hand tools', 'Plumbing', 'Electrical', 'Paint', 'Locks & security'] },
      { key: 'building', label: 'Building materials', versionType: 'Size', versions: [], subcategories: ['Cement', 'Iron sheets', 'Tiles', 'Timber', 'Doors & windows', 'Steel bars', 'Sand & aggregate'] },
    ],
  },
  {
    label: 'Food & drink',
    entries: [
      { key: 'groceries', label: 'Groceries', versionType: 'Pack size', versions: PACKS, subcategories: ['Rice & grains', 'Flour & posho', 'Sugar & salt', 'Cooking oil', 'Beans & pulses', 'Spices', 'Snacks', 'Tinned food'] },
      { key: 'fresh', label: 'Fresh produce & meat', versionType: 'Weight', versions: ['1kg', '2kg', '5kg'], subcategories: ['Fruits', 'Vegetables', 'Matooke', 'Meat', 'Chicken', 'Fish', 'Eggs', 'Dairy'] },
      { key: 'drinks', label: 'Drinks', versionType: 'Size', versions: ['330ml', '500ml', '1L', '2L', 'Crate'], subcategories: ['Water', 'Soda', 'Juice', 'Beer', 'Wine & spirits', 'Tea & coffee'] },
      { key: 'bakery', label: 'Bakery & sweets', versionType: 'Size', versions: SML, subcategories: ['Cakes', 'Bread', 'Pastries', 'Cookies', 'Chocolate', 'Wedding cakes'] },
      { key: 'ready-food', label: 'Ready meals & catering', versionType: 'Portion', versions: ['Single', 'Family', 'Party'], subcategories: ['Lunch boxes', 'Rolex & street food', 'Catering', 'Frozen meals', 'Special diets'] },
    ],
  },
  {
    label: 'Baby & kids',
    entries: [
      { key: 'baby', label: 'Baby', versionType: 'Size', versions: ['Newborn', 'S', 'M', 'L', 'XL'], subcategories: ['Diapers & wipes', 'Feeding', 'Baby care', 'Prams & carriers', 'Cots & bedding', 'Baby clothes'] },
      { key: 'toys', label: 'Toys & games', versionType: 'Age', versions: ['0-2y', '3-5y', '6-9y', '10+'], subcategories: ['Educational toys', 'Dolls', 'Cars & trucks', 'Board games', 'Outdoor play', 'Puzzles'] },
    ],
  },
  {
    label: 'Business, farm & services',
    entries: [
      { key: 'agriculture', label: 'Farm inputs & produce', versionType: 'Pack size', versions: PACKS.concat(['25kg', '50kg']), subcategories: ['Seeds', 'Fertiliser', 'Animal feed', 'Pesticides', 'Farm tools', 'Irrigation', 'Harvest'] },
      { key: 'livestock', label: 'Livestock & poultry', versionType: 'Age', versions: ['Day old', '1 month', '3 months', 'Mature'], subcategories: ['Chicken', 'Goats', 'Cattle', 'Pigs', 'Rabbits', 'Fish farming', 'Bee keeping'] },
      { key: 'office', label: 'Office & stationery', versionType: 'Pack', versions: ['1 piece', 'Pack of 10', 'Box'], subcategories: ['Paper', 'Pens & pencils', 'Notebooks', 'Printing & ink', 'Office furniture', 'School supplies'] },
      { key: 'industrial', label: 'Industrial & equipment', versionType: 'Model', versions: [], subcategories: ['Machinery', 'Welding', 'Safety gear', 'Packaging', 'Salon equipment', 'Restaurant equipment'] },
      { key: 'services', label: 'Services', versionType: 'Package', versions: ['Basic', 'Standard', 'Premium'], subcategories: ['Repairs', 'Cleaning', 'Tailoring', 'Printing & branding', 'Photography', 'Tutoring', 'Transport', 'Beauty at home'] },
      { key: 'property', label: 'Property & rentals', versionType: 'Type', versions: ['Single room', '1 bedroom', '2 bedroom', '3 bedroom'], subcategories: ['Houses for rent', 'Houses for sale', 'Land', 'Shops & offices', 'Hostels', 'Short stays'] },
    ],
  },
  {
    label: 'Leisure & more',
    entries: [
      { key: 'books', label: 'Books & education', versionType: 'Format', versions: ['Paperback', 'Hardcover'], subcategories: ['Textbooks', 'Novels', 'Children\'s books', 'Religious', 'Past papers', 'Courses'] },
      { key: 'sports', label: 'Sports & outdoors', versionType: 'Size', versions: SIZES, subcategories: ['Football', 'Jerseys', 'Running', 'Cycling', 'Camping', 'Swimming'] },
      { key: 'music', label: 'Music & instruments', versionType: 'Size', versions: [], subcategories: ['Guitars', 'Keyboards', 'Drums', 'DJ equipment', 'Microphones', 'Amplifiers'] },
      { key: 'crafts', label: 'Crafts & handmade', versionType: 'Size', versions: SML, subcategories: ['Baskets', 'Beadwork', 'Bark cloth', 'Pottery', 'Woodwork', 'Gifts'] },
      { key: 'pets', label: 'Pets & supplies', versionType: 'Size', versions: SML, subcategories: ['Dogs', 'Cats', 'Pet food', 'Cages & beds', 'Grooming', 'Birds'] },
      { key: 'events', label: 'Events & party', versionType: 'Package', versions: ['Basic', 'Standard', 'Premium'], subcategories: ['Decor', 'Tents & chairs', 'Sound & lighting', 'Gifts', 'Invitations', 'Costumes'] },
      { key: 'general', label: 'Everything else', versionType: 'Option', versions: [], subcategories: [] },
    ],
  },
];

export const CATEGORY_ENTRIES: CategoryEntry[] = CATEGORY_GROUPS.flatMap((g) => g.entries);

const BY_KEY = new Map(CATEGORY_ENTRIES.map((e) => [e.key, e]));

export function categoryEntry(key: string): CategoryEntry {
  return BY_KEY.get(key) ?? { key, label: key.charAt(0).toUpperCase() + key.slice(1), versionType: 'Option', versions: [], subcategories: [] };
}
