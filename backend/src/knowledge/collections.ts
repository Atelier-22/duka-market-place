export interface GroupedOptionSet {
  category: string;
  kind: string;
  attribute: string;
  groupAttribute: string;
  groups: { label: string; values: string[] }[];
  extras: { attribute: string; values: string[]; required?: boolean }[];
  synonyms: string[];
}

export const GROUPED_BY: Record<string, string> = { club: 'league' };

export const JERSEYS: GroupedOptionSet = {
  category: 'sports',
  kind: 'Jerseys',
  attribute: 'Club',
  groupAttribute: 'League',
  synonyms: ['jersey', 'football jersey', 'football shirt', 'kit', 'football kit', 'team shirt', 'replica shirt'],
  extras: [
    { attribute: 'Kit', values: ['Home', 'Away', 'Third', 'Goalkeeper', 'Training'] },
    { attribute: 'Season', values: ['2025/26', '2024/25', '2023/24', '2022/23', 'Retro'] },
  ],
  groups: [
    { label: 'Premier League', values: ['Arsenal', 'Aston Villa', 'Bournemouth', 'Brentford', 'Brighton & Hove Albion', 'Burnley', 'Chelsea', 'Crystal Palace', 'Everton', 'Fulham', 'Leeds United', 'Liverpool', 'Manchester City', 'Manchester United', 'Newcastle United', 'Nottingham Forest', 'Sunderland', 'Tottenham Hotspur', 'West Ham United', 'Wolverhampton Wanderers'] },
    { label: 'La Liga', values: ['Real Madrid', 'Barcelona', 'Atlético Madrid', 'Athletic Club', 'Real Sociedad', 'Villarreal', 'Real Betis', 'Sevilla', 'Valencia', 'Celta Vigo', 'Osasuna', 'Getafe', 'Girona', 'Rayo Vallecano', 'Mallorca', 'Alavés', 'Espanyol', 'Levante', 'Elche', 'Real Oviedo'] },
    { label: 'Serie A', values: ['Inter', 'AC Milan', 'Juventus', 'Napoli', 'Roma', 'Lazio', 'Atalanta', 'Fiorentina', 'Bologna', 'Torino', 'Udinese', 'Genoa', 'Como', 'Parma', 'Cagliari', 'Lecce', 'Hellas Verona', 'Sassuolo', 'Pisa', 'Cremonese'] },
    { label: 'Bundesliga', values: ['Bayern Munich', 'Borussia Dortmund', 'Bayer Leverkusen', 'RB Leipzig', 'Eintracht Frankfurt', 'VfB Stuttgart', 'Borussia Mönchengladbach', 'SC Freiburg', 'VfL Wolfsburg', 'Mainz 05', 'Werder Bremen', 'FC Augsburg', 'Union Berlin', 'TSG Hoffenheim', 'FC St. Pauli', '1. FC Heidenheim', 'Hamburger SV', '1. FC Köln'] },
    { label: 'Ligue 1', values: ['Paris Saint-Germain', 'Marseille', 'Lyon', 'Monaco', 'Lille', 'Nice', 'Lens', 'Rennes', 'Strasbourg', 'Toulouse', 'Nantes', 'Brest', 'Auxerre', 'Angers', 'Le Havre', 'Lorient', 'Metz', 'Paris FC'] },
    { label: 'Uganda Premier League', values: ['Vipers SC', 'KCCA FC', 'SC Villa', 'URA FC', 'Express FC', 'BUL FC', 'Kitara FC', 'Bright Stars FC', 'Wakiso Giants FC', 'Maroons FC', 'UPDF FC', 'Gaddafi FC', 'NEC FC', 'Police FC', 'Mbarara City FC', 'Busoga United FC'] },
    { label: 'Saudi Pro League', values: ['Al-Nassr', 'Al-Hilal', 'Al-Ittihad', 'Al-Ahli', 'Al-Shabab', 'Al-Ettifaq'] },
    { label: 'MLS', values: ['Inter Miami', 'LA Galaxy', 'LAFC', 'Atlanta United', 'Seattle Sounders', 'New York City FC'] },
    { label: 'Other European clubs', values: ['Ajax', 'PSV Eindhoven', 'Feyenoord', 'Benfica', 'Porto', 'Sporting CP', 'Celtic', 'Rangers', 'Galatasaray', 'Fenerbahçe'] },
    { label: 'African clubs', values: ['Al Ahly', 'Zamalek', 'Wydad Casablanca', 'Raja Casablanca', 'Mamelodi Sundowns', 'Kaizer Chiefs', 'Orlando Pirates', 'Espérance de Tunis', 'TP Mazembe', 'Simba SC', 'Yanga SC', 'Gor Mahia', 'AFC Leopards'] },
    { label: 'National teams', values: ['Uganda', 'Kenya', 'Tanzania', 'Rwanda', 'South Sudan', 'DR Congo', 'Nigeria', 'Ghana', 'Senegal', 'Ivory Coast', 'Cameroon', 'Morocco', 'Egypt', 'Algeria', 'South Africa', 'Argentina', 'Brazil', 'France', 'England', 'Germany', 'Spain', 'Portugal', 'Netherlands', 'Italy', 'Belgium', 'Croatia', 'USA', 'Japan'] },
  ],
};

export const GROUPED_SETS: GroupedOptionSet[] = [JERSEYS];

export interface EverydayKind { category: string; name: string; versionType?: string; versions?: string[]; specs?: string[]; synonyms?: string[] }

