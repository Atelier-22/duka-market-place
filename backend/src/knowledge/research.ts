import { query, queryOne } from '../db/pool';
import { CanonicalProductRow, recordSource } from './canonical';

export interface ExtractedSpec { key: string; label: string; value: string; unit: string | null }

const MANUFACTURERS: Record<string, string[]> = {
  apple: ['apple.com'], samsung: ['samsung.com'], tecno: ['tecno-mobile.com'], infinix: ['infinixmobility.com'], itel: ['itel-life.com'], xiaomi: ['mi.com', 'xiaomi.com'],
  redmi: ['mi.com'], oppo: ['oppo.com'], vivo: ['vivo.com'], huawei: ['huawei.com', 'consumer.huawei.com'], nokia: ['nokia.com', 'hmd.com'], google: ['store.google.com', 'google.com'],
  oneplus: ['oneplus.com'], realme: ['realme.com'], motorola: ['motorola.com'], hp: ['hp.com'], dell: ['dell.com'], lenovo: ['lenovo.com'], asus: ['asus.com'], acer: ['acer.com'],
  microsoft: ['microsoft.com'], sony: ['sony.com', 'sony.co.uk'], lg: ['lg.com'], hisense: ['hisense.com', 'hisense-usa.com'], tcl: ['tcl.com'], canon: ['canon.com', 'usa.canon.com'],
  nikon: ['nikon.com', 'nikonusa.com'], dji: ['dji.com'], gopro: ['gopro.com'], toyota: ['toyota.com', 'toyota-global.com', 'toyota.co.jp'], nissan: ['nissan-global.com', 'nissanusa.com'],
  honda: ['honda.com', 'global.honda'], subaru: ['subaru.com', 'subaru-global.com'], mitsubishi: ['mitsubishi-motors.com'], mazda: ['mazda.com', 'mazdausa.com'], suzuki: ['globalsuzuki.com', 'suzuki.com'],
  isuzu: ['isuzu.com', 'isuzu.co.jp'], 'mercedes-benz': ['mercedes-benz.com'], bmw: ['bmw.com'], audi: ['audi.com'], volkswagen: ['vw.com', 'volkswagen.com'], 'land-rover': ['landrover.com'],
  hyundai: ['hyundai.com'], kia: ['kia.com'], ford: ['ford.com'], lexus: ['lexus.com'], bajaj: ['bajajauto.com'], tvs: ['tvsmotor.com'], yamaha: ['yamaha-motor.com'],
  bosch: ['bosch.com', 'bosch-home.com'], beko: ['beko.com'], jbl: ['jbl.com'], bose: ['bose.com'], nike: ['nike.com'], adidas: ['adidas.com'],
};

const RETAILERS = ['gsmarena.com', 'phonearena.com', 'notebookcheck.net', 'amazon.com', 'amazon.co.uk', 'bestbuy.com', 'jumia.ug', 'jumia.co.ke', 'jumia.com.ng', 'kilimall.co.ke',
  'displayspecifications.com', 'techradar.com', 'gadgets360.com', 'cnet.com', 'rtings.com', 'currys.co.uk', 'argos.co.uk', 'walmart.com', 'cars.com', 'autotrader.com', 'edmunds.com',
  'carsguide.com.au', 'be-forward.jp', 'sbtjapan.com', 'jiji.ug', 'jiji.co.ke', 'kikuu.com', 'dealsonline.ug'];

export function trustTier(url: string, brandSlug: string): { type: 'manufacturer' | 'retailer' | 'unknown'; tier: 1 | 2 | 3 } {
  let host = '';
  try { host = new URL(url).hostname.toLowerCase().replace(/^www\./, ''); } catch { return { type: 'unknown', tier: 3 }; }
  const domains = MANUFACTURERS[brandSlug] ?? [];
  if (domains.some((d) => host === d || host.endsWith(`.${d}`))) return { type: 'manufacturer', tier: 1 };
  if (host.includes(brandSlug.replace(/-/g, '')) && (host.endsWith('.com') || host.endsWith('.net') || host.endsWith('.co.uk'))) return { type: 'manufacturer', tier: 1 };
  if (RETAILERS.some((d) => host === d || host.endsWith(`.${d}`))) return { type: 'retailer', tier: 2 };
  return { type: 'unknown', tier: 3 };
}

const PHONE_LIKE = new Set(['phones', 'computers', 'gaming', 'cameras', 'tv-audio', 'electronics']);
const VEHICLES = new Set(['cars', 'motorcycles']);
const APPLIANCE = new Set(['appliances', 'kitchen', 'solar', 'tools']);

function first(text: string, re: RegExp): RegExpMatchArray | null {
  return text.match(re);
}

