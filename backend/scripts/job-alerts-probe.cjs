/**
 * Proves that posting a request alerts the shoppers who could take it, and
 * nobody else.
 *
 * The exclusions are the whole point: a fan-out that notifies everyone is worse
 * than no fan-out, because shoppers turn the alerts off and then miss the ones
 * that mattered. Each skipped case gets its own account here rather than being
 * argued about in a comment.
 *
 * Creates one customer and four shoppers, then deletes everything.
 */
require('dotenv/config');
const { Pool } = require('pg');

const API = process.env.E2E_API || 'http://localhost:4000/api';
const STAMP = String(process.hrtime.bigint()).slice(-9);
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

const reg = (role, name, phone, email) => call('POST', '/auth/register', {
  body: { role, fullName: name, phone, email, password: PASSWORD },
});

/** Alerts naming this request that landed for this user. */
async function alertsFor(userId, title) {
  const r = await pool.query(
    `SELECT id, title, body, link FROM notifications
      WHERE user_id = $1 AND title = $2`,
    [userId, `New job: ${title}`]
  );
  return r.rows;
}

(async () => {
  console.log(`\n=== job alerts probe (${API}) ===\n`);
  const ids = [];
  const orderIds = [];

  try {
    // ---- the cast ----------------------------------------------------------
    const cust = await reg('customer', 'Alert Customer', `0761${STAMP.slice(0, 6)}`, `alert-cust-${STAMP}@example.test`);
    if (cust.status !== 201) throw new Error(`customer register ${cust.status} ${JSON.stringify(cust.body)}`);
    ids.push(cust.body.user.id);

    const eligible = await reg('shopper', 'Alert Eligible', `0762${STAMP.slice(0, 6)}`, `alert-elig-${STAMP}@example.test`);
    const mutedOne = await reg('shopper', 'Alert Muted', `0763${STAMP.slice(0, 6)}`, `alert-muted-${STAMP}@example.test`);
    const busyOne = await reg('shopper', 'Alert Busy', `0764${STAMP.slice(0, 6)}`, `alert-busy-${STAMP}@example.test`);
    // Same person as the customer, holding a shopper account on the same phone.
    const selfShop = await reg('shopper', 'Alert Customer', `0761${STAMP.slice(0, 6)}`, `alert-self-${STAMP}@example.test`);
    for (const r of [eligible, mutedOne, busyOne, selfShop]) {
      if (r.status !== 201) throw new Error(`shopper register ${r.status} ${JSON.stringify(r.body)}`);
      ids.push(r.body.user.id);
    }
    step('a second account on the same phone is allowed for the other role', selfShop.status === 201);

    // Muted: turned the alerts off.
    await call('PATCH', '/settings/preferences', {
      token: mutedOne.body.accessToken, body: { notifyNewRequests: false },
    });
    const muteCheck = await pool.query('SELECT notify_new_requests FROM user_preferences WHERE user_id = $1',
      [mutedOne.body.user.id]);
    step('the preference persists', muteCheck.rows[0]?.notify_new_requests === false,
      JSON.stringify(muteCheck.rows[0]));

    // Busy: already carrying the maximum number of jobs.
    const addrForBusy = await call('POST', '/addresses', {
      token: cust.body.accessToken, body: { line1: 'Alert Address, Kampala', isDefault: true },
    });
    for (let i = 0; i < 5; i += 1) {
      const r = await pool.query(
        `INSERT INTO shopping_requests (customer_id, title, sourcing_type, budget_max_ugx, delivery_address_id, status)
         VALUES ($1, $2, 'shopper_choice', 10000, $3, 'assigned') RETURNING id`,
        [cust.body.user.id, `Filler ${i}`, addrForBusy.body.address.id]
      );
      const o = await pool.query(
        `INSERT INTO orders (request_id, customer_id, shopper_id, shopping_fee_ugx, delivery_fee_ugx,
                             delivery_address_id, status)
         VALUES ($1,$2,$3,5000,3000,$4,'shopping') RETURNING id`,
        [r.rows[0].id, cust.body.user.id, busyOne.body.user.id, addrForBusy.body.address.id]
      );
      orderIds.push(o.rows[0].id);
    }

    // ---- post a request ----------------------------------------------------
    const title = `Alert probe item ${STAMP}`;
    const posted = await call('POST', '/requests', {
      token: cust.body.accessToken,
      body: {
        title, sourcingType: 'shopper_choice', budgetMaxUgx: 75000,
        deliveryAddressId: addrForBusy.body.address.id,
        items: [{ name: 'Alert probe item', quantity: '1' }],
      },
    });
    step('the request posts', posted.status === 201, `${posted.status} ${JSON.stringify(posted.body)}`);

    // ---- who heard about it ------------------------------------------------
    const got = await alertsFor(eligible.body.user.id, title);
    step('an available shopper is alerted', got.length === 1, `${got.length}`);
    step('the alert names the job', /Alert probe item/.test(got[0]?.title ?? ''), String(got[0]?.title));
    step('the alert mentions the budget', /75,000 UGX/.test(got[0]?.body ?? ''), String(got[0]?.body));
    step('the alert links to the available jobs list', got[0]?.link === '/shopper/available',
      String(got[0]?.link));

    step('a shopper who muted job alerts is not told',
      (await alertsFor(mutedOne.body.user.id, title)).length === 0);
    step('a shopper already at capacity is not told',
      (await alertsFor(busyOne.body.user.id, title)).length === 0);
    step('the customer is not alerted to their own request on their other account',
      (await alertsFor(selfShop.body.user.id, title)).length === 0);
    step('the customer is not alerted on their customer account',
      (await alertsFor(cust.body.user.id, title)).length === 0);

    // The alerted shopper sees it through the API, not just in the table.
    const bell = await call('GET', '/notifications', { token: eligible.body.accessToken });
    step('it reaches the notification bell',
      bell.body?.notifications?.some((n) => n.title === `New job: ${title}`),
      JSON.stringify(bell.body?.notifications?.map((n) => n.title)));
    step('and counts as unread', Number(bell.body?.unread ?? 0) >= 1, String(bell.body?.unread));

    // Freeing a slot should put the busy shopper back in scope.
    await pool.query("UPDATE orders SET status = 'completed' WHERE id = $1", [orderIds[0]]);
    const title2 = `Alert probe second ${STAMP}`;
    await call('POST', '/requests', {
      token: cust.body.accessToken,
      body: {
        title: title2, sourcingType: 'shopper_choice', budgetMaxUgx: 20000,
        deliveryAddressId: addrForBusy.body.address.id,
        items: [{ name: 'Second item', quantity: '1' }],
      },
    });
    step('a shopper who finished a job is alerted again',
      (await alertsFor(busyOne.body.user.id, title2)).length === 1);
  } finally {
    if (ids.length) {
      await pool.query('DELETE FROM notifications WHERE user_id = ANY($1)', [ids]);
      const owned = await pool.query('SELECT id FROM orders WHERE customer_id = ANY($1) OR shopper_id = ANY($1)', [ids]);
      const all = owned.rows.map((r) => r.id);
      if (all.length) {
        for (const t of ['messages', 'order_status_history', 'order_items', 'evidence', 'receipts',
          'payments', 'transactions', 'shopper_earnings', 'deliveries', 'ratings', 'disputes',
          'order_locations']) {
          try { await pool.query(`DELETE FROM "${t}" WHERE order_id = ANY($1)`, [all]); } catch { /* not keyed on order_id */ }
        }
        await pool.query('DELETE FROM orders WHERE id = ANY($1)', [all]);
      }
      await pool.query('DELETE FROM shopping_request_items WHERE request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM shopper_offers WHERE shopper_id = ANY($1) OR request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM shopping_requests WHERE customer_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
    }
    await pool.query("DELETE FROM users WHERE email LIKE 'alert-%@example.test' AND created_at > now() - interval '1 hour'");
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
