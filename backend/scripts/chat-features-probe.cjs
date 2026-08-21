/**
 * Proves the chat's presence, delivery-receipt and voice-note behaviour over
 * real HTTP, in the exact order the two clients would produce it.
 *
 * The receipt ladder is the fiddly part and the reason this exists: a message
 * must read "sent" while the other side is away, flip to "delivered" the moment
 * their client fetches anything, and only then to "read". Getting those three
 * states in the wrong order is invisible in a typecheck and obvious to a user.
 *
 * Creates two throwaway accounts and one order, then deletes them.
 */
require('dotenv/config');
const { Pool } = require('pg');

const API = process.env.E2E_API || 'http://localhost:4000/api';
const STAMP = String(process.hrtime.bigint()).slice(-9);
const CUSTOMER = { phone: `0722${STAMP.slice(0, 6)}`, email: `chat-cust-${STAMP}@example.test` };
const SHOPPER = { phone: `0733${STAMP.slice(0, 6)}`, email: `chat-shop-${STAMP}@example.test` };
const PASSWORD = 'E2ePassword123!';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

let pass = 0;
const failures = [];
const step = (label, ok, detail = '') => {
  if (ok) { pass++; console.log(`  PASS  ${label}`); }
  else { failures.push(`${label}${detail ? ' — ' + detail : ''}`); console.log(`  FAIL  ${label} ${detail}`); }
};

async function call(method, path, { token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* empty body */ }
  return { status: res.status, body: json };
}

async function uploadBlob(token, bytes, type, filename) {
  const form = new FormData();
  form.append('file', new Blob([bytes], { type }), filename);
  const res = await fetch(`${API}/uploads?folder=chat`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form,
  });
  let body = null;
  try { body = await res.json(); } catch { /* non-json */ }
  return { status: res.status, body };
}

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
);
// A webm header is enough — nothing decodes the audio, it is stored and served.
const WEBM = Buffer.from('GkXfo59ChoEBQveBAULygQRC84EIQoKEd2VibUKHgQRChYECGFOAZwE=', 'base64');

/** The state the UI would render for a message the sender is looking at. */
function tickState(m) {
  if (m.read_at) return 'read';
  if (m.delivered_at) return 'delivered';
  return 'sent';
}

