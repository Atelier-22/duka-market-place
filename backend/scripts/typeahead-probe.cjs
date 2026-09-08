#!/usr/bin/env node

require('dotenv/config');
const { Pool } = require('pg');

const API = process.env.PROBE_API ?? 'http://localhost:4000/api';
const S = String(Date.now()).slice(-9);
const P = 'TypeaheadProbe123!';
const who = (tag, prefix) => ({ phone: `${prefix}${S.slice(0, 6)}`, email: `ta-${tag}-${S}@example.test`, name: `Probe ${tag}` });
const SELLER = who('ts', '0724');
const STAFF = who('tadm', '0792');

const results = [];
function check(label, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
}
async function call(method, p, { token, body } = {}) {
  const res = await fetch(API + p, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function search(q) { return (await call('GET', `/knowledge/search?q=${encodeURIComponent(q)}`)).body; }
const flat = (r) => (r?.groups ?? []).flatMap((g) => g.products);

(async () => {
  const url = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: url, ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false } });
  pool.on('error', () => undefined);
  const seller = (await call('POST', '/auth/register', { body: { role: 'seller', fullName: SELLER.name, phone: SELLER.phone, email: SELLER.email, password: P } })).body;
  const staff = (await call('POST', '/auth/register', { body: { role: 'shopper', fullName: STAFF.name, phone: STAFF.phone, email: STAFF.email, password: P } })).body;
  await call('POST', '/seller/store', { token: seller.accessToken, body: { name: `Typeahead Store ${S}`, category: 'phones', city: 'Kampala', deliveryFeeUgx: 3000 } });
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [staff.user.id]);
  const admin = (await call('POST', '/auth/login', { body: { identifier: STAFF.phone, password: P } })).body.accessToken;

  const t0 = Date.now();
  const samsung = await search('samsung');
  const samsungMs = Date.now() - t0;
  const cats = (samsung.groups ?? []).map((g) => g.category);
  check('brand-level search spans every category the brand has products in', cats.includes('phones') && cats.includes('computers') && cats.includes('tv-audio'), cats.join(','));
  check('brand-level results are grouped by category with labels', (samsung.groups ?? []).every((g) => typeof g.label === 'string' && g.products.every((p) => p.category === g.category)));
  check('typeahead answers fast from the in-memory index', samsungMs < 2500, `${samsungMs}ms`);
  const samsungAgain = await search('samsung');
  check('the same query is served again without a full rebuild', samsungAgain.total === samsung.total);

  const iphone = flat(await search('iphone'));
  const years = [...new Set(iphone.filter((p) => p.family === 'iPhone').map((p) => p.releasedOn.slice(0, 4)))];
  check('model-family search returns every generation Duka knows', iphone.every((p) => /iphone/i.test(p.family ?? '')) && years.length >= 6, years.join(','));
  const ordered = iphone.filter((p) => p.family === 'iPhone').map((p) => p.releasedOn);
  check('generations come most recent first', ordered.every((d, i) => i === 0 || d <= ordered[i - 1]) && ordered[0].startsWith('2025'));
  check('the newest two generations are current, the older ones discontinued', iphone.some((p) => p.model === 'iPhone 17' && p.lifecycle === 'current') && iphone.some((p) => p.model === 'iPhone 16' && p.lifecycle === 'current') && iphone.some((p) => p.model === 'iPhone 15' && p.lifecycle === 'discontinued') && iphone.some((p) => p.model === 'iPhone 12' && p.lifecycle === 'discontinued'));
  const macbook = flat(await search('macbook'));
  check('MacBook search returns the M1 through M4 lineups', ['M1', 'M2', 'M3', 'M4'].every((chip) => macbook.some((p) => p.model.includes(`(${chip})`) || p.model.includes(`(${chip} `))));
  const specific = flat(await search('iphone 13 pro'));
  check('a specific query ranks the exact model first', specific[0]?.model === 'iPhone 13 Pro' && specific[0].lifecycle === 'discontinued', specific[0]?.model);
  const harrier = flat(await search('harrier'));
  check('vehicles use one current generation: the 4th-gen Harrier is current, the 3rd is not', harrier.some((p) => /4th/.test(p.model) && p.lifecycle === 'current') && harrier.some((p) => /3rd/.test(p.model) && p.lifecycle === 'discontinued'));
  const trousers = await search('trouser');
  check('categories without a catalogue return no false matches', (trousers.total ?? 0) === 0);

  const ultra = await call('GET', '/knowledge/product?brand=Samsung&model=Galaxy%20S25%20Ultra');
  const uSpec = (k) => ultra.body.product.specs.find((s) => s.key === k);
  check('Duka already knows the Galaxy S25 Ultra: release year, screen, chip, RAM, battery, camera', ultra.body.known && ultra.body.product.releasedOn?.startsWith('2025') && uSpec('screen-size')?.value === '6.9"' && uSpec('battery')?.value === '5000mAh' && uSpec('ram')?.value === '12GB' && uSpec('camera')?.value === '200MP quad' && /Snapdragon 8 Elite/.test(uSpec('processor')?.value ?? ''), JSON.stringify(ultra.body.product?.specs?.map((s) => s.key)));
  check('catalogue specs are verified with catalogue provenance, not admin or seller', ultra.body.product.specs.every((s) => s.status === 'verified') && uSpec('battery').bestTier === 1);
  check('it knows the official colours and storage options', ultra.body.product.variants.colours.some((c) => c.name === 'Titanium Black' && /^#/.test(c.hex ?? '')) && ultra.body.product.variants.colours.some((c) => c.name === 'Titanium Silverblue') && ['256GB', '512GB', '1TB'].every((v) => ultra.body.product.variants.storage.includes(v)));
  const ip13 = await call('GET', '/knowledge/product?brand=Apple&model=iPhone%2013');
  check('the same holds for an older iPhone: colours, storage and specs', ip13.body.product.variants.colours.some((c) => c.name === 'Midnight') && ip13.body.product.variants.storage.includes('512GB') && ip13.body.product.specs.some((s) => s.key === 'processor' && s.value === 'A15 Bionic'));
  const ps5 = await call('GET', '/knowledge/product?brand=Sony&model=PlayStation%205');
  check('consoles carry their fixed specs too', ps5.body.known && ps5.body.product.specs.some((s) => s.key === 'storage-type' && s.value === '825GB SSD'));
  const tv = await call('GET', '/knowledge/product?brand=Samsung&model=Crystal%20UHD%20DU8000');
  check('TVs carry sizes and platform', tv.body.product.variants.sizes.includes('55"') && tv.body.product.specs.some((s) => s.key === 'smart-platform' && s.value === 'Tizen'));
  const car = await call('GET', '/knowledge/product?brand=Toyota&model=Harrier%20(4th%20generation,%202020-)');
  check('cars carry engine, transmission, drive, seats and body type', ['engine-size', 'transmission', 'drive', 'seats', 'body-type'].every((k) => car.body.product.specs.some((s) => s.key === k)) && car.body.product.specs.find((s) => s.key === 'seats')?.value === '5');
  const priceLeak = await pool.query(`SELECT count(*)::int AS n FROM canonical_specs WHERE attribute_key ILIKE '%price%'`);
  check('the catalogue never contains a price', priceLeak.rows[0].n === 0);
  const s25Search = flat(await search('galaxy s25 ultra'));
  check('search results advertise how much Duka knows', s25Search[0]?.model === 'Galaxy S25 Ultra' && s25Search[0].specCount >= 6 && s25Search[0].colourCount >= 4);
  const phonesOnly = await search('samsung phone');
  check('tapping into a brand and a kind lists every phone of that brand, current or not', phonesOnly.groups.length === 1 && phonesOnly.groups[0].category === 'phones' && phonesOnly.groups[0].products.some((p) => p.lifecycle === 'current') && phonesOnly.groups[0].products.some((p) => p.lifecycle === 'discontinued'));

  const old = await call('GET', '/knowledge/product?brand=Apple&model=iPhone%2013');
  check('lookup of a discontinued model says so', old.body.known && old.body.product.lifecycle === 'discontinued' && old.body.product.family === 'iPhone');
  await call('PUT', `/admin/knowledge/products/${old.body.product.id}/specs`, { token: admin, body: { label: 'Screen size', value: '6.1"', unit: '"' } });
  const oldAgain = await call('GET', '/knowledge/product?brand=Apple&model=iPhone%2013');
  check('spec suggestions still flow exactly as before for a matched product', oldAgain.body.product.specs.some((s) => s.key === 'screen-size' && s.value === '6.1"' && s.status === 'verified'));

  const listingOld = await call('POST', '/seller/products', { token: seller.accessToken, body: { name: `Apple iPhone 13 ${S}`, category: 'phones', subcategory: 'Smartphones', brand: 'Apple', model: 'iPhone 13', condition: 'new', priceUgx: 1200000, description: 'Discontinued model listed as new on purpose to prove the server forces Used.' } });
  check('a discontinued model cannot be listed as new: the server forces Used', listingOld.status === 201 && listingOld.body.product.condition === 'used', listingOld.body?.product?.condition);
  const editOld = await call('PATCH', `/seller/products/${listingOld.body.product.id}`, { token: seller.accessToken, body: { condition: 'new' } });
  check('editing it back to New is refused the same way', editOld.status === 200 && editOld.body.product.condition === 'used');
  const refurb = await call('PATCH', `/seller/products/${listingOld.body.product.id}`, { token: seller.accessToken, body: { condition: 'refurbished' } });
  check('other truthful conditions stay allowed on a discontinued model', refurb.status === 200 && refurb.body.product.condition === 'refurbished');
  check('price was never touched by the lifecycle rule', Number(listingOld.body.product.price_ugx) === 1200000);

  const listingNew = await call('POST', '/seller/products', { token: seller.accessToken, body: { name: `Apple iPhone 17 ${S}`, category: 'phones', subcategory: 'Smartphones', brand: 'Apple', model: 'iPhone 17', condition: 'new', priceUgx: 4500000, description: 'Current generation stays exactly as the seller set it.' } });
  check('a current-generation model keeps the seller-chosen condition', listingNew.status === 201 && listingNew.body.product.condition === 'new');
  const unknownSearch = await search(`zentrix q${S.slice(-3)}`);
  const listingUnknown = await call('POST', '/seller/products', { token: seller.accessToken, body: { name: `Zentrix Q${S.slice(-3)} ${S}`, category: 'general', brand: 'Zentrix', model: `Q${S.slice(-3)}`, condition: 'new', priceUgx: 300000, description: 'Unmatched product falls back to the free-text flow with the condition fully in the seller\'s hands.' } });
  check('no-match fallback: unknown text gives no dropdown and condition stays as chosen', (unknownSearch.total ?? 0) === 0 && listingUnknown.status === 201 && listingUnknown.body.product.condition === 'new');
  await sleep(4000);
  const laterSearch = flat(await search(`zentrix q${S.slice(-3)}`));
  const laterLookup = await call('GET', `/knowledge/product?brand=Zentrix&model=Q${S.slice(-3)}`);
  check('a seller-created product joins the index with an unknown lifecycle, never locking anything', laterLookup.body.known && laterLookup.body.product.lifecycle === 'unknown' && (laterSearch.length === 0 || laterSearch[0].lifecycle === 'unknown'));

  const override = await call('PATCH', `/admin/knowledge/products/${old.body.product.id}`, { token: admin, body: { lifecycleOverride: 'current' } });
  const afterOverride = await call('GET', '/knowledge/product?brand=Apple&model=iPhone%2013');
  const listingOverride = await call('POST', '/seller/products', { token: seller.accessToken, body: { name: `Apple iPhone 13 override ${S}`, category: 'phones', brand: 'Apple', model: 'iPhone 13', condition: 'new', priceUgx: 1100000, description: 'With the admin override in place the model counts as current again.' } });
  check('admin can override the rule and the lock lifts immediately', override.status === 200 && afterOverride.body.product.lifecycle === 'current' && listingOverride.body.product.condition === 'new');
  await call('PATCH', `/admin/knowledge/products/${old.body.product.id}`, { token: admin, body: { lifecycleOverride: null } });
  const afterReset = await call('GET', '/knowledge/product?brand=Apple&model=iPhone%2013');
  check('removing the override restores the computed lifecycle', afterReset.body.product.lifecycle === 'discontinued');
  const sellerPatch = await call('PATCH', `/admin/knowledge/products/${old.body.product.id}`, { token: seller.accessToken, body: { lifecycleOverride: 'current' } });
  check('sellers cannot change lifecycle rules', sellerPatch.status === 403);

  await pool.query(`DELETE FROM canonical_spec_sources WHERE product_id = $1`, [old.body.product.id]);
  await pool.query(`DELETE FROM canonical_specs WHERE product_id = $1`, [old.body.product.id]);
  await pool.query(`DELETE FROM canonical_products WHERE brand_slug = 'zentrix'`);
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  console.log('CLEANUP: node scripts/purge-test-data.cjs --apply');
  await pool.end();
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error('RUN FAILED', e); process.exit(1); });
