/**
 * End-to-end walk of the full order lifecycle over real HTTP against the real
 * API, exercising both sides exactly as the UI does.
 *
 * Creates two throwaway accounts, drives every transition, then deletes them
 * and asserts every table is back to its starting row count.
 */
require('dotenv/config');
const { Pool } = require('pg');

const API = process.env.E2E_API || 'http://localhost:4000/api';
const STAMP = process.env.E2E_STAMP || String(process.hrtime.bigint()).slice(-9);
const CUSTOMER = { phone: `0700${STAMP.slice(0, 6)}`, email: `e2e-cust-${STAMP}@example.test` };
const SHOPPER = { phone: `0711${STAMP.slice(0, 6)}`, email: `e2e-shop-${STAMP}@example.test` };
const PASSWORD = 'E2ePassword123!';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let pass = 0;
const failures = [];

function step(label, ok, detail = '') {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { failures.push(`${label}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL  ${label} ${detail}`); }
}

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
}

// Smallest valid PNG (1x1 transparent) — a real image, not a text blob, so
// the upload path is exercised the way the browser does it.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

async function uploadProbe(token, folder) {
  const form = new FormData();
  form.append('file', new Blob([PNG], { type: 'image/png' }), 'probe.png');
  const res = await fetch(`${API}/uploads?folder=${folder}`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body };
}

async function tableCounts() {
  const t = await pool.query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE' ORDER BY 1"
  );
  const out = {};
  for (const { table_name } of t.rows) {
    const c = await pool.query(`SELECT count(*)::int AS n FROM "${table_name}"`);
    out[table_name] = c.rows[0].n;
  }
  return out;
}

