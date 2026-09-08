export interface Swatch { name: string; hex: string }

export interface SubEntry {
  name: string;
  versionType?: string;
  versions?: string[];
  specs?: string[];
  colours?: Swatch[];
}

export interface CategoryEntry {
  key: string;
  label: string;
  versionType: string;
  versions: string[];
  specs: string[];
  brands: string[];
  colours: Swatch[];
  subcategories: SubEntry[];
}

export interface CategoryGroup {
  label: string;
  entries: CategoryEntry[];
}

export interface ResolvedOptions {
  versionType: string;
  versions: string[];
  specs: string[];
  brands: string[];
  colours: Swatch[];
  colourTitle: string;
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
const WAIST = ['28', '30', '32', '34', '36', '38', '40', '42'];
const DRESS = ['6', '8', '10', '12', '14', '16', '18', '20'];
const SHOE_SIZES = ['36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46'];
const KIDS_SHOES = ['24', '26', '28', '30', '32', '34', '35'];
const KIDS_AGES = ['0-6m', '6-12m', '1-2y', '2-4y', '4-6y', '6-8y', '8-12y', '12-14y'];
const PACKS = ['500g', '1kg', '2kg', '5kg', '10kg'];
const BIG_PACKS = ['1kg', '2kg', '5kg', '10kg', '25kg', '50kg'];
const LIQUIDS = ['500ml', '1L', '3L', '5L', '20L'];
const SML = ['Small', 'Medium', 'Large'];
const STORAGE = ['64GB', '128GB', '256GB', '512GB', '1TB'];

const s = (name: string, extra: Partial<SubEntry> = {}): SubEntry => ({ name, ...extra });

export const CLOTHING_COLOURS: Swatch[] = [
  { name: 'Black', hex: '#111111' }, { name: 'White', hex: '#F5F5F5' }, { name: 'Navy blue', hex: '#1F3A93' }, { name: 'Blue', hex: '#2563EB' },
  { name: 'Sky blue', hex: '#7DD3FC' }, { name: 'Red', hex: '#DC2626' }, { name: 'Maroon', hex: '#7F1D1D' }, { name: 'Pink', hex: '#EC4899' },
  { name: 'Green', hex: '#16A34A' }, { name: 'Olive', hex: '#6B7B2C' }, { name: 'Yellow', hex: '#FACC15' }, { name: 'Orange', hex: '#F97316' },
  { name: 'Purple', hex: '#7C3AED' }, { name: 'Grey', hex: '#9CA3AF' }, { name: 'Brown', hex: '#8B5E3C' }, { name: 'Beige', hex: '#D9C7A7' },
  { name: 'Khaki', hex: '#B8A36B' }, { name: 'Cream', hex: '#F3EBD3' },
];

const CAR_PAINT: Swatch[] = [
  { name: 'Pearl white', hex: '#F2F1EC' }, { name: 'Black', hex: '#111111' }, { name: 'Silver', hex: '#C0C0C0' }, { name: 'Gunmetal grey', hex: '#4B4F54' },
  { name: 'Wine red', hex: '#6B1F2B' }, { name: 'Navy blue', hex: '#1F3A93' }, { name: 'Champagne gold', hex: '#D4B87A' }, { name: 'Dark green', hex: '#1F4D3A' },
  { name: 'Beige', hex: '#D9C7A7' }, { name: 'Bright red', hex: '#DC2626' }, { name: 'Sky blue', hex: '#7DD3FC' }, { name: 'Orange', hex: '#F97316' },
];

const APPLE_COLOURS: Swatch[] = [
  { name: 'Black Titanium', hex: '#2F2F2F' }, { name: 'White Titanium', hex: '#E5E3DE' }, { name: 'Natural Titanium', hex: '#B8AFA3' }, { name: 'Desert Titanium', hex: '#C9A98A' },
  { name: 'Ultramarine', hex: '#4B6FD8' }, { name: 'Teal', hex: '#3F9B9B' }, { name: 'Pink', hex: '#F3C5D1' }, { name: 'Black', hex: '#1C1C1E' },
  { name: 'White', hex: '#F5F5F0' }, { name: 'Blue', hex: '#2C4A8C' }, { name: 'Green', hex: '#B7D4B0' }, { name: 'Yellow', hex: '#F6E6A0' },
  { name: 'Purple', hex: '#C9B8E8' }, { name: 'Midnight', hex: '#1F2430' }, { name: 'Starlight', hex: '#F0EBDF' }, { name: 'Red', hex: '#C8102E' },
  { name: 'Space Grey', hex: '#5B5B5F' }, { name: 'Silver', hex: '#D8D8DA' }, { name: 'Gold', hex: '#E3CBA8' }, { name: 'Sierra Blue', hex: '#9BB5CE' },
];

const SAMSUNG_COLOURS: Swatch[] = [
  { name: 'Phantom Black', hex: '#1B1B1D' }, { name: 'Titanium Gray', hex: '#8A8C8E' }, { name: 'Titanium Violet', hex: '#9B8FC9' }, { name: 'Titanium Yellow', hex: '#F2E27A' },
  { name: 'Titanium Black', hex: '#2B2B2E' }, { name: 'Cream', hex: '#F1E9D8' }, { name: 'Lavender', hex: '#C9B6E4' }, { name: 'Icy Blue', hex: '#BFDDEB' },
  { name: 'Mint', hex: '#BFE3D0' }, { name: 'Graphite', hex: '#3E4044' }, { name: 'Awesome Navy', hex: '#2A3A5E' }, { name: 'Awesome Lilac', hex: '#C6B3DD' },
  { name: 'Awesome Lime', hex: '#CFE38A' }, { name: 'Awesome Black', hex: '#141414' }, { name: 'Awesome White', hex: '#F4F4F2' }, { name: 'Silver', hex: '#D0D2D4' },
];

const ANDROID_COLOURS: Swatch[] = [
  { name: 'Black', hex: '#111111' }, { name: 'Titanium grey', hex: '#7D8186' }, { name: 'Emerald green', hex: '#2E8B57' }, { name: 'Sky blue', hex: '#7DD3FC' },
  { name: 'Ivory white', hex: '#F4F1E6' }, { name: 'Gold', hex: '#D4AF37' }, { name: 'Orange', hex: '#F97316' }, { name: 'Purple', hex: '#7C3AED' },
  { name: 'Navy blue', hex: '#1F3A93' }, { name: 'Silver', hex: '#C0C0C0' }, { name: 'Mint', hex: '#BFE3D0' }, { name: 'Rose gold', hex: '#D9A5A0' },
];

const HAIR_COLOURS: Swatch[] = [
  { name: 'Natural black 1B', hex: '#0F0F0F' }, { name: 'Jet black 1', hex: '#050505' }, { name: 'Dark brown 2', hex: '#3B2A20' }, { name: 'Medium brown 4', hex: '#5A3A28' },
  { name: 'Honey blonde 27', hex: '#B8863B' }, { name: 'Blonde 613', hex: '#E9D8A6' }, { name: 'Burgundy 99J', hex: '#6B1F2B' }, { name: 'Ombre 1B/30', hex: '#6A4A2E' },
  { name: 'Red', hex: '#B22222' }, { name: 'Grey', hex: '#9CA3AF' }, { name: 'Ginger 350', hex: '#B5552B' }, { name: 'Highlight P4/27', hex: '#8C6A3F' },
];

const WOOD_COLOURS: Swatch[] = [
  { name: 'Mahogany', hex: '#4E2A1E' }, { name: 'Walnut', hex: '#5D4033' }, { name: 'Oak', hex: '#C69C6D' }, { name: 'Teak', hex: '#A5673F' },
  { name: 'Pine', hex: '#E2C290' }, { name: 'Wenge', hex: '#3B2F2F' }, { name: 'White', hex: '#F5F5F5' }, { name: 'Black', hex: '#111111' },
  { name: 'Grey', hex: '#9CA3AF' }, { name: 'Cream', hex: '#F3EBD3' }, { name: 'Navy blue', hex: '#1F3A93' }, { name: 'Emerald green', hex: '#2E8B57' },
];

const MAKEUP_SHADES = ['Fair', 'Light', 'Light medium', 'Medium', 'Tan', 'Deep', 'Rich'];

const PHONE_BRANDS = ['Apple', 'Samsung', 'Tecno', 'Infinix', 'Itel', 'Xiaomi', 'Redmi', 'Oppo', 'Vivo', 'Huawei', 'Nokia', 'Google', 'OnePlus', 'Realme', 'Motorola'];
const COMPUTER_BRANDS = ['HP', 'Dell', 'Lenovo', 'Apple', 'Asus', 'Acer', 'Microsoft', 'Toshiba', 'MSI', 'Samsung'];
const TV_BRANDS = ['Samsung', 'LG', 'Hisense', 'Sony', 'TCL', 'Vitron', 'Skyworth', 'JBL', 'Bose', 'Sony', 'Anker'];
const APPLIANCE_BRANDS = ['Samsung', 'LG', 'Hisense', 'Bruhm', 'Ramtons', 'Von', 'Mika', 'Beko', 'Bosch', 'Nunix'];
const CAR_BRANDS = ['Toyota', 'Nissan', 'Honda', 'Subaru', 'Mitsubishi', 'Mazda', 'Suzuki', 'Isuzu', 'Mercedes-Benz', 'BMW', 'Audi', 'Volkswagen', 'Land Rover', 'Hyundai', 'Kia', 'Ford', 'Lexus', 'Peugeot', 'Volvo'];
const BIKE_BRANDS = ['Bajaj', 'TVS', 'Honda', 'Yamaha', 'Haojue', 'Boxer', 'Suzuki', 'KTM', 'Kawasaki', 'Lifan'];
const SHOE_BRANDS = ['Nike', 'Adidas', 'Puma', 'New Balance', 'Bata', 'Clarks', 'Vans', 'Converse', 'Skechers', 'Reebok', 'Timberland', 'Crocs'];
const FASHION_BRANDS = ['Nike', 'Adidas', 'Puma', 'Zara', 'H&M', 'Levi\'s', 'Gucci', 'Polo Ralph Lauren', 'Tommy Hilfiger', 'Lacoste', 'Local tailor'];
const BEAUTY_BRANDS = ['Nivea', 'Vaseline', 'Garnier', 'Maybelline', 'MAC', 'L\'Oréal', 'Dove', 'Fenty Beauty', 'Black Opal', 'Movit', 'Samona', 'Dior', 'Chanel'];
const HAIR_BRANDS = ['Darling', 'Freetress', 'X-pression', 'Outre', 'Sensationnel', 'Bobbi Boss', 'Amigos', 'Bella'];
const GROCERY_BRANDS = ['Kakira', 'Kinyara', 'Fresh Dairy', 'Mukwano', 'Bidco', 'Tilda', 'Pearl', 'Britania', 'Nice House of Plastics', 'Riham'];

const PHONE_SPECS = ['Brand', 'Model', 'Storage', 'RAM', 'Screen size', 'Battery', 'Camera', 'Network', 'SIM', 'Condition', 'Warranty'];
const CLOTHING_SPECS = ['Material', 'Fit', 'Sizes available', 'Care', 'Made in'];
const SERVICE_SPECS = ['What is included', 'Duration', 'Area covered', 'Availability', 'Experience'];

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    label: 'Electronics & tech',
    entries: [
      { key: 'electronics', label: 'Electronics', versionType: 'Model', versions: [], specs: ['Brand', 'Model', 'Power', 'Warranty', 'Condition'], brands: TV_BRANDS, colours: [],
        subcategories: [s('TVs', { versionType: 'Size', versions: ['32"', '43"', '50"', '55"', '65"'] }), s('Speakers', { versionType: 'Size', versions: SML }), s('Cameras'), s('Smart home'), s('Accessories')] },
      { key: 'phones', label: 'Phones & tablets', versionType: 'Storage', versions: STORAGE, specs: PHONE_SPECS, brands: PHONE_BRANDS, colours: [],
        subcategories: [s('Smartphones'), s('Tablets', { versions: STORAGE }), s('Feature phones', { versionType: 'Model', versions: [] }), s('Cases & covers', { versionType: 'For model', versions: [], specs: ['Fits model', 'Material', 'Type'] }), s('Chargers & cables', { versionType: 'Wattage', versions: ['20W', '25W', '45W', '65W', '100W'], specs: ['Wattage', 'Connector', 'Cable length', 'Fast charging'] }), s('Earphones', { versionType: 'Type', versions: ['Wired', 'Wireless'], specs: ['Brand', 'Type', 'Battery life', 'Noise cancelling'] }), s('Power banks', { versionType: 'Capacity', versions: ['10,000mAh', '20,000mAh', '30,000mAh'], specs: ['Capacity', 'Ports', 'Fast charging'] }), s('Screen protectors', { versionType: 'For model', versions: [] }), s('Smartwatches', { versionType: 'Size', versions: ['41mm', '45mm', '49mm'] })] },
      { key: 'computers', label: 'Computers & laptops', versionType: 'Configuration', versions: ['8GB / 256GB', '16GB / 512GB', '32GB / 1TB'], specs: ['Brand', 'Model', 'Processor', 'RAM', 'Storage', 'Screen size', 'Graphics', 'Operating system', 'Condition', 'Warranty'], brands: COMPUTER_BRANDS, colours: [],
        subcategories: [s('Laptops'), s('Desktops'), s('Monitors', { versionType: 'Size', versions: ['22"', '24"', '27"', '32"'], specs: ['Brand', 'Size', 'Resolution', 'Refresh rate', 'Ports'] }), s('Printers', { versionType: 'Model', versions: [], specs: ['Brand', 'Type', 'Colour printing', 'Wireless', 'Cartridge'] }), s('Keyboards & mice', { versionType: 'Type', versions: ['Wired', 'Wireless'] }), s('Storage drives', { versionType: 'Capacity', versions: ['256GB', '512GB', '1TB', '2TB', '4TB'] }), s('Networking', { versionType: 'Model', versions: [] }), s('Software', { versionType: 'Licence', versions: ['1 year', 'Lifetime'] })] },
      { key: 'tv-audio', label: 'TV & audio', versionType: 'Size', versions: ['32"', '43"', '50"', '55"', '65"', '75"'], specs: ['Brand', 'Screen size', 'Resolution', 'Smart TV', 'Ports', 'Warranty'], brands: TV_BRANDS, colours: [],
        subcategories: [s('Smart TVs'), s('Soundbars', { versionType: 'Channels', versions: ['2.1', '3.1', '5.1'], specs: ['Brand', 'Power', 'Channels', 'Bluetooth', 'Subwoofer'] }), s('Home theatre', { versionType: 'Power', versions: ['500W', '1000W', '2000W'] }), s('Bluetooth speakers', { versionType: 'Size', versions: SML, specs: ['Brand', 'Battery life', 'Waterproof', 'Power'] }), s('Headphones', { versionType: 'Type', versions: ['Wired', 'Wireless'] }), s('Radios', { versionType: 'Model', versions: [] }), s('Decoders', { versionType: 'Package', versions: ['Decoder only', 'With dish', 'With subscription'] })] },
      { key: 'cameras', label: 'Cameras & drones', versionType: 'Kit', versions: ['Body only', 'With lens'], specs: ['Brand', 'Model', 'Megapixels', 'Video', 'Lens mount', 'Condition'], brands: ['Canon', 'Nikon', 'Sony', 'Fujifilm', 'GoPro', 'DJI', 'Panasonic'], colours: [],
        subcategories: [s('DSLR'), s('Mirrorless'), s('Action cameras'), s('Drones', { versionType: 'Package', versions: ['Standard', 'Fly More combo'], specs: ['Brand', 'Flight time', 'Camera', 'Range'] }), s('Lenses', { versionType: 'Focal length', versions: [] }), s('Tripods & lighting'), s('CCTV', { versionType: 'Cameras', versions: ['2 cameras', '4 cameras', '8 cameras'], specs: ['Brand', 'Resolution', 'Storage', 'Night vision', 'Installation'] })] },
      { key: 'gaming', label: 'Gaming', versionType: 'Edition', versions: ['Standard', 'Digital', 'Bundle'], specs: ['Platform', 'Brand', 'Storage', 'Condition', 'Games included'], brands: ['Sony', 'Microsoft', 'Nintendo', 'Logitech', 'Razer'], colours: [],
        subcategories: [s('Consoles'), s('Games', { versionType: 'Platform', versions: ['PS5', 'PS4', 'Xbox', 'Switch', 'PC'] }), s('Controllers'), s('Gaming PCs', { versionType: 'Configuration', versions: [] }), s('Headsets'), s('Chairs', { versionType: 'Size', versions: SML })] },
      { key: 'appliances', label: 'Home appliances', versionType: 'Capacity', versions: ['7kg', '10kg', '200L', '300L'], specs: ['Brand', 'Capacity', 'Power', 'Energy rating', 'Warranty'], brands: APPLIANCE_BRANDS, colours: [{ name: 'Silver', hex: '#C0C0C0' }, { name: 'White', hex: '#F5F5F5' }, { name: 'Black', hex: '#111111' }, { name: 'Grey', hex: '#9CA3AF' }, { name: 'Red', hex: '#DC2626' }],
        subcategories: [s('Fridges & freezers', { versions: ['90L', '150L', '200L', '300L', '400L'] }), s('Washing machines', { versions: ['6kg', '7kg', '8kg', '10kg', '12kg'] }), s('Cookers & ovens', { versionType: 'Burners', versions: ['2 burner', '4 burner', '6 burner'] }), s('Microwaves', { versions: ['20L', '25L', '30L'] }), s('Fans & air conditioners', { versionType: 'Size', versions: ['12"', '16"', '18"', '1HP', '1.5HP', '2HP'] }), s('Water dispensers', { versionType: 'Type', versions: ['Table top', 'Standing', 'Hot & cold'] }), s('Irons', { versionType: 'Type', versions: ['Dry', 'Steam'] }), s('Vacuum cleaners'), s('Blenders & mixers', { versions: ['1.5L', '2L'] })] },
      { key: 'solar', label: 'Solar & power', versionType: 'Capacity', versions: ['100W', '200W', '400W', '3kVA', '5kVA'], specs: ['Brand', 'Capacity', 'Voltage', 'Battery type', 'Warranty', 'Installation'], brands: ['Jinko', 'Canadian Solar', 'Felicity', 'Must', 'Luminous', 'Sun King', 'd.light', 'Fenix'], colours: [],
        subcategories: [s('Solar panels', { versions: ['100W', '200W', '300W', '400W', '550W'] }), s('Inverters', { versions: ['1kVA', '3kVA', '5kVA', '10kVA'] }), s('Batteries', { versions: ['100Ah', '150Ah', '200Ah', '5kWh'] }), s('Generators', { versions: ['2kVA', '5kVA', '10kVA', '20kVA'] }), s('Solar lights', { versionType: 'Package', versions: ['Single light', '2 lights', '4 lights'] }), s('Cables & controllers')] },
    ],
  },
  {
    label: 'Vehicles',
    entries: [
      { key: 'cars', label: 'Cars', versionType: 'Trim', versions: ['Base', 'Mid', 'Premium'], specs: ['Make', 'Model', 'Year', 'Mileage (km)', 'Transmission', 'Fuel', 'Engine size', 'Drive', 'Body type', 'Seats', 'Condition', 'Registration', 'Location'], brands: CAR_BRANDS, colours: CAR_PAINT,
        subcategories: [s('Saloon'), s('SUV'), s('Pickup'), s('Van & minibus'), s('Truck', { versionType: 'Tonnage', versions: ['3 tonne', '5 tonne', '10 tonne'] }), s('Bus', { versionType: 'Seats', versions: ['14 seater', '28 seater', '65 seater'] }), s('Hybrid & electric'), s('Car hire', { versionType: 'Period', versions: ['Per day', 'Per week', 'Per month'], specs: ['Make', 'Model', 'Year', 'Seats', 'With driver', 'Fuel included', 'Area covered'] })] },
      { key: 'motorcycles', label: 'Motorcycles & boda', versionType: 'Engine', versions: ['100cc', '125cc', '150cc', '250cc'], specs: ['Make', 'Model', 'Year', 'Engine (cc)', 'Mileage (km)', 'Fuel', 'Condition', 'Registration'], brands: BIKE_BRANDS, colours: CAR_PAINT,
        subcategories: [s('Boda boda'), s('Scooters'), s('Sport bikes', { versions: ['250cc', '400cc', '600cc', '1000cc'] }), s('Tricycles'), s('Helmets & gear', { versionType: 'Size', versions: SIZES })] },
      { key: 'bicycles', label: 'Bicycles & scooters', versionType: 'Frame size', versions: ['S', 'M', 'L'], specs: ['Brand', 'Frame size', 'Wheel size', 'Gears', 'Type', 'Condition'], brands: ['Trek', 'Giant', 'Phoenix', 'Hero', 'Xiaomi', 'Segway'], colours: CLOTHING_COLOURS,
        subcategories: [s('Mountain bikes', { versionType: 'Wheel size', versions: ['24"', '26"', '27.5"', '29"'] }), s('Road bikes'), s('Kids bikes', { versionType: 'Wheel size', versions: ['12"', '16"', '20"'] }), s('Electric scooters', { versionType: 'Range', versions: ['20km', '30km', '45km'] }), s('Parts')] },
      { key: 'automotive', label: 'Car parts & accessories', versionType: 'Fits', versions: [], specs: ['Fits make and model', 'Part number', 'Brand', 'Condition', 'Warranty'], brands: CAR_BRANDS, colours: [],
        subcategories: [s('Engine parts'), s('Brakes & suspension'), s('Lights'), s('Car audio', { versionType: 'Model', versions: [] }), s('Seat covers & mats', { versionType: 'Fits', versions: ['5 seater', '7 seater', 'Universal'] }), s('Oils & fluids', { versionType: 'Size', versions: ['1L', '4L', '5L', '20L'] }), s('Tools')] },
      { key: 'tyres', label: 'Tyres, rims & batteries', versionType: 'Size', versions: ['R13', 'R14', 'R15', 'R16', 'R17', 'R18'], specs: ['Size', 'Brand', 'Type', 'Load index', 'Condition'], brands: ['Bridgestone', 'Michelin', 'Dunlop', 'Yokohama', 'Pirelli', 'Continental', 'Chloride Exide', 'Bosch'], colours: [],
        subcategories: [s('Car tyres'), s('Motorcycle tyres', { versions: ['17"', '18"'] }), s('Rims'), s('Car batteries', { versionType: 'Capacity', versions: ['45Ah', '60Ah', '75Ah', '100Ah'] }), s('Tubes')] },
    ],
  },
  {
    label: 'Fashion',
    entries: [
      { key: 'fashion', label: 'Clothing', versionType: 'Size', versions: SIZES, specs: CLOTHING_SPECS, brands: FASHION_BRANDS, colours: CLOTHING_COLOURS,
        subcategories: [s('T-shirts'), s('Shirts'), s('Dresses', { versions: DRESS }), s('Trousers', { versionType: 'Waist', versions: WAIST }), s('Jeans', { versionType: 'Waist', versions: WAIST }), s('Shorts', { versionType: 'Waist', versions: WAIST }), s('Jackets'), s('Suits', { versionType: 'Chest', versions: ['36', '38', '40', '42', '44', '46', '48'] }), s('Sportswear'), s('Underwear'), s('Traditional wear'), s('Uniforms')] },
      { key: 'mens', label: "Men's wear", versionType: 'Size', versions: SIZES, specs: CLOTHING_SPECS, brands: FASHION_BRANDS, colours: CLOTHING_COLOURS,
        subcategories: [s('Shirts'), s('T-shirts'), s('Trousers', { versionType: 'Waist', versions: WAIST }), s('Jeans', { versionType: 'Waist', versions: WAIST }), s('Shorts', { versionType: 'Waist', versions: WAIST }), s('Suits', { versionType: 'Chest', versions: ['36', '38', '40', '42', '44', '46', '48'] }), s('Jackets'), s('Kanzu'), s('Underwear'), s('Belts', { versionType: 'Waist', versions: WAIST }), s('Caps & hats', { versionType: 'Size', versions: ['One size', 'S/M', 'L/XL'] })] },
      { key: 'womens', label: "Women's wear", versionType: 'Size', versions: SIZES, specs: CLOTHING_SPECS, brands: FASHION_BRANDS, colours: CLOTHING_COLOURS,
        subcategories: [s('Dresses', { versions: DRESS }), s('Tops'), s('Skirts', { versions: DRESS }), s('Trousers', { versionType: 'Waist', versions: WAIST }), s('Jeans', { versionType: 'Waist', versions: WAIST }), s('Gomesi', { versionType: 'Size', versions: ['Free size', 'S', 'M', 'L', 'XL', 'XXL'] }), s('Abaya', { versions: ['52', '54', '56', '58', '60'] }), s('Lingerie', { versions: ['32B', '34B', '36B', '36C', '38C', '40D'] }), s('Maternity'), s('Leggings')] },
      { key: 'kids-fashion', label: "Kids' wear", versionType: 'Age', versions: KIDS_AGES, specs: CLOTHING_SPECS, brands: FASHION_BRANDS, colours: CLOTHING_COLOURS,
        subcategories: [s('Boys'), s('Girls'), s('School uniforms', { versionType: 'Size', versions: ['4', '6', '8', '10', '12', '14', '16'] }), s('Baby clothes', { versions: ['0-3m', '3-6m', '6-12m', '12-18m', '18-24m'] }), s('Shoes', { versionType: 'Size', versions: KIDS_SHOES })] },
      { key: 'shoes', label: 'Shoes', versionType: 'Size', versions: SHOE_SIZES, specs: ['Brand', 'Material', 'Sole', 'Closure', 'Fit', 'Made in'], brands: SHOE_BRANDS, colours: CLOTHING_COLOURS,
        subcategories: [s('Sneakers'), s('Sandals'), s('Heels', { versions: ['36', '37', '38', '39', '40', '41', '42'] }), s('Boots'), s('Formal shoes', { versions: ['39', '40', '41', '42', '43', '44', '45', '46'] }), s('Slippers'), s('Kids shoes', { versions: KIDS_SHOES }), s('Sports shoes'), s('Safety boots', { versions: ['39', '40', '41', '42', '43', '44', '45', '46'] })] },
      { key: 'bags', label: 'Bags & luggage', versionType: 'Size', versions: SML, specs: ['Material', 'Dimensions', 'Compartments', 'Brand', 'Wheels'], brands: ['Louis Vuitton', 'Gucci', 'Michael Kors', 'Samsonite', 'American Tourister', 'Nike', 'Adidas', 'Local leather'], colours: CLOTHING_COLOURS,
        subcategories: [s('Handbags'), s('Backpacks'), s('Suitcases', { versions: ['Cabin 20"', 'Medium 24"', 'Large 28"', 'Set of 3'] }), s('Laptop bags', { versions: ['13"', '15.6"', '17"'] }), s('Wallets', { versionType: 'Type', versions: ['Bifold', 'Long', 'Card holder'] }), s('School bags'), s('Travel bags')] },
      { key: 'jewellery', label: 'Jewellery & watches', versionType: 'Size', versions: [], specs: ['Material', 'Stone', 'Weight', 'Water resistant', 'Brand', 'Strap'], brands: ['Rolex', 'Casio', 'Seiko', 'Fossil', 'Michael Kors', 'Tissot', 'Citizen', 'Swarovski', 'Pandora'], colours: [{ name: 'Gold', hex: '#D4AF37' }, { name: 'Silver', hex: '#C0C0C0' }, { name: 'Rose gold', hex: '#D9A5A0' }, { name: 'Black', hex: '#111111' }, { name: 'Two tone', hex: '#C8B273' }],
        subcategories: [s('Watches', { versionType: 'Case size', versions: ['36mm', '40mm', '42mm', '44mm'] }), s('Necklaces', { versionType: 'Length', versions: ['16"', '18"', '20"', '24"'] }), s('Rings', { versions: ['5', '6', '7', '8', '9', '10', '11'] }), s('Earrings'), s('Bracelets', { versions: ['S', 'M', 'L'] }), s('Sunglasses'), s('Sets')] },
      { key: 'fabrics', label: 'Fabrics & tailoring', versionType: 'Length', versions: ['2m', '4m', '6m'], specs: ['Material', 'Width', 'Pattern', 'Origin', 'Care'], brands: ['Vlisco', 'Hitarget', 'Da Viva', 'Woodin', 'GTP', 'Local'], colours: CLOTHING_COLOURS,
        subcategories: [s('Kitenge', { versions: ['3 yards', '6 yards'] }), s('Lace'), s('Cotton'), s('Silk'), s('Uniform material', { versions: ['1m', '2m', '3m'] }), s('Sewing supplies', { versionType: 'Pack', versions: [] }), s('Tailoring service', { versionType: 'Item', versions: ['Shirt', 'Dress', 'Suit', 'Gomesi', 'Kanzu'], specs: SERVICE_SPECS })] },
    ],
  },
  {
    label: 'Beauty & health',
    entries: [
      { key: 'beauty', label: 'Beauty & cosmetics', versionType: 'Size', versions: ['30ml', '50ml', '100ml', '200ml'], specs: ['Brand', 'Skin type', 'Volume', 'Key ingredients', 'Expiry', 'Made in'], brands: BEAUTY_BRANDS, colours: [],
        subcategories: [s('Skincare', { versions: ['50ml', '100ml', '200ml', '400ml'] }), s('Makeup', { versionType: 'Shade', versions: MAKEUP_SHADES, specs: ['Brand', 'Finish', 'Coverage', 'Skin type', 'Expiry'] }), s('Perfume', { versions: ['30ml', '50ml', '100ml', '200ml'], specs: ['Brand', 'Type', 'Scent notes', 'Longevity', 'Original or inspired'] }), s('Lotions & oils', { versions: ['100ml', '200ml', '400ml', '1L'] }), s('Nails', { versionType: 'Type', versions: ['Gel', 'Acrylic', 'Press-on', 'Polish'] }), s('Men\'s grooming'), s('Lips', { versionType: 'Shade', versions: ['Nude', 'Pink', 'Red', 'Berry', 'Brown', 'Clear'] }), s('Sunscreen', { versions: ['SPF 30', 'SPF 50'] })] },
      { key: 'hair', label: 'Hair & wigs', versionType: 'Length', versions: ['10"', '12"', '14"', '18"', '22"', '26"'], specs: ['Type', 'Length', 'Texture', 'Density', 'Lace type', 'Brand', 'Can be dyed'], brands: HAIR_BRANDS, colours: HAIR_COLOURS,
        subcategories: [s('Wigs'), s('Braids & extensions', { versionType: 'Length', versions: ['18"', '24"', '30"', '42"'] }), s('Bundles & closures', { versions: ['10"', '12"', '14"', '16"', '18"', '20"', '22"', '24"'] }), s('Hair care', { versionType: 'Size', versions: ['100ml', '250ml', '500ml', '1L'], specs: ['Brand', 'Hair type', 'Volume', 'Key ingredients'] }), s('Tools & dryers', { versionType: 'Model', versions: [], specs: ['Brand', 'Power', 'Heat settings', 'Warranty'] }), s('Barber supplies', { versionType: 'Model', versions: [] })] },
      { key: 'health', label: 'Health & wellness', versionType: 'Pack', versions: ['30 pieces', '60 pieces', '90 pieces'], specs: ['Brand', 'Dosage', 'Pack size', 'Expiry', 'Made in'], brands: [], colours: [],
        subcategories: [s('Supplements'), s('First aid', { versionType: 'Kit', versions: ['Basic', 'Family', 'Vehicle'] }), s('Mobility aids', { versionType: 'Size', versions: SML }), s('Medical devices', { versionType: 'Model', versions: [], specs: ['Brand', 'Type', 'Accuracy', 'Warranty'] }), s('Personal care', { versionType: 'Size', versions: ['100ml', '250ml', '500ml'] }), s('Family planning', { versionType: 'Pack', versions: ['3 pieces', '12 pieces', '24 pieces'] }), s('Eyewear', { versionType: 'Type', versions: ['Reading', 'Prescription', 'Blue light'] })] },
      { key: 'fitness', label: 'Fitness', versionType: 'Weight', versions: ['5kg', '10kg', '20kg'], specs: ['Brand', 'Weight', 'Material', 'Dimensions', 'Max user weight'], brands: ['Nike', 'Adidas', 'Decathlon', 'Reebok', 'Under Armour'], colours: CLOTHING_COLOURS,
        subcategories: [s('Gym equipment', { versionType: 'Model', versions: [] }), s('Weights', { versions: ['2kg', '5kg', '10kg', '15kg', '20kg', '25kg'] }), s('Yoga', { versionType: 'Thickness', versions: ['4mm', '6mm', '10mm'] }), s('Supplements', { versionType: 'Size', versions: ['1kg', '2kg', '5lb'] }), s('Sportswear', { versionType: 'Size', versions: SIZES })] },
    ],
  },
  {
    label: 'Home & building',
    entries: [
      { key: 'home', label: 'Home & living', versionType: 'Size', versions: SML, specs: ['Material', 'Dimensions', 'Care', 'Pieces in set'], brands: [], colours: CLOTHING_COLOURS,
        subcategories: [s('Bedding', { versions: ['4x6', '5x6', '6x6', '6x7'] }), s('Curtains', { versionType: 'Size', versions: ['1.5m', '2m', '2.5m', '3m'] }), s('Storage'), s('Bathroom'), s('Laundry'), s('Cleaning', { versionType: 'Size', versions: ['500ml', '1L', '5L'] }), s('Mattresses', { versionType: 'Size', versions: ['3x6', '4x6', '5x6', '6x6'], specs: ['Brand', 'Thickness', 'Type', 'Warranty'] })] },
      { key: 'furniture', label: 'Furniture', versionType: 'Size', versions: ['Single', 'Double', 'Queen', 'King'], specs: ['Material', 'Dimensions', 'Finish', 'Assembly', 'Seats', 'Delivery'], brands: [], colours: WOOD_COLOURS,
        subcategories: [s('Beds', { versions: ['3x6', '4x6', '5x6', '6x6'] }), s('Sofas', { versionType: 'Seats', versions: ['3 seater', '5 seater', '7 seater', 'L-shape'] }), s('Tables', { versionType: 'Seats', versions: ['4 seater', '6 seater', '8 seater'] }), s('Chairs', { versionType: 'Set', versions: ['Single', 'Set of 4', 'Set of 6'] }), s('Wardrobes', { versionType: 'Doors', versions: ['2 door', '3 door', '4 door'] }), s('Office furniture', { versionType: 'Size', versions: SML }), s('Outdoor'), s('TV stands', { versionType: 'Width', versions: ['1.2m', '1.5m', '1.8m'] })] },
      { key: 'kitchen', label: 'Kitchen', versionType: 'Size', versions: ['1L', '3L', '5L', '10L'], specs: ['Material', 'Capacity', 'Pieces', 'Dishwasher safe', 'Brand'], brands: ['Tefal', 'Prestige', 'Ramtons', 'Von', 'Nunix', 'Mika', 'Pyrex', 'Tupperware'], colours: CLOTHING_COLOURS,
        subcategories: [s('Cookware', { versionType: 'Set', versions: ['Single', '7 pieces', '12 pieces'] }), s('Cutlery', { versionType: 'Set', versions: ['12 pieces', '24 pieces', '48 pieces'] }), s('Plates & cups', { versionType: 'Set', versions: ['6 pieces', '12 pieces', '24 pieces'] }), s('Small appliances', { versionType: 'Model', versions: [] }), s('Storage'), s('Gas cylinders', { versionType: 'Size', versions: ['6kg', '13kg', '45kg'] }), s('Flasks', { versions: ['1L', '1.8L', '2.5L', '3.5L'] })] },
      { key: 'decor', label: 'Decor & art', versionType: 'Size', versions: SML, specs: ['Material', 'Dimensions', 'Artist', 'Framed', 'Made in'], brands: [], colours: CLOTHING_COLOURS,
        subcategories: [s('Wall art', { versions: ['A4', 'A3', 'A2', 'A1'] }), s('Paintings', { versions: ['40x60cm', '60x90cm', '90x120cm'] }), s('Vases'), s('Rugs & carpets', { versions: ['5x7', '6x9', '8x10'] }), s('Mirrors'), s('Plants', { versionType: 'Pot size', versions: SML }), s('Clocks')] },
      { key: 'lighting', label: 'Lighting', versionType: 'Wattage', versions: ['5W', '9W', '12W', '18W'], specs: ['Wattage', 'Bulb type', 'Voltage', 'Fitting', 'Colour temperature'], brands: ['Philips', 'Osram', 'Tronic', 'Vitron'], colours: [{ name: 'Warm white', hex: '#F6E1B0' }, { name: 'Cool white', hex: '#EAF4FF' }, { name: 'Daylight', hex: '#FFFFFF' }, { name: 'RGB', hex: '#7C3AED' }],
        subcategories: [s('Bulbs', { versionType: 'Pack', versions: ['Single', 'Pack of 4', 'Pack of 10'] }), s('Ceiling lights'), s('Lamps'), s('Outdoor lights'), s('Chandeliers', { versionType: 'Size', versions: SML }), s('LED strips', { versionType: 'Length', versions: ['5m', '10m'] })] },
      { key: 'garden', label: 'Garden & outdoor', versionType: 'Size', versions: SML, specs: ['Material', 'Dimensions', 'Capacity', 'Brand'], brands: ['Crestank', 'Roto', 'Nice House of Plastics'], colours: CLOTHING_COLOURS,
        subcategories: [s('Garden tools'), s('Seeds & plants', { versionType: 'Pack', versions: [] }), s('Outdoor furniture'), s('Water tanks', { versionType: 'Capacity', versions: ['500L', '1000L', '2000L', '5000L', '10000L'] }), s('Pots'), s('Pumps', { versionType: 'Power', versions: ['0.5HP', '1HP', '2HP'] })] },
      { key: 'tools', label: 'Tools & hardware', versionType: 'Size', versions: [], specs: ['Brand', 'Power source', 'Voltage', 'Warranty', 'Pieces'], brands: ['Bosch', 'Makita', 'DeWalt', 'Stanley', 'Total', 'Ingco', 'Black+Decker'], colours: [],
        subcategories: [s('Power tools', { versionType: 'Model', versions: [] }), s('Hand tools', { versionType: 'Set', versions: ['Single', 'Set'] }), s('Plumbing', { versionType: 'Size', versions: ['1/2"', '3/4"', '1"', '2"'] }), s('Electrical'), s('Paint', { versionType: 'Size', versions: ['1L', '4L', '20L'] }), s('Locks & security', { versionType: 'Model', versions: [] }), s('Ladders', { versionType: 'Length', versions: ['3m', '5m', '7m'] })] },
      { key: 'building', label: 'Building materials', versionType: 'Size', versions: [], specs: ['Grade', 'Size', 'Sold per', 'Brand', 'Delivery'], brands: ['Hima', 'Tororo', 'Simba', 'Roofings', 'Uganda Baati', 'Steel & Tube', 'Goodwill', 'Kajjansi'], colours: CAR_PAINT,
        subcategories: [s('Cement', { versionType: 'Bag', versions: ['50kg'] }), s('Iron sheets', { versionType: 'Gauge', versions: ['Gauge 28', 'Gauge 30', 'Gauge 32'] }), s('Tiles', { versionType: 'Size', versions: ['30x30', '40x40', '60x60', '30x60'] }), s('Timber', { versionType: 'Size', versions: ['2x2', '2x4', '2x6', '4x4'] }), s('Doors & windows', { versionType: 'Size', versions: ['0.9m', '1.0m', '1.2m'] }), s('Steel bars', { versionType: 'Size', versions: ['Y8', 'Y10', 'Y12', 'Y16', 'Y20'] }), s('Sand & aggregate', { versionType: 'Load', versions: ['Elf', '7 tonne', '14 tonne'] }), s('Bricks & blocks', { versionType: 'Per', versions: ['Per piece', 'Per 100', 'Per 1000'] })] },
    ],
  },
  {
    label: 'Food & drink',
    entries: [
      { key: 'groceries', label: 'Groceries', versionType: 'Pack size', versions: PACKS, specs: ['Brand', 'Weight', 'Expiry', 'Origin', 'Halal'], brands: GROCERY_BRANDS, colours: [],
        subcategories: [s('Rice & grains', { versions: BIG_PACKS }), s('Flour & posho', { versions: BIG_PACKS }), s('Sugar & salt', { versions: ['500g', '1kg', '2kg', '5kg', '50kg'] }), s('Cooking oil', { versionType: 'Size', versions: LIQUIDS }), s('Beans & pulses', { versions: BIG_PACKS }), s('Spices', { versions: ['50g', '100g', '250g', '500g'] }), s('Snacks', { versionType: 'Pack', versions: ['Single', 'Pack of 6', 'Pack of 12'] }), s('Tinned food', { versionType: 'Pack', versions: ['Single', 'Pack of 6', 'Carton'] }), s('Baby food', { versions: ['400g', '900g'] })] },
      { key: 'fresh', label: 'Fresh produce & meat', versionType: 'Weight', versions: ['1kg', '2kg', '5kg'], specs: ['Origin', 'Harvested', 'Storage', 'Delivery days', 'Organic'], brands: [], colours: [],
        subcategories: [s('Fruits'), s('Vegetables', { versions: ['500g', '1kg', '2kg', 'Bunch'] }), s('Matooke', { versionType: 'Size', versions: ['Small bunch', 'Medium bunch', 'Large bunch'] }), s('Meat', { versions: ['500g', '1kg', '2kg', '5kg'] }), s('Chicken', { versionType: 'Type', versions: ['Whole broiler', 'Whole local', 'Per kg', 'Live'] }), s('Fish', { versionType: 'Size', versions: ['Small', 'Medium', 'Large', 'Per kg'] }), s('Eggs', { versionType: 'Tray', versions: ['Half tray', 'Tray of 30', '5 trays'] }), s('Dairy', { versionType: 'Size', versions: ['500ml', '1L', '2L', '5L'] })] },
      { key: 'drinks', label: 'Drinks', versionType: 'Size', versions: ['330ml', '500ml', '1L', '2L', 'Crate'], specs: ['Brand', 'Volume', 'Alcohol %', 'Pack', 'Chilled'], brands: ['Rwenzori', 'Coca-Cola', 'Pepsi', 'Nile', 'Bell', 'Tusker', 'Uganda Waragi', 'Minute Maid', 'Splash', 'Riham'], colours: [],
        subcategories: [s('Water', { versions: ['500ml', '1L', '1.5L', '5L', '20L', 'Carton'] }), s('Soda', { versions: ['300ml', '500ml', '1L', '2L', 'Crate'] }), s('Juice', { versions: ['250ml', '500ml', '1L', '2L'] }), s('Beer', { versionType: 'Pack', versions: ['Bottle', '6 pack', 'Crate'] }), s('Wine & spirits', { versions: ['250ml', '375ml', '750ml', '1L'] }), s('Tea & coffee', { versions: ['100g', '250g', '500g', '1kg'] }), s('Energy drinks', { versionType: 'Pack', versions: ['Single', 'Pack of 6', 'Carton'] })] },
      { key: 'bakery', label: 'Bakery & sweets', versionType: 'Size', versions: SML, specs: ['Flavour', 'Serves', 'Ingredients', 'Allergens', 'Order notice (days)'], brands: [], colours: [],
        subcategories: [s('Cakes', { versionType: 'Size', versions: ['1kg', '2kg', '3kg', '5kg', 'Tiered'] }), s('Bread', { versionType: 'Size', versions: ['Small', 'Large', 'Family'] }), s('Pastries', { versionType: 'Pack', versions: ['Single', 'Box of 6', 'Box of 12'] }), s('Cookies', { versionType: 'Pack', versions: ['Box of 6', 'Box of 12', 'Box of 24'] }), s('Chocolate', { versionType: 'Size', versions: ['50g', '100g', '200g', 'Gift box'] }), s('Wedding cakes', { versionType: 'Tiers', versions: ['2 tier', '3 tier', '4 tier', '5 tier'] }), s('Cupcakes', { versionType: 'Pack', versions: ['Box of 6', 'Box of 12'] })] },
      { key: 'ready-food', label: 'Ready meals & catering', versionType: 'Portion', versions: ['Single', 'Family', 'Party'], specs: ['Serves', 'Ingredients', 'Allergens', 'Order notice', 'Delivery area', 'Hot or cold'], brands: [], colours: [],
        subcategories: [s('Lunch boxes', { versionType: 'Size', versions: ['Regular', 'Large'] }), s('Rolex & street food', { versionType: 'Size', versions: ['Single', 'Double', 'Special'] }), s('Catering', { versionType: 'Guests', versions: ['20 guests', '50 guests', '100 guests', '200 guests'], specs: ['Menu', 'Serves', 'Order notice', 'Area covered', 'Includes service'] }), s('Frozen meals', { versionType: 'Pack', versions: ['Single', 'Pack of 5'] }), s('Special diets'), s('Drinks & juices', { versionType: 'Size', versions: ['500ml', '1L', '2L', '5L'] })] },
    ],
  },
  {
    label: 'Baby & kids',
    entries: [
      { key: 'baby', label: 'Baby', versionType: 'Size', versions: ['Newborn', 'S', 'M', 'L', 'XL', 'XXL'], specs: ['Age range', 'Material', 'Brand', 'Pieces'], brands: ['Pampers', 'Huggies', 'Softcare', 'Molfix', 'Johnson\'s', 'Cussons', 'Chicco', 'Philips Avent'], colours: CLOTHING_COLOURS,
        subcategories: [s('Diapers & wipes', { versionType: 'Size', versions: ['Newborn', 'S', 'M', 'L', 'XL', 'XXL'] }), s('Feeding', { versionType: 'Size', versions: ['125ml', '250ml', '330ml'] }), s('Baby care', { versionType: 'Size', versions: ['100ml', '200ml', '500ml'] }), s('Prams & carriers', { versionType: 'Model', versions: [] }), s('Cots & bedding', { versionType: 'Size', versions: SML }), s('Baby clothes', { versionType: 'Age', versions: ['0-3m', '3-6m', '6-12m', '12-18m', '18-24m'] }), s('Formula', { versionType: 'Size', versions: ['400g', '900g', '1.8kg'] })] },
      { key: 'toys', label: 'Toys & games', versionType: 'Age', versions: ['0-2y', '3-5y', '6-9y', '10+'], specs: ['Age range', 'Material', 'Batteries', 'Pieces', 'Brand'], brands: ['LEGO', 'Fisher-Price', 'Barbie', 'Hot Wheels', 'Nerf', 'Hasbro'], colours: CLOTHING_COLOURS,
        subcategories: [s('Educational toys'), s('Dolls'), s('Cars & trucks', { versionType: 'Type', versions: ['Battery', 'Remote control', 'Push'] }), s('Board games', { versionType: 'Players', versions: ['2 players', '2-4 players', '4+ players'] }), s('Outdoor play', { versionType: 'Size', versions: SML }), s('Puzzles', { versionType: 'Pieces', versions: ['100', '500', '1000'] }), s('Ride-ons', { versionType: 'Type', versions: ['Push', 'Pedal', 'Electric'] })] },
    ],
  },
  {
    label: 'Business, farm & services',
    entries: [
      { key: 'agriculture', label: 'Farm inputs & produce', versionType: 'Pack size', versions: BIG_PACKS, specs: ['Brand', 'Weight', 'Application', 'Expiry', 'Certified'], brands: ['NASECO', 'Victoria Seeds', 'FICA', 'Yara', 'Bukoola', 'Osho'], colours: [],
        subcategories: [s('Seeds', { versions: ['100g', '500g', '1kg', '2kg', '10kg'] }), s('Fertiliser', { versions: ['1kg', '5kg', '25kg', '50kg'] }), s('Animal feed', { versions: ['10kg', '25kg', '50kg', '70kg'] }), s('Pesticides', { versionType: 'Size', versions: ['100ml', '250ml', '500ml', '1L', '5L'] }), s('Farm tools', { versionType: 'Size', versions: [] }), s('Irrigation', { versionType: 'Coverage', versions: ['1/4 acre', '1/2 acre', '1 acre'] }), s('Harvest', { versions: ['Per kg', '50kg bag', '100kg bag', 'Per tonne'] }), s('Coffee & cocoa', { versions: ['1kg', '50kg bag', 'Per tonne'] })] },
      { key: 'livestock', label: 'Livestock & poultry', versionType: 'Age', versions: ['Day old', '1 month', '3 months', 'Mature'], specs: ['Breed', 'Age', 'Weight', 'Vaccinated', 'Sex', 'Location'], brands: [], colours: [],
        subcategories: [s('Chicken', { versionType: 'Type', versions: ['Day old chicks', 'Layers', 'Broilers', 'Local', 'Kuroiler'] }), s('Goats', { versionType: 'Type', versions: ['Kid', 'Doe', 'Buck', 'Boer'] }), s('Cattle', { versionType: 'Type', versions: ['Calf', 'Heifer', 'Cow', 'Bull', 'Friesian'] }), s('Pigs', { versionType: 'Type', versions: ['Piglet', 'Sow', 'Boar'] }), s('Rabbits'), s('Fish farming', { versionType: 'Type', versions: ['Fingerlings', 'Table size'] }), s('Bee keeping', { versionType: 'Item', versions: ['Hive', 'Colony', 'Honey 1kg', 'Honey 5kg'] })] },
      { key: 'office', label: 'Office & stationery', versionType: 'Pack', versions: ['1 piece', 'Pack of 10', 'Box'], specs: ['Brand', 'Pack', 'Size', 'Colour', 'Pages'], brands: ['Picfare', 'Bic', 'Staedtler', 'Double A', 'HP', 'Canon', 'Epson'], colours: CLOTHING_COLOURS,
        subcategories: [s('Paper', { versionType: 'Pack', versions: ['Ream', 'Box of 5 reams', 'Box of 10 reams'] }), s('Pens & pencils', { versionType: 'Pack', versions: ['Single', 'Pack of 12', 'Box of 50'] }), s('Notebooks', { versionType: 'Pages', versions: ['48 pages', '96 pages', '120 pages', '200 pages'] }), s('Printing & ink', { versionType: 'Model', versions: [] }), s('Office furniture', { versionType: 'Size', versions: SML }), s('School supplies', { versionType: 'Pack', versions: ['Single', 'Full set'] }), s('Printing service', { versionType: 'Pages', versions: ['1-50 pages', '50-500 pages', '500+ pages'], specs: SERVICE_SPECS })] },
      { key: 'industrial', label: 'Industrial & equipment', versionType: 'Model', versions: [], specs: ['Brand', 'Model', 'Power', 'Capacity', 'Warranty', 'Condition', 'Installation'], brands: [], colours: [],
        subcategories: [s('Machinery'), s('Welding', { versionType: 'Amps', versions: ['200A', '250A', '300A', '400A'] }), s('Safety gear', { versionType: 'Size', versions: SIZES }), s('Packaging', { versionType: 'Pack', versions: ['100 pieces', '500 pieces', '1000 pieces'] }), s('Salon equipment'), s('Restaurant equipment'), s('Bakery equipment'), s('Agro processing', { versionType: 'Capacity', versions: ['100kg/hr', '500kg/hr', '1 tonne/hr'] })] },
      { key: 'services', label: 'Services', versionType: 'Package', versions: ['Basic', 'Standard', 'Premium'], specs: SERVICE_SPECS, brands: [], colours: [],
        subcategories: [s('Repairs', { versionType: 'Job', versions: ['Diagnosis', 'Minor repair', 'Major repair'] }), s('Cleaning', { versionType: 'Size', versions: ['1 bedroom', '2 bedroom', '3 bedroom', 'Office'] }), s('Tailoring', { versionType: 'Item', versions: ['Shirt', 'Dress', 'Suit', 'Gomesi', 'Kanzu'] }), s('Printing & branding', { versionType: 'Quantity', versions: ['1-10', '10-100', '100+'] }), s('Photography', { versionType: 'Package', versions: ['Half day', 'Full day', 'Event'] }), s('Tutoring', { versionType: 'Sessions', versions: ['Per hour', '5 sessions', '10 sessions'] }), s('Transport', { versionType: 'Trip', versions: ['Within town', 'Upcountry', 'Per day'] }), s('Beauty at home', { versionType: 'Service', versions: ['Hair', 'Nails', 'Makeup', 'Full package'] }), s('Plumbing & electrical', { versionType: 'Job', versions: ['Call out', 'Small job', 'Full install'] }), s('Web & IT', { versionType: 'Package', versions: ['Basic', 'Standard', 'Premium'] })] },
      { key: 'property', label: 'Property & rentals', versionType: 'Type', versions: ['Single room', '1 bedroom', '2 bedroom', '3 bedroom'], specs: ['Bedrooms', 'Bathrooms', 'Size', 'Location', 'Rent period', 'Furnished', 'Parking', 'Land title', 'Water & power'], brands: [], colours: [],
        subcategories: [s('Houses for rent'), s('Houses for sale', { versionType: 'Bedrooms', versions: ['2 bedroom', '3 bedroom', '4 bedroom', '5+ bedroom'] }), s('Land', { versionType: 'Size', versions: ['50x100', '100x100', '1 acre', '5 acres'], specs: ['Size', 'Location', 'Land title', 'Access road', 'Distance from tarmac'] }), s('Shops & offices', { versionType: 'Size', versions: ['Small', 'Medium', 'Large'] }), s('Hostels', { versionType: 'Room', versions: ['Single', 'Double', 'Self-contained'] }), s('Short stays', { versionType: 'Stay', versions: ['Per night', 'Per week', 'Per month'] }), s('Warehouses', { versionType: 'Size', versions: ['100 sqm', '500 sqm', '1000 sqm'] })] },
    ],
  },
  {
    label: 'Leisure & more',
    entries: [
      { key: 'books', label: 'Books & education', versionType: 'Format', versions: ['Paperback', 'Hardcover'], specs: ['Author', 'Publisher', 'Year', 'Pages', 'Language', 'ISBN', 'Condition'], brands: ['Longhorn', 'Fountain', 'MK Publishers', 'Oxford', 'Pearson', 'Penguin'], colours: [],
        subcategories: [s('Textbooks', { versionType: 'Class', versions: ['P1-P3', 'P4-P7', 'S1-S4', 'S5-S6', 'University'] }), s('Novels'), s('Children\'s books', { versionType: 'Age', versions: ['0-3y', '4-7y', '8-12y'] }), s('Religious'), s('Past papers', { versionType: 'Level', versions: ['PLE', 'UCE', 'UACE'] }), s('Courses', { versionType: 'Access', versions: ['1 month', '6 months', 'Lifetime'] }), s('Stationery sets')] },
      { key: 'sports', label: 'Sports & outdoors', versionType: 'Size', versions: SIZES, specs: ['Brand', 'Material', 'Size', 'Team or season', 'Official'], brands: SHOE_BRANDS, colours: CLOTHING_COLOURS,
        subcategories: [s('Football', { versionType: 'Size', versions: ['Size 3', 'Size 4', 'Size 5'] }), s('Jerseys'), s('Running', { versionType: 'Size', versions: SHOE_SIZES }), s('Cycling'), s('Camping', { versionType: 'Persons', versions: ['2 person', '4 person', '6 person'] }), s('Swimming'), s('Boxing & gym', { versionType: 'Weight', versions: ['8oz', '10oz', '12oz', '14oz', '16oz'] })] },
      { key: 'music', label: 'Music & instruments', versionType: 'Size', versions: [], specs: ['Brand', 'Model', 'Type', 'Accessories included', 'Condition'], brands: ['Yamaha', 'Casio', 'Fender', 'Gibson', 'Roland', 'Pioneer', 'Shure', 'Behringer'], colours: WOOD_COLOURS,
        subcategories: [s('Guitars', { versionType: 'Type', versions: ['Acoustic', 'Electric', 'Bass', 'Classical'] }), s('Keyboards', { versionType: 'Keys', versions: ['49 keys', '61 keys', '76 keys', '88 keys'] }), s('Drums', { versionType: 'Type', versions: ['Acoustic', 'Electronic', 'African'] }), s('DJ equipment', { versionType: 'Model', versions: [] }), s('Microphones', { versionType: 'Type', versions: ['Wired', 'Wireless', 'Studio'] }), s('Amplifiers', { versionType: 'Power', versions: ['100W', '300W', '500W', '1000W'] }), s('Speakers & PA', { versionType: 'Size', versions: ['8"', '10"', '12"', '15"', '18"'] })] },
      { key: 'crafts', label: 'Crafts & handmade', versionType: 'Size', versions: SML, specs: ['Material', 'Dimensions', 'Made in', 'Made by', 'Custom orders'], brands: [], colours: CLOTHING_COLOURS,
        subcategories: [s('Baskets'), s('Beadwork'), s('Bark cloth', { versionType: 'Size', versions: ['1m', '2m', '4m'] }), s('Pottery'), s('Woodwork'), s('Gifts'), s('Candles & soap', { versionType: 'Size', versions: ['100g', '200g', '500g'] })] },
      { key: 'pets', label: 'Pets & supplies', versionType: 'Size', versions: SML, specs: ['Breed', 'Age', 'Weight', 'Vaccinated', 'Brand'], brands: ['Pedigree', 'Whiskas', 'Royal Canin', 'Josera'], colours: [],
        subcategories: [s('Dogs', { versionType: 'Age', versions: ['Puppy', 'Adult'] }), s('Cats', { versionType: 'Age', versions: ['Kitten', 'Adult'] }), s('Pet food', { versionType: 'Pack size', versions: ['1kg', '3kg', '10kg', '20kg'] }), s('Cages & beds', { versionType: 'Size', versions: SML }), s('Grooming'), s('Birds'), s('Aquariums', { versionType: 'Size', versions: ['20L', '50L', '100L', '200L'] })] },
      { key: 'events', label: 'Events & party', versionType: 'Package', versions: ['Basic', 'Standard', 'Premium'], specs: ['What is included', 'Capacity', 'Duration', 'Area covered', 'Setup included'], brands: [], colours: CLOTHING_COLOURS,
        subcategories: [s('Decor', { versionType: 'Guests', versions: ['50 guests', '100 guests', '200 guests', '500 guests'] }), s('Tents & chairs', { versionType: 'Seats', versions: ['50 seater', '100 seater', '200 seater', '500 seater'] }), s('Sound & lighting', { versionType: 'Package', versions: ['Basic', 'Standard', 'Premium'] }), s('Gifts', { versionType: 'Size', versions: SML }), s('Invitations', { versionType: 'Quantity', versions: ['50', '100', '200', '500'] }), s('Costumes', { versionType: 'Size', versions: SIZES }), s('Photo booth', { versionType: 'Hours', versions: ['2 hours', '4 hours', 'Full event'] })] },
      { key: 'general', label: 'Everything else', versionType: 'Option', versions: [], specs: ['Brand', 'Size', 'Material', 'Condition'], brands: [], colours: [], subcategories: [] },
    ],
  },
];