(async () => {
  console.log(`\n=== chat features probe (${API}) ===\n`);
  const ids = [];
  let orderId = null;

  try {
    // ---- two accounts and one order --------------------------------------
    const reg = (who, role, name) => call('POST', '/auth/register', {
      body: { role, fullName: name, phone: who.phone, email: who.email, password: PASSWORD },
    });
    const c = await reg(CUSTOMER, 'customer', 'Chat Customer');
    const s = await reg(SHOPPER, 'shopper', 'Chat Shopper');
    if (c.status !== 201 || s.status !== 201) {
      throw new Error(`register failed ${c.status}/${s.status} ${JSON.stringify(c.body || s.body)}`);
    }
    const cust = c.body.accessToken;
    const shop = s.body.accessToken;
    const custId = c.body.user.id;
    const shopId = s.body.user.id;
    ids.push(custId, shopId);

    const addr = await call('POST', '/addresses', {
      token: cust, body: { line1: 'Chat Probe Address, Kampala', isDefault: true },
    });
    const req = await call('POST', '/requests', {
      token: cust,
      body: {
        title: 'Chat probe item', sourcingType: 'shopper_choice', budgetMaxUgx: 50000,
        deliveryAddressId: addr.body?.address?.id, items: [{ name: 'Chat probe item', quantity: '1' }],
      },
    });
    const offer = await call('POST', '/offers', {
      token: shop,
      body: { requestId: req.body?.request?.id, shoppingFeeUgx: 5000, deliveryFeeUgx: 3000, estimatedMinutes: 45 },
    });
    const accept = await call('POST', '/offers/accept', { token: cust, body: { offerId: offer.body?.offer?.id } });
    orderId = accept.body?.order?.id;
    if (!orderId) throw new Error(`no order created: ${accept.status} ${JSON.stringify(accept.body)}`);
    step('order created for the thread', true);

    // ---- presence --------------------------------------------------------
    // Registering was an authenticated round-trip for neither of them, but
    // every call since has been, so both should be stamped.
    const seen = await pool.query('SELECT id, last_seen_at FROM users WHERE id = ANY($1)', [[custId, shopId]]);
    step('last_seen_at is stamped by authenticated requests',
      seen.rows.length === 2 && seen.rows.every((r) => r.last_seen_at !== null),
      JSON.stringify(seen.rows.map((r) => r.last_seen_at)));

    const convC1 = await call('GET', '/messages/conversations', { token: cust });
    const threadC = convC1.body?.conversations?.find((x) => x.order_id === orderId);
    step('conversation reports the counterparty online', threadC?.other_online === true,
      `other_online=${threadC?.other_online}`);

    // Push the shopper's presence back beyond the window and confirm it flips.
    await pool.query("UPDATE users SET last_seen_at = now() - interval '10 minutes' WHERE id = $1", [shopId]);
    const convC2 = await call('GET', '/messages/conversations', { token: cust });
    const threadC2 = convC2.body?.conversations?.find((x) => x.order_id === orderId);
    step('a stale last_seen_at reads as offline', threadC2?.other_online === false,
      `other_online=${threadC2?.other_online}`);
    step('offline still reports when they were last seen', !!threadC2?.other_last_seen_at,
      String(threadC2?.other_last_seen_at));

    // ---- the receipt ladder ----------------------------------------------
    const sent = await call('POST', `/orders/${orderId}/messages`, {
      token: cust, body: { body: 'Receipt ladder probe' },
    });
    step('message sends', sent.status === 201, `${sent.status} ${JSON.stringify(sent.body)}`);
    const messageId = sent.body?.message?.id;

    const one = await pool.query('SELECT delivered_at, read_at FROM messages WHERE id = $1', [messageId]);
    step('1 tick: undelivered while the shopper is away', tickState(one.rows[0]) === 'sent',
      tickState(one.rows[0]));

    // The shopper opens the app — the inbox alone must earn the second tick,
    // without them opening this particular thread.
    await call('GET', '/messages/conversations', { token: shop });
    const two = await pool.query('SELECT delivered_at, read_at FROM messages WHERE id = $1', [messageId]);
    step('2 black ticks: delivered once their client fetches the inbox',
      tickState(two.rows[0]) === 'delivered', tickState(two.rows[0]));

    // Now they open the thread and read it.
    await call('POST', `/orders/${orderId}/messages/read`, { token: shop });
    const three = await pool.query('SELECT delivered_at, read_at FROM messages WHERE id = $1', [messageId]);
    step('2 green ticks: read after opening the thread', tickState(three.rows[0]) === 'read',
      tickState(three.rows[0]));
    step('a read message is never "read but undelivered"', three.rows[0].delivered_at !== null);

    // Opening a thread directly must also deliver, for someone who taps a
    // notification straight into the conversation.
    const second = await call('POST', `/orders/${orderId}/messages`, { token: cust, body: { body: 'Second' } });
    await call('GET', `/orders/${orderId}/messages`, { token: shop });
    const secondRow = await pool.query('SELECT delivered_at, read_at FROM messages WHERE id = $1',
      [second.body?.message?.id]);
    step('opening the thread directly also delivers', secondRow.rows[0].delivered_at !== null);

    // Your own message must never mark itself delivered by you reloading.
    const mine = await call('POST', `/orders/${orderId}/messages`, { token: shop, body: { body: 'Mine' } });
    await call('GET', `/orders/${orderId}/messages`, { token: shop });
    const mineRow = await pool.query('SELECT delivered_at FROM messages WHERE id = $1', [mine.body?.message?.id]);
    step('your own reload does not deliver your own message', mineRow.rows[0].delivered_at === null,
      String(mineRow.rows[0].delivered_at));

    // ---- thread payload ---------------------------------------------------
    const listed = await call('GET', `/orders/${orderId}/messages`, { token: cust });
    step('thread returns the counterparty presence',
      listed.status === 200 && typeof listed.body?.presence?.online === 'boolean',
      JSON.stringify(listed.body?.presence));

    // ---- voice notes ------------------------------------------------------
    const audio = await uploadBlob(shop, WEBM, 'audio/webm;codecs=opus', 'voice-note.webm');
    step('audio upload accepted', audio.status === 201 && typeof audio.body?.url === 'string',
      `${audio.status} ${JSON.stringify(audio.body)}`);
    // `.weba` rather than `.webm` on purpose — see upload.controller.ts. Serving
    // a voice note as video/webm is the difference between a working player and
    // a silent one.
    step('audio is stored with an audio-only extension', audio.body?.url?.endsWith('.weba'),
      String(audio.body?.url));
    const served = await fetch(audio.body.url);
    step('audio is served as audio/webm, not video/webm',
      served.headers.get('content-type') === 'audio/webm',
      String(served.headers.get('content-type')));
    step('audio supports range requests so it can be scrubbed',
      served.headers.get('accept-ranges') === 'bytes',
      String(served.headers.get('accept-ranges')));

    const note = await call('POST', `/orders/${orderId}/messages`, {
      token: shop,
      body: { attachmentUrl: audio.body?.url, attachmentType: 'audio', attachmentDurationMs: 4200 },
    });
    step('voice note sends with no text body', note.status === 201,
      `${note.status} ${JSON.stringify(note.body)}`);
    step('voice note keeps its kind and duration',
      note.body?.message?.attachment_type === 'audio' && note.body?.message?.attachment_duration_ms === 4200,
      JSON.stringify(note.body?.message));

    // ---- images -----------------------------------------------------------
    const img = await uploadBlob(cust, PNG, 'image/png', 'probe.png');
    step('image upload still accepted', img.status === 201, `${img.status}`);
    const photo = await call('POST', `/orders/${orderId}/messages`, {
      token: cust, body: { attachmentUrl: img.body?.url, attachmentType: 'image' },
    });
    step('photo message sends', photo.status === 201, `${photo.status}`);
    step('an image carries no bogus duration', photo.body?.message?.attachment_duration_ms === null,
      String(photo.body?.message?.attachment_duration_ms));

    // An older client that sends only a URL must still get a photo.
    const legacy = await call('POST', `/orders/${orderId}/messages`, {
      token: cust, body: { attachmentUrl: img.body?.url },
    });
    step('an attachment with no stated kind defaults to image',
      legacy.body?.message?.attachment_type === 'image', String(legacy.body?.message?.attachment_type));

    // The URL must be absolute — a relative one resolves against the frontend
    // origin in production and 404s.
    step('upload URLs are absolute', /^https?:\/\//.test(img.body?.url || ''), String(img.body?.url));

    // ---- error messages ---------------------------------------------------
    // Every one of these used to come back as the bare string "Validation
    // failed", shown on a toast with no detail — the user could see that
    // something was wrong and had no way to find out what.
    const empty = await call('POST', `/orders/${orderId}/messages`, { token: cust, body: {} });
    step('an empty message says what is missing',
      empty.status === 400 && /text or an attachment/i.test(empty.body?.error ?? ''),
      `${empty.status} ${empty.body?.error}`);

    const badDuration = await call('POST', `/orders/${orderId}/messages`, {
      token: cust,
      body: { attachmentUrl: audio.body?.url, attachmentType: 'audio', attachmentDurationMs: null },
    });
    step('a bad field names the field',
      badDuration.status === 400 && /duration/i.test(badDuration.body?.error ?? ''),
      `${badDuration.status} ${badDuration.body?.error}`);

    const blobUrl = await call('POST', `/orders/${orderId}/messages`, {
      token: cust,
      body: { attachmentUrl: 'blob:http://localhost:5173/abc', attachmentType: 'audio' },
    });
    step('a local blob URL is refused with a reason',
      blobUrl.status === 400 && /uploaded file/i.test(blobUrl.body?.error ?? ''),
      `${blobUrl.status} ${blobUrl.body?.error}`);
    step('no error is left as the bare string "Validation failed"',
      ![empty, badDuration, blobUrl].some((r) => r.body?.error === 'Validation failed'));

    // ---- upload guard -----------------------------------------------------
    const bad = await uploadBlob(cust, Buffer.from('not a media file'), 'text/plain', 'evil.txt');
    step('unsupported file types are rejected', bad.status === 400, `${bad.status}`);

    const anon = await fetch(`${API}/uploads`, { method: 'POST', body: new FormData() });
    step('anonymous uploads are rejected', anon.status === 401, String(anon.status));

    // ---- inbox preview ----------------------------------------------------
    const inbox = await call('GET', '/messages/conversations', { token: shop });
    const thread = inbox.body?.conversations?.find((x) => x.order_id === orderId);
    step('inbox exposes the last message kind for its preview',
      thread?.last_attachment_type === 'image', String(thread?.last_attachment_type));
    step('inbox exposes receipts for your own last message',
      'last_delivered_at' in (thread || {}) && 'last_read_at' in (thread || {}),
      JSON.stringify(Object.keys(thread || {})));
  } finally {
    // Unwind in dependency order — orders do not cascade from users.
    if (orderId) {
      for (const t of ['messages', 'order_status_history', 'order_items', 'evidence', 'receipts',
        'payments', 'ratings', 'disputes', 'earnings', 'order_locations']) {
        try { await pool.query(`DELETE FROM "${t}" WHERE order_id = ANY($1)`, [[orderId]]); } catch { /* not keyed on order_id */ }
      }
      await pool.query('DELETE FROM orders WHERE id = $1', [orderId]);
    }
    if (ids.length) {
      await pool.query('DELETE FROM shopping_request_items WHERE request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM shopper_offers WHERE shopper_id = ANY($1) OR request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM shopping_requests WHERE customer_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
    }
    // Belt and braces if the run died before ids were collected.
    await pool.query("DELETE FROM users WHERE email LIKE 'chat-%@example.test' AND created_at > now() - interval '1 hour'");
  }

  console.log(`\n=== ${pass} passed, ${failures.length} failed ===`);
  failures.forEach((f) => console.log('  ! ' + f));
  await pool.end();
  process.exit(failures.length ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS', e.message);
  try { await pool.end(); } catch { /* already closed */ }
  process.exit(1);
});
