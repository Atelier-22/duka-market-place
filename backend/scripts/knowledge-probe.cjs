#!/usr/bin/env node

require('dotenv/config');
const { Pool } = require('pg');

const API = process.env.PROBE_API ?? 'http://localhost:4000/api';
const S = String(Date.now()).slice(-9);
const P = 'KnowledgeProbe123!';
const who = (tag, prefix) => ({ phone: `${prefix}${S.slice(0, 6)}`, email: `kp-${tag}-${S}@example.test`, name: `Probe ${tag}` });
const SELLERS = [who('ka', '0755'), who('kb', '0766'), who('kc', '0777')];
const BUYER = who('kbuy', '0788');
const STAFF = who('kadm', '0799');

const results = [];
function check(label, ok, detail = '') {
  results.push(ok);
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${detail ? '  — ' + detail : ''}`);
}

async function call(method, p, { token, body } = {}) {
  const res = await fetch(API + p, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

async function register(w, role) {
  const r = await call('POST', '/auth/register', { body: { role, fullName: w.name, phone: w.phone, email: w.email, password: P } });
  if (r.status !== 201) throw new Error(`register ${role} failed: ${r.status} ${JSON.stringify(r.body)}`);
  return r.body;
}

async function upload(token, bytes, type, name, folder = 'products') {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), name);
  const res = await fetch(`${API}/uploads?folder=${folder}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  let json = null;
  try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

const PNG = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d4944415478da63f8ffff3f0005fe02fea7355a1d0000000049454e44ae426082', 'hex');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, label, timeoutMs = 90000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (last) return last;
    await sleep(800);
  }
  console.log(`  (timed out waiting for ${label})`);
  return last;
}

async function publish(token, img, body) {
  const created = await call('POST', '/seller/products', { token, body: { images: [img], ...body } });
  if (created.status !== 201) throw new Error(`create failed: ${created.status} ${JSON.stringify(created.body)}`);
  const pub = await call('POST', `/seller/products/${created.body.product.id}/publish`, { token });
  if (pub.status !== 200) throw new Error(`publish failed: ${pub.status} ${JSON.stringify(pub.body)}`);
  return created.body.product.id;
}

const trousers = (i, extra = {}) => ({
  name: `Slim chinos ${S}-${i}`, category: 'mens', subcategory: 'Trousers', brand: 'Local tailor', priceUgx: 65000,
  description: 'Cotton blend chinos with a slim cut, tapered leg and a comfortable stretch waistband for daily wear.',
  specifications: [{ label: 'Material', value: 'Linen' }, { label: 'Fit', value: 'Slim' }, { label: 'Rise', value: 'High' }],
  variations: [
    { name: 'Waist', value: '32', colorName: 'Black', colorHex: '#111111', stockQuantity: 12 },
    { name: 'Waist', value: '32', colorName: 'Blue', colorHex: '#2563EB', stockQuantity: 8 },
    { name: 'Waist', value: '34', colorName: 'Black', colorHex: '#111111', stockQuantity: 5 },
    { name: 'Waist', value: '44', colorName: 'Black', colorHex: '#111111', stockQuantity: 2 },
  ],
  ...extra,
});