export const CATEGORY_ENTRIES: CategoryEntry[] = CATEGORY_GROUPS.flatMap((g) => g.entries);

const BY_KEY = new Map(CATEGORY_ENTRIES.map((e) => [e.key, e]));

export function categoryEntry(key: string): CategoryEntry {
  return BY_KEY.get(key) ?? { key, label: key.charAt(0).toUpperCase() + key.slice(1), versionType: 'Option', versions: [], specs: [], brands: [], colours: [], subcategories: [] };
}

const BRAND_COLOURS: { match: RegExp; title: string; colours: Swatch[] }[] = [
  { match: /apple|iphone|ipad|macbook|airpods/i, title: 'Apple colours', colours: APPLE_COLOURS },
  { match: /samsung|galaxy/i, title: 'Samsung colours', colours: SAMSUNG_COLOURS },
  { match: /tecno|infinix|itel|xiaomi|redmi|oppo|vivo|huawei|realme|oneplus|nokia|google|pixel|motorola/i, title: 'Common phone colours', colours: ANDROID_COLOURS },
];

const PHONE_LIKE = new Set(['phones', 'computers', 'gaming', 'electronics', 'tv-audio', 'cameras']);

export function resolveOptions(categoryKey: string, subcategory: string, brand: string): ResolvedOptions {
  const entry = categoryEntry(categoryKey);
  const wanted = subcategory.trim().toLowerCase();
  const sub = wanted ? entry.subcategories.find((x) => x.name.toLowerCase() === wanted) : undefined;
  let colours = sub?.colours ?? entry.colours;
  let colourTitle = colours.length ? `${sub?.name ?? entry.label} colours` : '';
  if (PHONE_LIKE.has(entry.key)) {
    const byBrand = BRAND_COLOURS.find((b) => b.match.test(brand));
    if (byBrand) {
      colours = byBrand.colours;
      colourTitle = byBrand.title;
    } else if (entry.key === 'phones') {
      colours = ANDROID_COLOURS;
      colourTitle = 'Common phone colours';
    }
  }
  return {
    versionType: sub?.versionType ?? entry.versionType,
    versions: sub?.versions ?? entry.versions,
    specs: sub?.specs ?? entry.specs,
    brands: entry.brands,
    colours,
    colourTitle,
  };
}
