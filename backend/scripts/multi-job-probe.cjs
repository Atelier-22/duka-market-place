/**
 * Proves a shopper can carry several jobs at once, up to the cap, and that the
 * cap holds from both directions.
 *
 * The interesting case is the sixth job: a shopper can refuse it themselves,
 * but the customer accepting an offer is what actually puts work on their
 * plate, so that path has to enforce the same limit — otherwise six customers
 * accepting at once hand one person a queue they never agreed to.
 *
 * Creates one shopper and six customers, then deletes everything.
 */
require('dotenv/config');
const { Pool } = require('pg');

const API = process.env.E2E_API || 'http://localhost:4000/api';
const STAMP = String(process.hrtime.bigint()).slice(-9);
const PASSWORD = 'E2ePassword123!';
const LIMIT = 5;

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

(async () => {
  console.log(`\n=== multi-job probe (${API}) ===\n`);
  const ids = [];
  const orderIds = [];

  try {
    const shopReg = await call('POST', '/auth/register', {
      body: {
        role: 'shopper', fullName: 'Multi Shopper',
        phone: `0744${STAMP.slice(0, 6)}`, email: `multi-shop-${STAMP}@example.test`,
        password: PASSWORD,
      },
    });
    if (shopReg.status !== 201) throw new Error(`shopper register ${shopReg.status} ${JSON.stringify(shopReg.body)}`);
    const shop = shopReg.body.accessToken;
    ids.push(shopReg.body.user.id);

    /** One customer, one request, one offer from our shopper, accepted. */
    async function makeJob(n) {
      const reg = await call('POST', '/auth/register', {
        body: {
          role: 'customer', fullName: `Multi Customer ${n}`,
          phone: `07${50 + n}${STAMP.slice(0, 6)}`, email: `multi-cust${n}-${STAMP}@example.test`,
          password: PASSWORD,
        },
      });
      if (reg.status !== 201) throw new Error(`customer ${n} register ${reg.status} ${JSON.stringify(reg.body)}`);
      const cust = reg.body.accessToken;
      ids.push(reg.body.user.id);

      const addr = await call('POST', '/addresses', {
        token: cust, body: { line1: `Multi Address ${n}, Kampala`, isDefault: true },
      });
      const req = await call('POST', '/requests', {
        token: cust,
        body: {
          title: `Multi job ${n}`, sourcingType: 'shopper_choice', budgetMaxUgx: 50000,
          deliveryAddressId: addr.body?.address?.id, items: [{ name: `Multi item ${n}`, quantity: '1' }],
        },
      });
      const offer = await call('POST', '/offers', {
        token: shop,
        body: { requestId: req.body?.request?.id, shoppingFeeUgx: 5000, deliveryFeeUgx: 3000, estimatedMinutes: 45 },
      });
      const accept = await call('POST', '/offers/accept', { token: cust, body: { offerId: offer.body?.offer?.id } });
      if (accept.body?.order?.id) orderIds.push(accept.body.order.id);
      return { accept, cust };
    }

    // ---- the first five ----------------------------------------------------
    for (let n = 1; n <= LIMIT; n += 1) {
      const { accept } = await makeJob(n);
      step(`job ${n} of ${LIMIT} is accepted`, accept.status === 201,
        `${accept.status} ${JSON.stringify(accept.body)}`);
    }

    const dash = await call('GET', '/shoppers/dashboard', { token: shop });
    step(`dashboard lists all ${LIMIT} jobs, not just one`,
      dash.body?.activeOrders?.length === LIMIT, String(dash.body?.activeOrders?.length));
    step('the dashboard reports being at capacity', dash.body?.atCapacity === true,
      String(dash.body?.atCapacity));
    step('every job carries the customer name the card shows',
      dash.body?.activeOrders?.every((o) => typeof o.customer_name === 'string' && o.customer_name.length > 0),
      JSON.stringify(dash.body?.activeOrders?.map((o) => o.customer_name)));
    step('every job carries its own status',
      dash.body?.activeOrders?.every((o) => !!o.status), '');
    step('jobs are ordered oldest first, so "job 1" stays job 1',
      dash.body?.activeOrders?.map((o) => new Date(o.created_at).getTime())
        .every((t, i, a) => i === 0 || a[i - 1] <= t), '');

    // ---- the sixth ---------------------------------------------------------
    const sixth = await makeJob(6);
    step('a sixth job is refused when the customer accepts', sixth.accept.status === 409,
      `${sixth.accept.status} ${JSON.stringify(sixth.accept.body)}`);
    step('the refusal explains why', /as many jobs as they can/i.test(sixth.accept.body?.error ?? ''),
      String(sixth.accept.body?.error));

    // Still exactly five — the refused one must not have been created.
    const after = await call('GET', '/shoppers/dashboard', { token: shop });
    step('the refused job did not land anyway', after.body?.activeOrders?.length === LIMIT,
      String(after.body?.activeOrders?.length));

    // ---- the shopper's own accept path -------------------------------------
    // Force a sixth order past the customer path to prove the shopper-side
    // guard independently: this is the /assign endpoint, a different door.
    const forced = await pool.query(
      `INSERT INTO orders (request_id, customer_id, shopper_id, shopping_fee_ugx, delivery_fee_ugx,
                           delivery_address_id, status)
       SELECT request_id, customer_id, shopper_id, shopping_fee_ugx, delivery_fee_ugx,
              delivery_address_id, 'requested'
         FROM orders WHERE id = $1 RETURNING id`,
      [orderIds[0]]
    );
    const forcedId = forced.rows[0].id;
    orderIds.push(forcedId);
    const assign = await call('POST', `/orders/${forcedId}/assign`, { token: shop });
    step('the shopper cannot accept past the cap either', assign.status === 409,
      `${assign.status} ${JSON.stringify(assign.body)}`);
    step('that refusal explains why too', /jobs on the go/i.test(assign.body?.error ?? ''),
      String(assign.body?.error));

    // ---- finishing one frees a slot ----------------------------------------
    // Walk job 1 to completion, then the cap should let another through.
    for (const [path, body] of [
      ['assign', undefined],
      ['shopping', undefined],
      ['item-found', { actualPriceUgx: 42000, photoUrl: 'https://example.test/i.jpg', shopName: 'Probe' }],
    ]) {
      await call('POST', `/orders/${orderIds[0]}/${path}`, { token: shop, body });
    }
    await pool.query("UPDATE orders SET status = 'completed' WHERE id = $1", [orderIds[0]]);

    // Four of the original five remain, plus the forced order still sitting at
    // 'requested' — which occupies a slot of its own, so the total is back to
    // exactly LIMIT rather than LIMIT - 1.
    const freed = await call('GET', '/shoppers/dashboard', { token: shop });
    step('a completed job leaves the active list',
      !freed.body?.activeOrders?.some((o) => o.id === orderIds[0]),
      JSON.stringify(freed.body?.activeOrders?.map((o) => o.id.slice(0, 8))));
    step('the freed slot is taken by the pending job', freed.body?.activeOrders?.length === LIMIT,
      String(freed.body?.activeOrders?.length));

    // The real proof: the accept that was refused a moment ago now goes
    // through, because completing job 1 released the slot it needed.
    const assignAgain = await call('POST', `/orders/${forcedId}/assign`, { token: shop });
    step('the accept refused a moment ago now succeeds', assignAgain.status === 200,
      `${assignAgain.status} ${JSON.stringify(assignAgain.body)}`);
    step('and it really was accepted', assignAgain.body?.order?.status === 'shopper_assigned',
      String(assignAgain.body?.order?.status));
  } finally {
    if (orderIds.length) {
      for (const t of ['messages', 'order_status_history', 'order_items', 'evidence', 'receipts',
        'payments', 'transactions', 'shopper_earnings', 'deliveries', 'ratings', 'disputes',
        'order_locations']) {
        try { await pool.query(`DELETE FROM "${t}" WHERE order_id = ANY($1)`, [orderIds]); } catch { /* not keyed on order_id */ }
      }
      await pool.query('DELETE FROM orders WHERE id = ANY($1)', [orderIds]);
    }
    if (ids.length) {
      await pool.query('DELETE FROM shopping_request_items WHERE request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM shopper_offers WHERE shopper_id = ANY($1) OR request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM shopping_requests WHERE customer_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
    }
    await pool.query("DELETE FROM users WHERE email LIKE 'multi-%@example.test' AND created_at > now() - interval '1 hour'");
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