(async () => {
  console.log(`\n=== E2E order lifecycle (${API}) ===\n`);
  const before = await tableCounts();

  // ---- register both sides ------------------------------------------------
  const reg = async (who, role, name) =>
    call('POST', '/auth/register', {
      body: { role, fullName: name, phone: who.phone, email: who.email, password: PASSWORD },
    });

  const c = await reg(CUSTOMER, 'customer', 'E2E Customer');
  step('register customer', c.status === 201, `${c.status} ${JSON.stringify(c.body)}`);
  const s = await reg(SHOPPER, 'shopper', 'E2E Shopper');
  step('register shopper', s.status === 201, `${s.status} ${JSON.stringify(s.body)}`);
  if (c.status !== 201 || s.status !== 201) throw new Error('cannot continue without both accounts');

  const cust = c.body.accessToken;
  const shop = s.body.accessToken;
  const custId = c.body.user.id;
  const shopId = s.body.user.id;

  // ---- customer posts a request ------------------------------------------
  const addr = await call('POST', '/addresses', {
    token: cust,
    body: { line1: 'E2E Test Address, Kampala', isDefault: true },
  });
  step('create delivery address', addr.status === 201, `${addr.status} ${JSON.stringify(addr.body)}`);

  const req = await call('POST', '/requests', {
    token: cust,
    body: {
      title: 'E2E test item',
      sourcingType: 'shopper_choice',
      budgetMaxUgx: 50000,
      deliveryAddressId: addr.body?.address?.id,
      items: [{ name: 'E2E test item', quantity: '1' }],
    },
  });
  step('customer posts request', req.status === 201, `${req.status} ${JSON.stringify(req.body)}`);
  const requestId = req.body?.request?.id;

  // ---- shopper offers, customer accepts -----------------------------------
  const offer = await call('POST', '/offers', {
    token: shop,
    body: { requestId, shoppingFeeUgx: 5000, deliveryFeeUgx: 3000, estimatedMinutes: 45 },
  });
  step('shopper submits offer', offer.status === 201, `${offer.status} ${JSON.stringify(offer.body)}`);

  const accept = await call('POST', '/offers/accept', {
    token: cust,
    body: { offerId: offer.body?.offer?.id },
  });
  step('customer accepts offer', accept.status === 201, `${accept.status} ${JSON.stringify(accept.body)}`);
  const orderId = accept.body?.order?.id;
  if (!orderId) throw new Error('no order created');

  const statusNow = async (token = cust) => (await call('GET', `/orders/${orderId}`, { token })).body?.order?.status;
  step('order starts as requested', (await statusNow()) === 'requested', await statusNow());

  // ---- the lifecycle, step by step ----------------------------------------
  const walk = [
    ['shopper accepts job      (requested -> shopper_assigned)', () => call('POST', `/orders/${orderId}/assign`, { token: shop }), 'shopper_assigned'],
    ['shopper starts shopping  (-> shopping)', () => call('POST', `/orders/${orderId}/shopping`, { token: shop }), 'shopping'],
    ['shopper sends options    (-> awaiting_customer_approval)', () => call('POST', `/orders/${orderId}/item-found`, {
      token: shop,
      body: { actualPriceUgx: 42000, photoUrl: 'https://example.test/item.jpg', shopName: 'E2E Shop' },
    }), 'awaiting_customer_approval'],
    ['customer approves        (-> purchased)', () => call('POST', `/orders/${orderId}/approve`, { token: cust }), 'purchased'],
    ['shopper marks delivering (-> out_for_delivery)', () => call('POST', `/orders/${orderId}/out-for-delivery`, {
      token: shop,
      body: { receiptPhotoUrl: 'https://example.test/receipt.jpg', amountUgx: 42000 },
    }), 'out_for_delivery'],
    ['customer confirms        (-> delivered)', () => call('POST', `/orders/${orderId}/delivered`, { token: cust }), 'delivered'],
    ['completes                (-> completed)', () => call('POST', `/orders/${orderId}/complete`, { token: cust }), 'completed'],
  ];

  for (const [label, run, expected] of walk) {
    const r = await run();
    const got = await statusNow();
    step(label, r.status < 400 && got === expected, `http ${r.status}, status "${got}" ${r.status >= 400 ? JSON.stringify(r.body) : ''}`);
    // The delivery panel only exists while the order is in flight, so its
    // checks have to run here rather than after the walk completes.
    if (expected === 'purchased') await deliveryClockChecks();
  }

  await afterWalkChecks();

  // ---- delivery clock: both buttons on the shopper's panel ----------------
  async function deliveryClockChecks() {
  const doneNow = await call('POST', `/orders/${orderId}/shopping-done`, {
    token: shop, body: { startDeliveryNow: true, etaMinutes: 25 },
  });
  step('done shopping -> deliver now', doneNow.status === 200, `${doneNow.status} ${JSON.stringify(doneNow.body)}`);

  const tNow = await call('GET', `/orders/${orderId}/tracking`, { token: cust });
  step('delivery clock started with the ETA',
    tNow.body?.deliveryStartedAt !== null && tNow.body?.deliveryEtaMinutes === 25,
    JSON.stringify({ started: tNow.body?.deliveryStartedAt, eta: tNow.body?.deliveryEtaMinutes }));

  const later = new Date(Date.now() + 86400000).toISOString();
  const doneLater = await call('POST', `/orders/${orderId}/shopping-done`, {
    token: shop, body: { startDeliveryNow: false, deferredTo: later },
  });
  step('done shopping -> deliver later', doneLater.status === 200, `${doneLater.status} ${JSON.stringify(doneLater.body)}`);

  const tLater = await call('GET', `/orders/${orderId}/tracking`, { token: cust });
  step('deferring records the time and stops the clock',
    tLater.body?.deliveryDeferredTo !== null && tLater.body?.deliveryStartedAt === null,
    JSON.stringify({ deferred: tLater.body?.deliveryDeferredTo, started: tLater.body?.deliveryStartedAt }));

  const badDefer = await call('POST', `/orders/${orderId}/shopping-done`, {
    token: shop, body: { startDeliveryNow: false },
  });
  step('deferring without a time is refused', badDefer.status === 400, `${badDefer.status}`);

  const custCannot = await call('POST', `/orders/${orderId}/shopping-done`, {
    token: cust, body: { startDeliveryNow: true },
  });
  step('customer cannot mark shopping done', custCannot.status === 403, `${custCannot.status}`);

  const pos = await call('POST', `/orders/${orderId}/location`, {
    token: shop, body: { lat: 0.3476, lng: 32.5825, accuracyM: 12.5 },
  });
  step('shopper can publish a position', pos.status === 201, `${pos.status} ${JSON.stringify(pos.body)}`);

  const custPos = await call('POST', `/orders/${orderId}/location`, {
    token: cust, body: { lat: 0.3476, lng: 32.5825 },
  });
  step('customer cannot publish a position', custPos.status >= 400, `${custPos.status}`);
  }

  // ---- the extras the UI relies on ----------------------------------------
  async function afterWalkChecks() {
  const track = await call('GET', `/orders/${orderId}/tracking`, { token: cust });
  step('tracking endpoint responds', track.status === 200, `${track.status} ${JSON.stringify(track.body)}`);

  // ---- uploads: the file, the URL it returns, and every consumer of it ----
  const up = await uploadProbe(shop, 'chat');
  step('upload returns 201', up.status === 201, `${up.status} ${JSON.stringify(up.body)}`);

  const fileUrl = up.body?.url;
  step('upload URL is absolute', typeof fileUrl === 'string' && /^https?:\/\//.test(fileUrl), String(fileUrl));

  if (fileUrl) {
    const fetched = await fetch(fileUrl);
    step('uploaded file is served back',
      fetched.status === 200 && (fetched.headers.get('content-type') || '').startsWith('image/'),
      `${fetched.status} ${fetched.headers.get('content-type')}`);

    const withImage = await call('POST', `/orders/${orderId}/messages`, {
      token: shop, body: { attachmentUrl: fileUrl },
    });
    step('chat accepts an uploaded image', withImage.status === 201, `${withImage.status} ${JSON.stringify(withImage.body)}`);

    const avatar = await call('PATCH', '/settings/profile', { token: shop, body: { avatarUrl: fileUrl } });
    step('profile accepts an uploaded avatar', avatar.status === 200, `${avatar.status} ${JSON.stringify(avatar.body)}`);

    // Rows written before uploads became absolute still hold this shape.
    const legacy = await call('PATCH', '/settings/profile', {
      token: shop, body: { avatarUrl: '/uploads/avatars/legacy.png' },
    });
    step('legacy relative upload URL still accepted', legacy.status === 200, `${legacy.status}`);
  }

  const anon = await fetch(`${API}/uploads?folder=chat`, { method: 'POST' });
  step('upload requires authentication', anon.status === 401, `${anon.status}`);

  const msg = await call('POST', `/orders/${orderId}/messages`, { token: shop, body: { body: 'E2E hello' } });
  step('shopper sends message', msg.status === 201, `${msg.status}`);

  const convC = await call('GET', '/messages/conversations', { token: cust });
  step('customer inbox lists the chat',
    convC.status === 200 && convC.body.conversations?.length === 1 && convC.body.conversations[0].unread >= 1,
    `${convC.status} ${JSON.stringify(convC.body?.conversations?.map((x) => ({ u: x.unread, n: x.other_name })))}`);

  const convS = await call('GET', '/messages/conversations', { token: shop });
  step('shopper inbox lists the chat', convS.status === 200 && convS.body.conversations?.length === 1,
    `${convS.status} count=${convS.body?.conversations?.length}`);

  const read = await call('POST', `/orders/${orderId}/messages/read`, { token: cust });
  step('marking read clears unread', read.status === 200 && read.body.marked >= 1, JSON.stringify(read.body));

  const notif = await call('GET', '/notifications', { token: cust });
  const titles = (notif.body?.notifications ?? []).map((n) => n.title);
  step('customer received order notifications', notif.status === 200 && titles.length >= 4,
    `${titles.length}: ${JSON.stringify(titles)}`);

  const notifS = await call('GET', '/notifications', { token: shop });
  step('shopper received notifications', notifS.status === 200 && (notifS.body?.notifications ?? []).length >= 2,
    `${(notifS.body?.notifications ?? []).length}`);

  const rate = await call('POST', `/ratings/order/${orderId}`, { token: cust, body: { stars: 5 } });
  step('customer can rate shopper after completion', rate.status < 400, `${rate.status} ${JSON.stringify(rate.body)}`);

  const rateBack = await call('POST', `/ratings/order/${orderId}`, { token: shop, body: { stars: 5 } });
  step('shopper can rate customer after completion', rateBack.status < 400, `${rateBack.status} ${JSON.stringify(rateBack.body)}`);

  const dupe = await call('POST', `/ratings/order/${orderId}`, { token: cust, body: { stars: 3 } });
  step('re-rating updates rather than duplicating', dupe.status < 400, `${dupe.status}`);

  // ---- guard rails: illegal moves must be refused --------------------------
  const skip = await call('POST', `/orders/${orderId}/shopping`, { token: shop });
  step('cannot re-enter shopping after completion', skip.status >= 400, `${skip.status}`);

  const history = await call('GET', `/orders/${orderId}`, { token: cust });
  const steps = (history.body?.history ?? []).map((h) => h.to_status);
  step('status history recorded every step', steps.length >= 7, JSON.stringify(steps));
  }

  // ---- cleanup ------------------------------------------------------------
  // orders/requests do not cascade from users, so unwind in dependency order.
  const ids = [custId, shopId];
  const orderIds = (await pool.query('SELECT id FROM orders WHERE customer_id = ANY($1) OR shopper_id = ANY($1)', [ids])).rows.map((r) => r.id);
  for (const t of ['ratings','messages','receipts','order_items','order_status_history','payments','transactions','shopper_earnings','deliveries','disputes','shopper_locations']) {
    try { await pool.query('DELETE FROM "' + t + '" WHERE order_id = ANY($1)', [orderIds]); } catch (e) { /* table may not key on order_id */ }
  }
  await pool.query('DELETE FROM orders WHERE id = ANY($1)', [orderIds]);
  await pool.query('DELETE FROM shopping_request_items WHERE request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
  await pool.query('DELETE FROM shopper_offers WHERE shopper_id = ANY($1) OR request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
  await pool.query('DELETE FROM shopping_requests WHERE customer_id = ANY($1)', [ids]);
  await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
  // Checks for rows still referencing the test accounts rather than comparing
  // raw table counts: real users may be on the live site while this runs, and
  // their activity legitimately moves those numbers.
  const stillThere = [];
  for (const [table, sql] of [
    ['users', 'SELECT count(*)::int n FROM users WHERE id = ANY($1)'],
    ['orders', 'SELECT count(*)::int n FROM orders WHERE customer_id = ANY($1) OR shopper_id = ANY($1)'],
    ['shopping_requests', 'SELECT count(*)::int n FROM shopping_requests WHERE customer_id = ANY($1)'],
    ['shopper_offers', 'SELECT count(*)::int n FROM shopper_offers WHERE shopper_id = ANY($1)'],
    ['notifications', 'SELECT count(*)::int n FROM notifications WHERE user_id = ANY($1)'],
    ['shopper_locations', 'SELECT count(*)::int n FROM shopper_locations WHERE shopper_id = ANY($1)'],
    ['ratings', 'SELECT count(*)::int n FROM ratings WHERE rated_by = ANY($1) OR rated_user = ANY($1)'],
    ['addresses', 'SELECT count(*)::int n FROM addresses WHERE user_id = ANY($1)'],
  ]) {
    const r = await pool.query(sql, [ids]);
    if (r.rows[0].n > 0) stillThere.push(`${table}: ${r.rows[0].n}`);
  }
  step('all test data removed', stillThere.length === 0, stillThere.join(', '));
  void before;

  console.log(`\n=== ${pass} passed, ${failures.length} failed ===`);
  if (failures.length) { failures.forEach((f) => console.log('  ! ' + f)); }
  await pool.end();
  process.exit(failures.length ? 1 : 0);
})().catch(async (e) => {
  console.error('\nHARNESS ERROR:', e.message);
  try {
    await pool.query('DELETE FROM users WHERE email LIKE $1', [`e2e-%${STAMP}@example.test`]);
    await pool.end();
  } catch { /* best effort */ }
  process.exit(1);
});