export function extractSpecs(text: string, category: string): ExtractedSpec[] {
  const t = text.replace(/\s+/g, ' ');
  const out: ExtractedSpec[] = [];
  const push = (key: string, label: string, value: string, unit: string | null = null) => { if (!out.some((s) => s.key === key)) out.push({ key, label, value, unit }); };

  if (PHONE_LIKE.has(category)) {
    const screen = first(t, /\b(\d{1,2}(?:\.\d{1,2})?)\s?(?:-inch|inch|inches|”|"|in\b)/i);
    if (screen && Number(screen[1]) >= 3 && Number(screen[1]) <= 100) push('screen-size', 'Screen size', `${screen[1]}"`, '"');
    const ram = first(t, /\b(\d{1,2})\s?GB\s?(?:of\s)?(?:LPDDR\d[xX]?\s)?RAM\b/i);
    if (ram) push('ram', 'RAM', `${ram[1]}GB`, 'GB');
    const battery = first(t, /\b(\d{4,5})\s?mAh\b/i);
    if (battery) push('battery', 'Battery', `${battery[1]}mAh`, 'mAh');
    const camera = first(t, /\b(\d{2,3})\s?(?:MP|megapixel)s?\b(?:\s?(?:main|wide|primary|rear))?/i);
    if (camera) push('camera', 'Camera', `${camera[1]}MP`, 'MP');
    const front = first(t, /\b(\d{1,3})\s?MP\s?(?:front|selfie)/i);
    if (front) push('front-camera', 'Front camera', `${front[1]}MP`, 'MP');
    const refresh = first(t, /\b(60|90|120|144|165|240)\s?Hz\b/);
    if (refresh) push('refresh-rate', 'Refresh rate', `${refresh[1]}Hz`, 'Hz');
    const panel = first(t, /\b(Dynamic AMOLED 2X|Super AMOLED|AMOLED|OLED|LTPO|IPS LCD|IPS|LCD|Mini-LED|QLED|Super Retina XDR|Retina)\b/i);
    if (panel) push('display-type', 'Display', panel[1]);
    const resolution = first(t, /\b(\d{3,4})\s?[x×]\s?(\d{3,4})\b(?:\s?(?:pixels|px))?/);
    if (resolution) push('resolution', 'Resolution', `${resolution[1]} x ${resolution[2]}`);
    const chip = first(t, /\b(Snapdragon\s(?:\d\s)?(?:Gen\s\d|\d{3}\+?)(?:\sGen\s\d)?|Apple\sA\d{1,2}(?:\sPro|\sBionic)?|A\d{2}\s(?:Pro|Bionic)|Dimensity\s\d{3,4}\+?|Exynos\s\d{3,4}|Helio\s[A-Z]\d{2,3}|Tensor\s?G?\d|Unisoc\s[A-Z]\d{3,4}|Kirin\s\d{3,4}|Intel\sCore\s(?:Ultra\s)?[iI][3579](?:-\d{4,5}[A-Z]*)?|Ryzen\s[3579]\s\d{4}[A-Z]*|Apple\sM\d(?:\s(?:Pro|Max|Ultra))?)\b/i);
    if (chip) push('processor', 'Processor', chip[1].replace(/\s+/g, ' '));
    const os = first(t, /\b(Android\s\d{1,2}|iOS\s\d{1,2}|HarmonyOS\s?\d?|Windows\s1[01]|macOS(?:\s[A-Z][a-z]+)?|ChromeOS)\b/i);
    if (os) push('operating-system', 'Operating system', os[1]);
    const weight = first(t, /\b(\d{2,4}(?:\.\d)?)\s?(?:g|grams)\b(?!\/)/i);
    if (weight && Number(weight[1]) >= 80 && Number(weight[1]) <= 5000) push('weight', 'Weight', `${weight[1]}g`, 'g');
    const charge = first(t, /\b(\d{2,3})\s?W\s?(?:fast\s|wired\s|super\s?fast\s)?charg/i);
    if (charge) push('charging', 'Charging', `${charge[1]}W`, 'W');
    if (/\b5G\b/.test(t)) push('network', 'Network', '5G');
    const water = first(t, /\b(IP6[789](?:\/IP6[89])?|IPX\d)\b/);
    if (water) push('water-resistance', 'Water resistance', water[1]);
    const gpu = first(t, /\b(GeForce\sRTX\s\d{4}(?:\s?Ti)?|GeForce\sGTX\s\d{4}(?:\s?Ti)?|Radeon\sRX\s\d{4}[A-Z]*|Intel\s(?:Iris\sXe|Arc\s[A-Z]\d{3}|UHD\sGraphics)|Adreno\s\d{3}|Mali-G\d{2,3}(?:\sMC\d+)?)\b/i);
    if (gpu) push('graphics', 'Graphics', gpu[1]);
    const ssd = first(t, /\b(\d{3,4})\s?GB\s?(?:PCIe\s|NVMe\s|M\.2\s)*SSD\b/i);
    if (ssd) push('storage-type', 'Storage type', `${ssd[1]}GB SSD`);
  }

  if (VEHICLES.has(category)) {
    const cc = first(t, /\b(\d{3,4})\s?cc\b/i);
    const litres = first(t, /\b(\d\.\d)\s?(?:L|litre|liter)\b(?:\s?(?:engine|petrol|diesel|turbo))?/i);
    if (cc) push('engine-size', 'Engine size', `${cc[1]}cc`, 'cc');
    else if (litres) push('engine-size', 'Engine size', `${litres[1]}L`, 'L');
    const fuel = first(t, /\b(petrol|diesel|hybrid|plug-in hybrid|electric|gasoline)\b/i);
    if (fuel) push('fuel', 'Fuel', fuel[1].toLowerCase() === 'gasoline' ? 'Petrol' : fuel[1][0].toUpperCase() + fuel[1].slice(1).toLowerCase());
    const trans = first(t, /\b(automatic|manual|CVT|e-CVT|DCT|AMT)\b(?:\s?(?:transmission|gearbox))?/i);
    if (trans) push('transmission', 'Transmission', trans[1].length <= 5 ? trans[1].toUpperCase() : trans[1][0].toUpperCase() + trans[1].slice(1).toLowerCase());
    const drive = first(t, /\b(AWD|4WD|4x4|FWD|RWD|2WD|all-wheel drive|four-wheel drive|front-wheel drive|rear-wheel drive)\b/i);
    if (drive) push('drive', 'Drive', drive[1].toUpperCase().replace('ALL-WHEEL DRIVE', 'AWD').replace('FOUR-WHEEL DRIVE', '4WD').replace('FRONT-WHEEL DRIVE', 'FWD').replace('REAR-WHEEL DRIVE', 'RWD'));
    const seats = first(t, /\b([2-9]|1\d)[\s-]?(?:seater|seats)\b/i);
    if (seats) push('seats', 'Seats', seats[1]);
    const body = first(t, /\b(SUV|sedan|saloon|hatchback|pickup|pick-up|station wagon|estate|coupe|convertible|minivan|MPV|crossover|van)\b/i);
    if (body) push('body-type', 'Body type', body[1].toUpperCase() === 'SUV' || body[1].toUpperCase() === 'MPV' ? body[1].toUpperCase() : body[1][0].toUpperCase() + body[1].slice(1).toLowerCase());
    const hp = first(t, /\b(\d{2,3})\s?(?:hp|bhp|PS)\b/i);
    if (hp) push('power', 'Power', `${hp[1]}hp`, 'hp');
  }

  if (APPLIANCE.has(category)) {
    const litres = first(t, /\b(\d{2,4})\s?(?:L|litre|liter)s?\b/i);
    const kg = first(t, /\b(\d{1,2}(?:\.\d)?)\s?kg\b/i);
    if (litres) push('capacity', 'Capacity', `${litres[1]}L`, 'L');
    else if (kg) push('capacity', 'Capacity', `${kg[1]}kg`, 'kg');
    const watts = first(t, /\b(\d{2,5})\s?W\b/);
    if (watts) push('power', 'Power', `${watts[1]}W`, 'W');
    const energy = first(t, /\b(A\+{1,3}|[A-G])\s?(?:energy\s)?(?:rating|class)\b/i);
    if (energy) push('energy-rating', 'Energy rating', energy[1].toUpperCase());
    const volts = first(t, /\b(\d{2,3})\s?V\b/);
    if (volts) push('voltage', 'Voltage', `${volts[1]}V`, 'V');
  }

  if (category === 'tv-audio' || category === 'electronics') {
    const res = first(t, /\b(8K|4K|UHD|Full HD|1080p|HD Ready|720p)\b/i);
    if (res && !out.some((s) => s.key === 'resolution')) push('resolution', 'Resolution', res[1].toUpperCase() === 'UHD' ? '4K' : res[1]);
    const smart = first(t, /\b(webOS|Tizen|Google TV|Android TV|Roku TV|Fire TV|VIDAA)\b/i);
    if (smart) push('smart-tv', 'Smart platform', smart[1]);
  }
  return out;
}

interface TavilyResult { url: string; title?: string; content?: string; score?: number }

async function tavilySearch(apiKey: string, q: string, includeDomains?: string[]): Promise<TavilyResult[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ query: q, search_depth: 'basic', max_results: 8, include_answer: false, include_raw_content: false, ...(includeDomains?.length ? { include_domains: includeDomains } : {}) }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`Tavily responded ${res.status}`);
    const data = (await res.json()) as { results?: TavilyResult[] };
    return Array.isArray(data.results) ? data.results.filter((r) => r && typeof r.url === 'string') : [];
  } finally {
    clearTimeout(timer);
  }
}

