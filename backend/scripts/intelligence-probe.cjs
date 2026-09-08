#!/usr/bin/env node

require('dotenv/config');
const { Pool } = require('pg');

const API = process.env.PROBE_API ?? 'http://localhost:4000/api';
const S = String(Date.now()).slice(-9);
const P = 'IntelProbe123!';
const who = (tag, prefix) => ({ phone: `${prefix}${S.slice(0, 6)}`, email: `ip-${tag}-${S}@example.test`, name: `Probe ${tag}` });
const SELLERS = [who('ia', '0712'), who('ib', '0713'), who('ic', '0714'), who('id', '0716')];
const STAFF = who('iadm', '0715');
const MODEL = `Nova X${S.slice(-4)}`;

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
async function register(w, role) {
  const r = await call('POST', '/auth/register', { body: { role, fullName: w.name, phone: w.phone, email: w.email, password: P } });
  if (r.status !== 201) throw new Error(`register failed ${JSON.stringify(r.body)}`);
  return r.body;
}
const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7355a1d0000000049454e44ae426082', 'hex');
async function upload(token) {
  const form = new FormData(); form.append('file', new Blob([PNG], { type: 'image/png' }), 'p.png');
  const res = await fetch(`${API}/uploads?folder=products`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  return (await res.json()).url;
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, label, timeoutMs = 90000) {
  const start = Date.now(); let last = null;
  while (Date.now() - start < timeoutMs) { last = await fn(); if (last) return last; await sleep(1000); }
  console.log(`  (timed out waiting for ${label})`);
  return last;
}
async function publish(token, img, body) {
  let created = await call('POST', '/seller/products', { token, body: { images: [img], ...body } });
  if (created.status === 500) { await sleep(3000); created = await call('POST', '/seller/products', { token, body: { images: [img], ...body } }); }
  if (created.status !== 201) throw new Error(`create failed ${JSON.stringify(created.body)}`);
  let pub = await call('POST', `/seller/products/${created.body.product.id}/publish`, { token });
  if (pub.status === 500) { await sleep(3000); pub = await call('POST', `/seller/products/${created.body.product.id}/publish`, { token }); }
  if (pub.status !== 200) throw new Error(`publish failed ${JSON.stringify(pub.body)}`);
  return created.body.product.id;
}

(async () => {
  const url = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: url, ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false } });
  pool.on('error', () => undefined);
  const pq = async (sql, params) => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try { return await pool.query(sql, params); } catch (err) { if (attempt === 2 || !/terminated|ECONNRESET|timeout/i.test(String(err.message))) throw err; await sleep(1500); }
    }
  };
  const sellers = [];
  for (const w of SELLERS) sellers.push(await register(w, 'seller'));
  const staff = await register(STAFF, 'shopper');
  const imgs = [];
  for (let i = 0; i < sellers.length; i++) {
    const r = await call('POST', '/seller/store', { token: sellers[i].accessToken, body: { name: `Intel Store ${i} ${S}`, category: 'phones', city: 'Kampala', deliveryFeeUgx: 3000 } });
    if (r.status !== 201) throw new Error(`store failed ${JSON.stringify(r.body)}`);
    imgs.push(await upload(sellers[i].accessToken));
  }
  await pq("UPDATE users SET role = 'admin' WHERE id = $1", [staff.user.id]);
  const admin = (await call('POST', '/auth/login', { body: { identifier: STAFF.phone, password: P } })).body.accessToken;

  const carForm = await call('GET', '/knowledge/form?category=cars');
  const phoneForm = await call('GET', '/knowledge/form?category=phones&kind=Smartphones');
  const cakeForm = await call('GET', '/knowledge/form?category=bakery&kind=Cakes');
  const keys = (f) => f.body.attributes.map((a) => a.key);
  check('category-scoped fields: cars, phones and cakes ask for different details', keys(carForm).includes('transmission') && !keys(phoneForm).includes('transmission') && keys(phoneForm).includes('ram') && keys(cakeForm).includes('flavour') && !keys(cakeForm).includes('ram'));
  check('category-scoped fields: the variant dimension follows the kind', carForm.body.versionType === 'Trim' && phoneForm.body.versionType === 'Storage' && cakeForm.body.versionType === 'Size');
  check('category config is data, not code: kinds and attributes carry database ids', typeof phoneForm.body.kind?.id === 'string' && phoneForm.body.kinds.every((k) => typeof k.id === 'string'));

  const unknownName = `Zentrix Q${S.slice(-3)}`;
  const t0 = Date.now();
  const unknownId = await publish(sellers[0].accessToken, imgs[0], {
    name: `${unknownName} phone`, category: 'phones', subcategory: 'Smartphones', brand: 'Zentrix', model: `Q${S.slice(-3)}`, priceUgx: 350000,
    description: 'A budget phone from a brand nobody has listed before, sealed in the box with a charger.',
    variations: [{ name: 'Storage', value: '64GB', colorName: 'Black', colorHex: '#111111', stockQuantity: 3 }],
  });
  check('publish works immediately for an unrecognised product', !!unknownId && Date.now() - t0 < 30000, `${Date.now() - t0}ms`);
  const unknownLookup = await waitFor(async () => { const r = await call('GET', `/knowledge/product?brand=Zentrix&model=Q${S.slice(-3)}`); return r.body?.known ? r.body : null; }, 'canonical product creation');
  check('the unknown product is registered for research in the background', !!unknownLookup && unknownLookup.product.specs.length === 0 && ['skipped', 'queued', 'running', 'done', 'failed'].includes(unknownLookup.research?.status ?? ''), JSON.stringify(unknownLookup?.research));
  check('research is skipped gracefully when no key is configured, and says so', unknownLookup?.researchConfigured === true || (unknownLookup?.research?.status === 'skipped' && /TAVILY/.test(unknownLookup.research.error ?? '')));
  const linked = await pq(`SELECT canonical_product_id FROM seller_products WHERE id = $1`, [unknownId]);
  check('the listing is linked to its canonical product without blocking publish', linked.rows[0].canonical_product_id === unknownLookup?.product?.id);

  const priceAsSpec = await publish(sellers[0].accessToken, imgs[0], {
    name: `${unknownName} price test`, category: 'phones', subcategory: 'Smartphones', brand: 'Zentrix', model: `Q${S.slice(-3)}`, priceUgx: 360000,
    description: 'Same phone listed again with a price written into the details by mistake, to prove it never leaks.',
    specifications: [{ label: 'Price', value: '360000' }, { label: 'RAM', value: '4GB' }],
  });
  await waitFor(async () => { const r = await pq(`SELECT 1 FROM canonical_specs WHERE product_id = $1 AND attribute_key = 'ram'`, [unknownLookup.product.id]); return r.rowCount ? true : null; }, 'seller-contributed RAM', 180000);
  const priceRows = await pq(`SELECT count(*)::int AS n FROM canonical_specs WHERE product_id = $1 AND attribute_key ILIKE '%price%'`, [unknownLookup.product.id]);
  const ramRow = await pq(`SELECT status, confidence FROM canonical_specs WHERE product_id = $1 AND attribute_key = 'ram'`, [unknownLookup.product.id]);
  check('price never enters product knowledge, even when a seller types it as a detail', priceRows.rows[0].n === 0 && !!priceAsSpec);
  check('a seller-entered spec on an unknown product becomes a pending canonical spec, not a verified one', ramRow.rows[0]?.status === 'pending' && Number(ramRow.rows[0].confidence) < 0.6);

  const created = await call('POST', '/admin/knowledge/products', { token: admin, body: { brand: 'Nova', model: MODEL, category: 'phones' } });
  check('admin can add a canonical product', created.status === 201 && created.body.product.display_name === `Nova ${MODEL}`);
  const cid = created.body.product.id;
  for (const [label, value, unit] of [['RAM', '12GB', 'GB'], ['Screen size', '6.7"', '"'], ['Battery', '5000mAh', 'mAh'], ['Processor', 'Snapdragon 8 Gen 3', null]]) {
    let r = await call('PUT', `/admin/knowledge/products/${cid}/specs`, { token: admin, body: { label, value, unit } });
    if (r.status === 500) { await sleep(3000); r = await call('PUT', `/admin/knowledge/products/${cid}/specs`, { token: admin, body: { label, value, unit } }); }
    if (r.status !== 200) throw new Error(`spec failed ${JSON.stringify(r.body)}`);
  }
  const priceSpec = await call('PUT', `/admin/knowledge/products/${cid}/specs`, { token: admin, body: { label: 'Price', value: '1000000' } });
  check('even an admin cannot store a price as a canonical spec', priceSpec.status === 400);
  const known = await call('GET', `/knowledge/product?brand=nova&model=${encodeURIComponent(MODEL.toLowerCase())}`);
  check('a recognised product returns its specs as suggestions with confidence and status', known.body.known && known.body.product.specs.length === 4 && known.body.product.specs.every((s) => s.status === 'verified' && s.confidence === 1));

  const sellerRam = await call('GET', '/knowledge/form?category=phones&kind=Smartphones');
  check('suggestions are separate from category fields: RAM is both a category field and a suggested value', sellerRam.body.attributes.some((a) => a.key === 'ram'));

  const listing1 = await publish(sellers[0].accessToken, imgs[0], {
    name: `Nova ${MODEL} ${S}`, category: 'phones', subcategory: 'Smartphones', brand: 'Nova', model: MODEL, priceUgx: 2100000,
    description: 'Recognised phone listed by a seller who edited one suggested value to match the box in hand.',
    specifications: [{ label: 'RAM', value: '16GB' }, { label: 'Screen size', value: '6.7"' }, { label: 'Battery', value: '5000mAh' }],
    variations: [{ name: 'Storage', value: '256GB', colorName: 'Black', colorHex: '#111111', stockQuantity: 2 }],
  });
  const correction = await waitFor(async () => {
    const r = await call('GET', '/admin/knowledge/corrections?status=pending', { token: admin });
    return r.body?.corrections?.find((c) => c.product_id === cid && c.attribute_key === 'ram') ?? null;
  }, 'ram correction');
  check('a seller editing a suggested spec creates a pending correction instead of changing Duka', !!correction && correction.proposed_value === '16GB' && correction.canonical_value === '12GB' && correction.status === 'pending');
  const stillTwelve = await call('GET', `/knowledge/product?brand=Nova&model=${encodeURIComponent(MODEL)}`);
  check('the canonical value is untouched by one seller', stillTwelve.body.product.specs.find((s) => s.key === 'ram')?.value === '12GB');
  const listingPublic = await call('GET', `/marketplace/products/${listing1}`);
  check("the seller's own listing keeps the seller's value", listingPublic.body.product.attributes.some((a) => a.key === 'ram' && a.value === '16GB'));
  check('verified specs the seller did not enter appear on the listing as verified', listingPublic.body.product.verifiedSpecs.some((s) => s.key === 'processor' && s.value === 'Snapdragon 8 Gen 3') && !listingPublic.body.product.verifiedSpecs.some((s) => s.key === 'ram'));
  const agreeSources = await pq(`SELECT count(*)::int AS n FROM canonical_spec_sources WHERE product_id = $1 AND attribute_key = 'battery' AND source_type = 'seller'`, [cid]);
  check('a matching seller value is recorded as an agreeing source', agreeSources.rows[0].n === 1);

  const flagged = await call('GET', `/admin/knowledge/products?needsReview=1`, { token: admin });
  check('admin product list flags the product needing review', flagged.body.products.some((p) => p.id === cid && p.pending_corrections >= 1));
  const detail = await call('GET', `/admin/knowledge/products/${cid}`, { token: admin });
  check('admin detail shows provenance per spec', detail.status === 200 && detail.body.sources.some((s) => s.attribute_key === 'ram' && s.source_type === 'admin') && detail.body.corrections.some((c) => c.id === correction.id));

  const approve = await call('POST', `/admin/knowledge/corrections/${correction.id}/approve`, { token: admin, body: { reason: 'Seller had the retail unit' } });
  const afterApprove = await call('GET', `/knowledge/product?brand=Nova&model=${encodeURIComponent(MODEL)}`);
  const ramAfter = afterApprove.body.product.specs.find((s) => s.key === 'ram');
  check('admin approving a correction updates the canonical value with admin provenance', approve.status === 200 && ramAfter?.value === '16GB' && ramAfter.status === 'verified' && ramAfter.confidence === 1);
  const approvedRow = await call('GET', '/admin/knowledge/corrections?status=approved', { token: admin });
  check('the approved correction is kept with who decided it', approvedRow.body.corrections.some((c) => c.id === correction.id && c.decided_by === staff.user.id));

  for (let i = 0; i < 3; i++) {
    await publish(sellers[i].accessToken, imgs[i], {
      name: `Nova ${MODEL} battery ${i} ${S}`, category: 'phones', subcategory: 'Smartphones', brand: 'Nova', model: MODEL, priceUgx: 2000000 + i,
      description: 'Three independent sellers report the same different battery figure for the same phone model here.',
      specifications: [{ label: 'Battery', value: '5100mAh' }],
    });
  }
  const lockedBattery = await waitFor(async () => {
    const r = await call('GET', '/admin/knowledge/corrections?status=pending', { token: admin });
    const rows = r.body?.corrections?.filter((c) => c.product_id === cid && c.attribute_key === 'battery') ?? [];
    return rows.length >= 3 ? rows : null;
  }, 'three battery corrections', 200000);
  const batteryNow = (await call('GET', `/knowledge/product?brand=Nova&model=${encodeURIComponent(MODEL)}`)).body.product.specs.find((s) => s.key === 'battery');
  check('sellers cannot outvote an admin-set value: three matching corrections stay pending for review', Array.isArray(lockedBattery) && lockedBattery.length >= 3 && Number(lockedBattery[0].agreeing_sellers) >= 3 && batteryNow?.value === '5000mAh', JSON.stringify({ battery: batteryNow?.value, agreeing: lockedBattery?.[0]?.agreeing_sellers }));

  for (let i = 1; i < 4; i++) {
    await publish(sellers[i].accessToken, imgs[i], {
      name: `${unknownName} ram ${i} ${S}`, category: 'phones', subcategory: 'Smartphones', brand: 'Zentrix', model: `Q${S.slice(-3)}`, priceUgx: 340000 + i,
      description: 'Three more independent sellers list the unknown phone and all give the same RAM figure, differing from the first seller.',
      specifications: [{ label: 'RAM', value: '6GB' }],
    });
  }
  const promoted = await waitFor(async () => {
    const r = await call('GET', `/knowledge/product?brand=Zentrix&model=Q${S.slice(-3)}`);
    const b = r.body?.product?.specs.find((s) => s.key === 'ram');
    return b && b.value === '6GB' && b.status === 'verified' ? b : null;
  }, 'ram auto-promotion', 240000);
  check('three independent matching corrections auto-promote a seller-contributed value', !!promoted && promoted.status === 'verified' && promoted.confidence >= 0.6, JSON.stringify(promoted));
  const autoRows = await call('GET', '/admin/knowledge/corrections?status=approved', { token: admin });
  check('auto-promoted corrections are marked approved without an admin', autoRows.body.corrections.filter((c) => c.product_id === unknownLookup.product.id && c.attribute_key === 'ram' && !c.decided_by).length >= 3);
  const singleLeft = (await call('GET', '/admin/knowledge/corrections?status=pending', { token: admin })).body.corrections.filter((c) => c.product_id === unknownLookup.product.id);
  check('single corrections stay pending', singleLeft.every((c) => Number(c.agreeing_sellers) < 3));

  const quality = await call('GET', '/admin/knowledge/quality', { token: admin });
  check('data quality surfaces the most corrected fields as a signal', quality.status === 200 && quality.body.fields.some((f) => f.attribute_key === 'battery' || f.attribute_key === 'ram') && quality.body.totals.products >= 2);

  const sample = 'Nova phone spec sheet: 6.7-inch Dynamic AMOLED 2X display, 120Hz, Snapdragon 8 Gen 3, 12GB RAM, 5000mAh battery with 45W fast charging, 200MP main camera, IP68, 232g, Android 14, 5G.';
  const extracted = await call('GET', `/admin/knowledge/research/extract?category=phones&text=${encodeURIComponent(sample)}`, { token: admin });
  const got = Object.fromEntries((extracted.body?.specs ?? []).map((s) => [s.key, s.value]));
  check('the research extractor pulls fixed specs deterministically from text', got['screen-size'] === '6.7"' && got.ram === '12GB' && got.battery === '5000mAh' && got.camera === '200MP' && got.processor === 'Snapdragon 8 Gen 3' && got['refresh-rate'] === '120Hz' && got['water-resistance'] === 'IP68' && got.charging === '45W' && got.network === '5G', JSON.stringify(got));
  const nothing = await call('GET', `/admin/knowledge/research/extract?category=phones&text=${encodeURIComponent('Great phone, best price in Kampala, call now for a discount of 50000 UGX')}`, { token: admin });
  check('the extractor never invents specs from marketing text', (nothing.body.specs ?? []).length === 0);
  const carText = await call('GET', `/admin/knowledge/research/extract?category=cars&text=${encodeURIComponent('Toyota Harrier 2.0L petrol, CVT automatic, AWD, 5 seats, SUV')}`, { token: admin });
  const car = Object.fromEntries((carText.body?.specs ?? []).map((s) => [s.key, s.value]));
  check('vehicle specs extract too', car['engine-size'] === '2.0L' && car.fuel === 'Petrol' && car.transmission === 'CVT' && car.drive === 'AWD' && car.seats === '5' && car['body-type'] === 'SUV', JSON.stringify(car));

  const sellerForbidden = await call('GET', '/admin/knowledge/products', { token: sellers[0].accessToken });
  const sellerCannotSet = await call('PUT', `/admin/knowledge/products/${cid}/specs`, { token: sellers[0].accessToken, body: { label: 'RAM', value: '1GB' } });
  check('sellers cannot read or write canonical data directly', sellerForbidden.status === 403 && sellerCannotSet.status === 403);
  const anonResearch = await call('POST', '/knowledge/research', { body: { brand: 'Nova', model: MODEL, category: 'phones' } });
  check('research can only be requested by signed-in sellers', anonResearch.status === 401);

  await pq(`DELETE FROM canonical_products WHERE (brand_slug = 'nova' AND model_slug = $1) OR brand_slug = 'zentrix'`, [MODEL.toLowerCase().replace(/[^a-z0-9]+/g, '-')]);
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  console.log('CLEANUP: node scripts/purge-test-data.cjs --apply');
  await pool.end();
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error('RUN FAILED', e); process.exit(1); });