export const EVERYDAY_KINDS: EverydayKind[] = [
  { category: 'home', name: 'Towels', versionType: 'Size', versions: ['Face towel', 'Hand towel', 'Bath towel', 'Bath sheet', 'Beach towel'], specs: ['Material', 'Pieces in set'], synonyms: ['towel', 'bath towel'] },
  { category: 'home', name: 'Pillows & cushions', versionType: 'Size', versions: ['Standard', 'King', 'Cushion 40cm', 'Cushion 50cm'], specs: ['Material', 'Pieces in set'], synonyms: ['pillow', 'cushion'] },
  { category: 'kitchen', name: 'Knives', versionType: 'Type', versions: ["Chef's knife", 'Bread knife', 'Paring knife', 'Cleaver', 'Knife set'], specs: ['Material', 'Pieces', 'Brand'], synonyms: ['knife', 'kitchen knife'] },
  { category: 'kitchen', name: 'Utensils', versionType: 'Set', versions: ['Single', 'Set of 5', 'Set of 10'], specs: ['Material', 'Pieces'], synonyms: ['utensil', 'ladle', 'spatula', 'kitchen tools'] },
  { category: 'kitchen', name: 'Water bottles & jugs', versionType: 'Size', versions: ['500ml', '750ml', '1L', '2L'], specs: ['Material'], synonyms: ['bottle', 'jug', 'water bottle'] },
  { category: 'office', name: 'Pens & pencils', specs: ['Brand', 'Ink colour', 'Type'], synonyms: ['pen', 'pens', 'biro', 'ballpoint', 'pencil'] },
  { category: 'office', name: 'Printing & ink', specs: ['Brand', 'Fits model', 'Type', 'Colour'], synonyms: ['ink', 'toner', 'cartridge', 'printing ink', 'printer ink'] },
  { category: 'mens', name: 'Handkerchiefs', versionType: 'Pack', versions: ['Single', 'Pack of 3', 'Pack of 6', 'Pack of 12'], specs: ['Material'], synonyms: ['handkerchief', 'hanky'] },
  { category: 'beauty', name: 'Soap', versionType: 'Size', versions: ['100g', '150g', '250g', '500g', '1kg', 'Pack of 3'], specs: ['Type', 'Skin type', 'Key ingredients', 'Brand'], synonyms: ['bar soap', 'bathing soap', 'liquid soap'] },
  { category: 'home', name: 'Cleaning', versionType: 'Size', versions: ['500g', '1kg', '2kg', '5kg'], specs: ['Type', 'Brand'], synonyms: ['detergent', 'washing powder', 'omo', 'bleach', 'jik', 'cleaning products', 'soap powder'] },
  { category: 'groceries', name: 'Cooking oil', versionType: 'Size', versions: ['500ml', '1L', '2L', '3L', '5L', '10L', '20L'], specs: ['Brand', 'Type', 'Expiry'], synonyms: ['oil', 'frying oil', 'sunflower oil', 'vegetable oil'] },
  { category: 'groceries', name: 'Sugar & salt', versionType: 'Pack size', versions: ['10kg', '25kg'], specs: ['Brand', 'Type'], synonyms: ['sugar', 'salt'] },
  { category: 'groceries', name: 'Flour & posho', specs: ['Brand', 'Type'], synonyms: ['flour', 'posho', 'maize flour', 'wheat flour', 'cassava flour'] },
  { category: 'groceries', name: 'Milk & dairy', versionType: 'Size', versions: ['250ml', '500ml', '1L', '2L', '5L'], specs: ['Brand', 'Type', 'Expiry'], synonyms: ['milk', 'yoghurt', 'butter', 'cheese'] },
  { category: 'kitchen', name: 'Cookware', specs: ['Brand'], synonyms: ['saucepan', 'pan', 'pot', 'pots', 'sufuria', 'pots and pans'] },
  { category: 'home', name: 'Baskets & bins', versionType: 'Size', versions: ['Small', 'Medium', 'Large'], specs: ['Material'], synonyms: ['basket', 'laundry basket', 'dustbin', 'bin'] },
  { category: 'furniture', name: 'Shelves & racks', versionType: 'Size', versions: ['3 tier', '4 tier', '5 tier'], specs: ['Material', 'Dimensions'], synonyms: ['shelf', 'rack', 'shoe rack', 'bookshelf'] },
  { category: 'fashion', name: 'Socks', versionType: 'Pack', versions: ['Single pair', 'Pack of 3', 'Pack of 6', 'Pack of 12'], specs: ['Material'], synonyms: ['sock', 'socks'] },
  { category: 'fashion', name: 'Caps & hats', versionType: 'Size', versions: ['One size', 'S/M', 'L/XL'], specs: ['Material'], synonyms: ['cap', 'hat', 'beanie'] },
  { category: 'phones', name: 'Phone accessories', versionType: 'Type', versions: ['Case', 'Charger', 'Cable', 'Screen protector', 'Holder', 'Earphones'], specs: ['Fits model', 'Brand'], synonyms: ['accessory', 'accessories', 'phone case', 'pouch'] },
  { category: 'baby', name: 'Toys & rattles', versionType: 'Age', versions: ['0-6m', '6-12m', '1-2y', '2-4y'], specs: ['Material'], synonyms: ['rattle', 'teether'] },
  { category: 'agriculture', name: 'Eggs & poultry products', versionType: 'Tray', versions: ['Half tray', 'Tray of 30', '5 trays', '10 trays'], specs: ['Type'], synonyms: ['egg', 'eggs'] },
];

export const NAME_EXAMPLES = [
  'Samsung', 'iPhone 13', 'fridge', 'cooking oil', 'Manchester United jersey', 'sofa', 'Toyota Harrier', 'trousers', 'MacBook Air', 'towels', 'PlayStation 5', 'knives',
  'Nike Air Force 1', 'washing machine', 'Galaxy A16', 'school shoes', 'sugar 50kg', 'Boxer BM 150', 'wig', 'gas cylinder', 'earphones', 'bed 5x6', 'Pixel 9', 'soap',
];