export async function enqueueResearch(product: CanonicalProductRow, requestedBy: string | null): Promise<{ id: string; status: string }> {
  const open = await queryOne<{ id: string; status: string }>(`SELECT id, status FROM research_jobs WHERE product_id = $1 AND status IN ('queued', 'running') ORDER BY created_at DESC LIMIT 1`, [product.id]);
  if (open) return open;
  const recent = await queryOne<{ id: string; status: string }>(`SELECT id, status FROM research_jobs WHERE product_id = $1 AND status = 'done' AND finished_at > now() - interval '90 days' ORDER BY created_at DESC LIMIT 1`, [product.id]);
  if (recent) return recent;
  const apiKey = (process.env.TAVILY_API_KEY ?? '').trim();
  if (!apiKey) {
    const skipped = await queryOne<{ id: string; status: string }>(
      `INSERT INTO research_jobs (product_id, status, query, error, requested_by, finished_at) VALUES ($1, 'skipped', $2, 'TAVILY_API_KEY is not configured', $3, now()) RETURNING id, status`,
      [product.id, `${product.brand} ${product.model} specifications`, requestedBy]
    );
    return skipped!;
  }
  const job = await queryOne<{ id: string; status: string }>(
    `INSERT INTO research_jobs (product_id, status, query, requested_by) VALUES ($1, 'queued', $2, $3) RETURNING id, status`,
    [product.id, `${product.brand} ${product.model} specifications`, requestedBy]
  );
  return job!;
}