(async () => {
  const url = process.env.DATABASE_URL;
  const pool = new Pool({ connectionString: url, ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false } });

  async function cleanupKnowledge() {
    await pool.query(`DELETE FROM product_kinds WHERE slug IN ('jumpsuit', 'jumpsuits') AND source <> 'bootstrap'`);
    await pool.query(`DELETE FROM product_attributes WHERE key = 'rise' AND source <> 'bootstrap'`);
    await pool.query(`DELETE FROM product_attribute_options WHERE source <> 'bootstrap' AND value_norm IN ('44', 'banana', 'navy', 'linen', 'high', 'titanium black', 'full') AND observation_count = 0`);
  }
  await cleanupKnowledge();

  const sellers = [];
  for (const w of SELLERS) sellers.push(await register(w, 'seller'));
  const buyer = await register(BUYER, 'customer');
  const staff = await register(STAFF, 'shopper');
  const stores = [];
  for (let i = 0; i < sellers.length; i++) {
    const r = await call('POST', '/seller/store', { token: sellers[i].accessToken, body: { name: `Knowledge Store ${i} ${S}`, category: i === 0 ? 'mens' : 'womens', city: 'Kampala', deliveryFeeUgx: 3000 } });
    if (r.status !== 201) throw new Error(`store ${i} failed ${JSON.stringify(r.body)}`);
    stores.push(r.body.store);
  }
  const imgs = [];
  for (const s of sellers) imgs.push((await upload(s.accessToken, PNG, 'image/png', 'p.png')).body.url);
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [staff.user.id]);
  const admin = (await call('POST', '/auth/login', { body: { identifier: STAFF.phone, password: P } })).body.accessToken;

  const cats = await call('GET', '/knowledge/categories');
  check('knowledge categories come from the database with kind counts', cats.status === 200 && cats.body.categories.length >= 50 && cats.body.categories.find((c) => c.key === 'mens')?.kinds >= 8);

  const trousersForm = await call('GET', '/knowledge/form?category=mens&kind=Trousers');
  check('trousers form knowledge: waist sizes, clothing colours, material detail', trousersForm.status === 200 && trousersForm.body.versionType === 'Waist' && trousersForm.body.versions.includes('32') && trousersForm.body.colours.some((c) => c.name === 'Black') && trousersForm.body.attributes.some((a) => a.key === 'material'), JSON.stringify(trousersForm.body).slice(0, 120));
  check('a seller-typed synonym (pants) resolves to the Trousers kind', (await call('GET', '/knowledge/form?category=mens&kind=pants')).body.kind?.name === 'Trousers');
  check('waist 44 is not suggested before anyone has used it', !trousersForm.body.versions.includes('44'));
  const samsung = await call('GET', '/knowledge/form?category=phones&kind=Smartphones&brand=Samsung');
  check('brand knowledge switches the colour range (Samsung)', samsung.body.colourTitle === 'Samsung colours' && samsung.body.colours.some((c) => c.name === 'Phantom Black') && samsung.body.versions.includes('256GB'));
  const iphone = await call('GET', '/knowledge/form?category=phones&kind=Smartphones&brand=iPhone');
  check('a brand synonym (iPhone) resolves to Apple colours', iphone.body.colourTitle === 'Apple colours' && iphone.body.colours.some((c) => c.name === 'Desert Titanium'));
  const cars = await call('GET', '/knowledge/form?category=cars');
  check('car listings require make, year, mileage and transmission', cars.body.attributes.filter((a) => a.role === 'required').map((a) => a.key).includes('mileage') && cars.body.colours.some((c) => c.name === 'Pearl white'));
  const shoes = await call('GET', '/knowledge/form?category=shoes&kind=Kids shoes');
  check('kids shoes get their own size range', shoes.body.versions.includes('24') && !shoes.body.versions.includes('45'));

  const dupSpec = await call('POST', '/seller/products', { token: sellers[0].accessToken, body: { name: 'Dup', category: 'mens', priceUgx: 1000, specifications: [{ label: 'Material', value: 'Cotton' }, { label: 'material', value: 'Wool' }] } });
  check('the same detail twice is rejected', dupSpec.status === 400);
  const dupSku = await call('POST', '/seller/products', { token: sellers[0].accessToken, body: { name: 'Dup', category: 'mens', priceUgx: 1000, variations: [{ name: 'Size', value: 'S', sku: 'X1', stockQuantity: 1 }, { name: 'Size', value: 'M', sku: 'x1', stockQuantity: 1 }] } });
  check('two options with the same SKU are rejected', dupSku.status === 400);

  const p1 = await publish(sellers[0].accessToken, imgs[0], trousers(1));
  const obs1 = await waitFor(async () => {
    const r = await call('GET', `/admin/knowledge/observations?product=${p1}&limit=100`, { token: admin });
    return r.body?.observations?.length >= 8 ? r.body.observations : null;
  }, 'observations of the first product');
  check('publishing records structured observations', Array.isArray(obs1) && obs1.some((o) => o.entity_type === 'kind' && o.value === 'Trousers') && obs1.some((o) => o.attribute_key === 'waist' && o.value === '44') && obs1.some((o) => o.attribute_key === 'material' && o.value === 'Linen') && obs1.some((o) => o.entity_type === 'brand'), `${obs1?.length ?? 0} observations`);
  check('structured seller input carries full confidence and provenance', Array.isArray(obs1) && obs1.every((o) => o.source === 'seller_structured' && Number(o.confidence) === 1));
  check('a detail Duka did not know (Rise) is recorded as a candidate attribute', obs1.some((o) => o.entity_type === 'attribute' && o.attribute_key === 'rise'));

  const option44 = await waitFor(async () => {
    const r = await call('GET', '/admin/knowledge/options?attribute=waist&status=candidate&q=44', { token: admin });
    const o = r.body?.options?.find((x) => x.value === '44' && x.kind_name === 'Trousers');
    return o && Number(o.seller_count) >= 1 ? o : null;
  }, 'waist 44 counts');
  check('one seller using waist 44 makes it a candidate, not a standard', !!option44 && option44.status === 'candidate' && Number(option44.seller_count) === 1);
  const stillNo44 = await call('GET', '/knowledge/form?category=mens&kind=Trousers');
  check('the seller form does not suggest a value seen from a single seller', !stillNo44.body.versions.includes('44'));
  const suggestions1 = await call('GET', '/admin/knowledge/suggestions', { token: admin });
  check('admin suggestions list the candidate attribute with example values', suggestions1.body.attributes.some((a) => a.key === 'rise' && String(a.examples ?? '').includes('High')));

  const pub1 = await call('GET', `/marketplace/products/${p1}`);
  check('buyers see structured attributes on the product page', pub1.status === 200 && pub1.body.product.attributes.some((a) => a.key === 'waist' && a.value === '32') && pub1.body.product.attributes.some((a) => a.key === 'material' && a.value === 'Linen') && pub1.body.product.attributes.some((a) => a.key === 'brand'));
  check('variant stock stays per waist and colour', pub1.body.product.variations.find((v) => v.value === '32' && v.colorName === 'Blue')?.available === 8 && pub1.body.product.variations.find((v) => v.value === '34' && v.colorName === 'Black')?.available === 5);

  const facets = await call('GET', '/knowledge/filters?category=mens');
  check('marketplace filters are built from structured attributes', facets.status === 200 && facets.body.filters.some((f) => f.key === 'waist' && f.values.some((v) => v.value === '32')) && facets.body.filters.some((f) => f.key === 'colour' && f.values.some((v) => v.value === 'Black' && v.hex)));
  const hit = await call('GET', `/marketplace/products?category=mens&attr_waist=34`);
  const miss = await call('GET', `/marketplace/products?category=mens&attr_waist=36`);
  check('attribute filters narrow the marketplace', hit.body.products.some((p) => p.id === p1) && !miss.body.products.some((p) => p.id === p1));
  const colourHit = await call('GET', `/marketplace/products?category=mens&attr_colour=Blue&attr_waist=32`);
  check('filters combine (blue and waist 32)', colourHit.body.products.some((p) => p.id === p1));

  const search = await call('GET', `/marketplace/search?q=${encodeURIComponent('black trousers size 32')}`);
  check('search understands kind, colour and waist', search.status === 200 && search.body.interpretation.kind === 'Trousers' && search.body.interpretation.colour === 'Black' && (search.body.interpretation.attributes.waist ?? []).includes('32'), JSON.stringify(search.body.interpretation));
  check('interpreted search finds the product with knowledge', search.body.usedKnowledge === true && search.body.products.some((p) => p.id === p1));
  const search2 = await call('GET', `/marketplace/search?q=${encodeURIComponent('samsung 512gb')}`);
  check('search understands brand and storage', search2.body.interpretation.brand === 'Samsung' && (search2.body.interpretation.attributes.storage ?? []).includes('512GB'));
  const search3 = await call('GET', `/marketplace/search?q=${encodeURIComponent('pants 44 waist')}`);
  check('search maps a synonym and a bare number to the kind and its variant', search3.body.interpretation.kind === 'Trousers' && (search3.body.interpretation.attributes.waist ?? []).includes('44'));
  const interpretOnly = await call('GET', `/knowledge/interpret?q=${encodeURIComponent('red iphone 256gb')}`);
  check('the interpreter is exposed on its own', interpretOnly.body.interpretation.brand === 'Apple' && interpretOnly.body.interpretation.colour === 'Red' && (interpretOnly.body.interpretation.attributes.storage ?? []).includes('256GB'));

  const phoneId = await publish(sellers[0].accessToken, imgs[0], {
    name: `Galaxy S25 Ultra ${S}`, category: 'phones', subcategory: 'Smartphones', priceUgx: 4800000,
    description: 'Samsung flagship with 512GB storage and 12GB RAM, Titanium Black, sealed with a one year warranty.',
    variations: [{ name: 'Storage', value: '512GB', colorName: 'Titanium Black', colorHex: '#2B2B2E', stockQuantity: 3 }],
  });
  const phoneObs = await waitFor(async () => {
    const r = await call('GET', `/admin/knowledge/observations?product=${phoneId}&limit=100`, { token: admin });
    return r.body?.observations?.some((o) => o.entity_type === 'brand') ? r.body.observations : null;
  }, 'phone observations');
  check('a brand missing from the form is inferred from the name with lower confidence', Array.isArray(phoneObs) && phoneObs.some((o) => o.entity_type === 'brand' && o.value === 'Samsung' && o.source === 'system_inference' && Number(o.confidence) < 0.9));
  check('RAM read out of the description is recorded as seller text, not fact', Array.isArray(phoneObs) && phoneObs.some((o) => o.attribute_key === 'ram' && o.value === '12GB' && o.source === 'seller_description'));
  const phonePublic = await call('GET', `/marketplace/products/${phoneId}`);
  check('buyers only see attributes the seller entered, not inferred ones', phonePublic.body.product.attributes.some((a) => a.key === 'storage' && a.value === '512GB') && !phonePublic.body.product.attributes.some((a) => a.key === 'ram'));
  const samsungForm = await call('GET', '/knowledge/form?category=phones&kind=Smartphones&brand=Samsung');
  check('a colour used by one seller does not become a brand standard yet', samsungForm.body.colours.some((c) => c.name === 'Titanium Black'));

  const p2 = await publish(sellers[1].accessToken, imgs[1], trousers(2, { category: 'mens' }));
  const p3 = await publish(sellers[2].accessToken, imgs[2], trousers(3, { category: 'mens', variations: [{ name: 'Waist', value: '44', colorName: 'Banana', colorHex: '#F5D142', stockQuantity: 1 }, { name: 'Waist', value: '36', colorName: 'Navy', colorHex: '#1F3A93', stockQuantity: 1 }] }));
  const promoted = await waitFor(async () => {
    const r = await call('GET', '/admin/knowledge/options?attribute=waist&q=44&status=active', { token: admin });
    return r.body?.options?.find((o) => o.value === '44' && o.kind_name === 'Trousers') ?? null;
  }, 'promotion of waist 44');
  check('after three sellers, waist 44 is promoted automatically', !!promoted && Number(promoted.seller_count) >= 3 && Number(promoted.confidence) >= 0.85, promoted ? `${promoted.seller_count} sellers, confidence ${promoted.confidence}` : 'not promoted');
  const formNow = await call('GET', '/knowledge/form?category=mens&kind=Trousers');
  check('the seller form now suggests waist 44', formNow.body.versions.includes('44'));
  const audit = await call('GET', '/admin/knowledge/audit?limit=50', { token: admin });
  check('the promotion is written to the audit trail by the rules engine', audit.body.audit.some((a) => a.action === 'promote' && a.actor_type === 'system' && a.entity_id === promoted?.id));
  const explain = await call('GET', `/admin/knowledge/explain?entity=option&id=${promoted?.id}`, { token: admin });
  check('admins can ask why Duka believes something', explain.status === 200 && explain.body.summary.sellers >= 3 && explain.body.products.length >= 3 && explain.body.history.some((h) => h.action === 'promote'));

  const banana = (await call('GET', '/admin/knowledge/options?attribute=colour&q=banana', { token: admin })).body.options.find((o) => o.value === 'Banana');
  check('a one-off colour (Banana) stays a candidate', !!banana && banana.status === 'candidate');
  check('Banana is not offered to other sellers', !formNow.body.colours.some((c) => c.name === 'Banana'));
  const rejectBanana = await call('POST', `/admin/knowledge/option/${banana.id}/reject`, { token: admin, body: { reason: 'Not a colour' } });
  check('admin can reject a learned value', rejectBanana.status === 200 && rejectBanana.body.row.status === 'rejected');
  const editedP3 = await call('PATCH', `/seller/products/${p3}`, { token: sellers[2].accessToken, body: { name: `Slim chinos ${S}-3 edited` } });
  await sleep(4000);
  const bananaAfter = (await call('GET', `/admin/knowledge/options?attribute=colour&q=banana&status=all`, { token: admin })).body.options.find((o) => o.id === banana.id);
  check('a seller re-saving their product cannot undo an admin rejection', editedP3.status === 200 && bananaAfter?.status === 'rejected');

  const navy = (await call('GET', '/admin/knowledge/options?attribute=colour&q=navy&status=candidate', { token: admin })).body.options.find((o) => o.value === 'Navy' && o.kind_name === 'Trousers');
  const navyBlue = (await call('GET', '/admin/knowledge/options?attribute=colour&q=navy%20blue&status=active', { token: admin })).body.options.find((o) => o.value === 'Navy blue' && o.kind_category === null && !o.brand_slug && o.kind_name === null);
  const merged = navy && navyBlue ? await call('POST', `/admin/knowledge/option/${navy.id}/merge`, { token: admin, body: { targetId: navyBlue.id } }) : { status: 0, body: null };
  check('admin can merge a learned value into a standard one', merged.status === 200 && merged.body.row.status === 'deprecated' && merged.body.row.merged_into === navyBlue?.id, navy ? '' : 'Navy candidate missing');

  const rise = (await call('GET', '/admin/knowledge/attributes?status=candidate&q=rise', { token: admin })).body.attributes.find((a) => a.key === 'rise');
  check('an attribute seen from three sellers still waits for admin (threshold five)', !!rise && rise.status === 'candidate' && Number(rise.seller_count) === 3);
  const approveRise = await call('POST', `/admin/knowledge/attribute/${rise.id}/approve`, { token: admin, body: { reason: 'Useful for trousers' } });
  const riseLink = (await call('GET', '/admin/knowledge/suggestions', { token: admin })).body.kindAttributes.find((k) => k.attribute_key === 'rise' && k.kind_name === 'Trousers');
  const approveLink = riseLink ? await call('POST', `/admin/knowledge/kind_attribute/${riseLink.id}/approve`, { token: admin }) : { status: 0 };
  const formWithRise = await call('GET', '/knowledge/form?category=mens&kind=Trousers');
  check('once approved, the attribute is suggested to sellers of that kind', approveRise.status === 200 && approveLink.status === 200 && formWithRise.body.attributes.some((a) => a.key === 'rise'));
  const highCandidate = (await call('GET', '/admin/knowledge/options?attribute=rise&status=candidate', { token: admin })).body.options.find((o) => o.value === 'High');
  check('its values stay candidates until enough sellers agree (rise is not low-risk)', !!highCandidate && Number(highCandidate.seller_count) === 3);

  const jumpsuit = (i) => ({
    name: `Linen jumpsuit ${S}-${i}`, category: 'womens', subcategory: 'Jumpsuit', priceUgx: 90000,
    description: 'Wide leg linen jumpsuit with a belted waist, breathable and light for Kampala afternoons.',
    specifications: [{ label: 'Material', value: 'Linen' }, { label: 'Length', value: 'Full' }],
    variations: [{ name: 'Size', value: 'S', colorName: 'Cream', colorHex: '#F3EBD3', stockQuantity: 2 }, { name: 'Size', value: 'M', colorName: 'Cream', colorHex: '#F3EBD3', stockQuantity: 2 }],
  });
  const j1 = await publish(sellers[0].accessToken, imgs[0], jumpsuit(1));
  await publish(sellers[1].accessToken, imgs[1], jumpsuit(2));
  await publish(sellers[2].accessToken, imgs[2], jumpsuit(3));
  const jumpsuitKind = await waitFor(async () => {
    const r = await call('GET', '/admin/knowledge/kinds?status=candidate&category=womens&q=jumpsuit', { token: admin });
    const k = r.body?.kinds?.find((x) => x.name === 'Jumpsuit');
    return k && Number(k.seller_count) >= 3 ? k : null;
  }, 'jumpsuit kind');
  check('an unknown kind used by three sellers is proposed with its candidate attributes', !!jumpsuitKind && jumpsuitKind.status === 'candidate' && String(jumpsuitKind.examples ?? '').includes('jumpsuit'), jumpsuitKind ? `${jumpsuitKind.seller_count} sellers` : 'missing');
  const jumpsuitSuggestion = (await call('GET', '/admin/knowledge/suggestions', { token: admin })).body.kinds.find((k) => k.id === jumpsuitKind?.id);
  check('the suggestion lists the attributes sellers gave it (size, material, length)', !!jumpsuitSuggestion && ['size', 'material', 'length'].every((k) => String(jumpsuitSuggestion.candidate_attributes ?? '').includes(k)));
  const beforeApprove = await call('GET', '/knowledge/form?category=womens');
  check('a candidate kind is not offered to sellers yet', !beforeApprove.body.kinds.some((k) => k.name === 'Jumpsuit'));
  const approveKind = await call('POST', `/admin/knowledge/kind/${jumpsuitKind.id}/approve`, { token: admin });
  const sizeLink = (await call('GET', '/admin/knowledge/suggestions', { token: admin })).body.kindAttributes.filter((k) => k.kind_name === 'Jumpsuit');
  for (const link of sizeLink) await call('POST', `/admin/knowledge/kind_attribute/${link.id}/approve`, { token: admin });
  const jumpsuitForm = await call('GET', '/knowledge/form?category=womens&kind=Jumpsuit');
  check('after approval the new kind powers the form: sizes learned from sellers, material and length details', approveKind.status === 200 && jumpsuitForm.body.kind?.name === 'Jumpsuit' && jumpsuitForm.body.versionType === 'Size' && jumpsuitForm.body.versions.includes('S') && jumpsuitForm.body.attributes.some((a) => a.key === 'material'), JSON.stringify({ v: jumpsuitForm.body.versions, a: jumpsuitForm.body.attributes.map((a) => a.key) }));
  const renamed = await call('POST', `/admin/knowledge/kind/${jumpsuitKind.id}/rename`, { token: admin, body: { name: 'Jumpsuits' } });
  const oldName = await call('GET', '/knowledge/form?category=womens&kind=Jumpsuit');
  check('renaming keeps the old name as a synonym', renamed.status === 200 && oldName.body.kind?.name === 'Jumpsuits');
  const jumpsuitSearch = await call('GET', `/marketplace/search?q=${encodeURIComponent('cream jumpsuit size m')}`);
  check('search learns the new kind too', jumpsuitSearch.body.interpretation.kind === 'Jumpsuits' && jumpsuitSearch.body.products.some((p) => p.id === j1), JSON.stringify(jumpsuitSearch.body.interpretation));

  const compare = await call('GET', `/marketplace/compare?ids=${p1},${p2}`);
  check('products compare on shared structured attributes', compare.status === 200 && compare.body.products.length === 2 && compare.body.rows.some((r) => r.key === 'material' && r.values.every((v) => v === 'Linen')) && compare.body.rows.some((r) => r.key === 'waist'));

  const sellerAdmin = await call('GET', '/admin/knowledge/overview', { token: sellers[0].accessToken });
  const buyerAct = await call('POST', `/admin/knowledge/option/${promoted?.id}/reject`, { token: buyer.accessToken });
  check('sellers and buyers cannot touch global knowledge', sellerAdmin.status === 403 && buyerAct.status === 403);
  const overview = await call('GET', '/admin/knowledge/overview', { token: admin });
  check('admin overview reports observations, sellers and rules', overview.status === 200 && overview.body.observations.total > 20 && overview.body.sellersObserved >= 3 && overview.body.rules.option.lowRisk.sellers === 2);
  const brandRow = (await call('GET', '/admin/knowledge/brands?q=local%20tailor', { token: admin })).body.brands.find((b) => b.name === 'Local tailor');
  check('brand knowledge tracks the categories a brand is seen in', !!brandRow && (brandRow.categories ?? []).some((c) => c.category === 'mens' && c.observations >= 3));

  const deprecate44 = await call('POST', `/admin/knowledge/option/${promoted?.id}/deprecate`, { token: admin, body: { reason: 'Testing disable' } });
  const formAfterDisable = await call('GET', '/knowledge/form?category=mens&kind=Trousers');
  check('admin can disable a value and it leaves the form immediately', deprecate44.status === 200 && !formAfterDisable.body.versions.includes('44'));

  await cleanupKnowledge();
  console.log(`\n${results.filter(Boolean).length}/${results.length} checks passed`);
  console.log('CLEANUP: node scripts/purge-test-data.cjs --apply');
  await pool.end();
  process.exit(results.every(Boolean) ? 0 : 1);
})().catch((e) => { console.error('RUN FAILED', e); process.exit(1); });