export async function runResearch(jobId: string): Promise<void> {
  const job = await queryOne<{ id: string; product_id: string; status: string; query: string }>(`SELECT id, product_id, status, query FROM research_jobs WHERE id = $1`, [jobId]);
  if (!job || job.status !== 'queued') return;
  const product = await queryOne<CanonicalProductRow>(`SELECT * FROM canonical_products WHERE id = $1`, [job.product_id]);
  if (!product) return;
  const apiKey = (process.env.TAVILY_API_KEY ?? '').trim();
  if (!apiKey) {
    await query(`UPDATE research_jobs SET status = 'skipped', error = 'TAVILY_API_KEY is not configured', finished_at = now() WHERE id = $1`, [jobId]);
    return;
  }
  await query(`UPDATE research_jobs SET status = 'running', started_at = now() WHERE id = $1`, [jobId]);
  try {
    const results = new Map<string, TavilyResult>();
    for (const r of await tavilySearch(apiKey, job.query)) results.set(r.url, r);
    const domains = MANUFACTURERS[product.brand_slug];
    if (domains?.length) {
      for (const r of await tavilySearch(apiKey, `${product.brand} ${product.model} tech specs`, domains).catch(() => [] as TavilyResult[])) results.set(r.url, r);
    }
    let specsFound = 0;
    for (const r of results.values()) {
      const text = `${r.title ?? ''}. ${r.content ?? ''}`;
      const modelWords = product.model.toLowerCase().split(/\s+/).filter((w) => w.length > 1);
      if (modelWords.length && !modelWords.every((w) => text.toLowerCase().includes(w))) continue;
      const tier = trustTier(r.url, product.brand_slug);
      for (const spec of extractSpecs(text, product.category)) {
        await recordSource(product.id, spec.key, spec.label, spec.value, spec.unit, { type: tier.type, tier: tier.tier, url: r.url, title: r.title ?? null });
        specsFound += 1;
      }
    }
    await query(`UPDATE research_jobs SET status = 'done', results_count = $2, specs_found = $3, finished_at = now() WHERE id = $1`, [jobId, results.size, specsFound]);
    await query(`UPDATE canonical_products SET researched_at = now(), updated_at = now() WHERE id = $1`, [product.id]);
  } catch (err) {
    await query(`UPDATE research_jobs SET status = 'failed', error = $2, finished_at = now() WHERE id = $1`, [jobId, (err as Error).message.slice(0, 500)]);
  }
}

export async function latestJob(productId: string) {
  return queryOne<{ id: string; status: string; error: string | null; specs_found: number; results_count: number; finished_at: string | null; created_at: string }>(
    `SELECT id, status, error, specs_found, results_count, finished_at, created_at FROM research_jobs WHERE product_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [productId]
  );
}

export function researchConfigured(): boolean {
  return Boolean((process.env.TAVILY_API_KEY ?? '').trim());
}
