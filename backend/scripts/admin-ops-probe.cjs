/**
 * Exercises the admin's operational powers, and — more importantly — the
 * guardrails on them.
 *
 * These actions lock people out, move money and hand out admin access. The
 * interesting assertions here are the refusals: suspending yourself, removing
 * the last admin, paying a shopper who is owed nothing, settling a payment
 * twice. Each of those is a way to break the platform from inside the console
 * that is supposed to run it.
 *
 * Creates throwaway accounts and deletes them.
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
  try { json = await res.json(); } catch { /* empty */ }
  return { status: res.status, body: json };
}

const reg = (role, name, phone, email) => call('POST', '/auth/register', {
  body: { role, fullName: name, phone, email, password: PASSWORD },
});

(async () => {
  console.log(`\n=== admin ops probe (${API}) ===\n`);
  const ids = [];
  const orderIds = [];

  try {
    // ---- cast --------------------------------------------------------------
    const a = await reg('customer', 'Ops Admin', `0781${STAMP.slice(0, 6)}`, `ops-admin-${STAMP}@example.test`);
    const c = await reg('customer', 'Ops Customer', `0782${STAMP.slice(0, 6)}`, `ops-cust-${STAMP}@example.test`);
    const s = await reg('shopper', 'Ops Shopper', `0783${STAMP.slice(0, 6)}`, `ops-shop-${STAMP}@example.test`);
    const b = await reg('customer', 'Ops Second Admin', `0784${STAMP.slice(0, 6)}`, `ops-admin2-${STAMP}@example.test`);
    for (const r of [a, c, s, b]) {
      if (r.status !== 201) throw new Error(`register ${r.status} ${JSON.stringify(r.body)}`);
      ids.push(r.body.user.id);
    }
    const adminId = a.body.user.id;
    const custId = c.body.user.id;
    const shopId = s.body.user.id;
    const admin2Id = b.body.user.id;

    await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [adminId]);
    const relog = await call('POST', '/auth/login', {
      body: { phone: `0781${STAMP.slice(0, 6)}`, password: PASSWORD },
    });
    const admin = relog.body?.accessToken;
    step('admin signs in', relog.body?.user?.role === 'admin', String(relog.body?.user?.role));

    const custToken = c.body.accessToken;

    // ---- an ordinary user cannot reach any of it --------------------------
    const forbidden = await call('POST', `/admin/users/${shopId}/suspend`, {
      token: custToken, body: { reason: 'trying it on' },
    });
    step('a customer cannot suspend anyone', forbidden.status === 403, String(forbidden.status));

    // ---- moderation --------------------------------------------------------
    const self = await call('POST', `/admin/users/${adminId}/suspend`, {
      token: admin, body: { reason: 'testing self-suspension' },
    });
    step('an admin cannot suspend themselves', self.status === 409,
      `${self.status} ${self.body?.error}`);

    const sus = await call('POST', `/admin/users/${shopId}/suspend`, {
      token: admin, body: { reason: 'Repeated no-shows' },
    });
    step('a shopper can be suspended', sus.status === 200 && sus.body?.user?.is_active === false,
      `${sus.status} ${JSON.stringify(sus.body)}`);

    const blocked = await call('POST', '/auth/login', {
      body: { phone: `0783${STAMP.slice(0, 6)}`, password: PASSWORD },
    });
    step('a suspended account cannot sign in', blocked.status >= 400, String(blocked.status));

    const told = await pool.query(
      "SELECT title, body FROM notifications WHERE user_id = $1 AND title ILIKE '%suspended%'", [shopId]);
    step('and is told why', told.rows[0]?.body === 'Repeated no-shows', JSON.stringify(told.rows[0]));

    const twice = await call('POST', `/admin/users/${shopId}/suspend`, {
      token: admin, body: { reason: 'again' },
    });
    step('suspending twice is refused', twice.status === 409, String(twice.status));

    const back = await call('POST', `/admin/users/${shopId}/reactivate`, { token: admin });
    step('and can be reinstated', back.status === 200 && back.body?.user?.is_active === true,
      `${back.status}`);
    const signsIn = await call('POST', '/auth/login', {
      body: { phone: `0783${STAMP.slice(0, 6)}`, password: PASSWORD },
    });
    step('after which they can sign in again', signsIn.status === 200, String(signsIn.status));

    // ---- password reset ----------------------------------------------------
    const reset = await call('POST', `/admin/users/${custId}/reset-password`, { token: admin });
    step('a password can be reset', reset.status === 200 && !!reset.body?.temporaryPassword,
      `${reset.status}`);
    const withTemp = await call('POST', '/auth/login', {
      body: { phone: `0782${STAMP.slice(0, 6)}`, password: reset.body?.temporaryPassword },
    });
    step('the temporary password actually works', withTemp.status === 200, String(withTemp.status));
    const oldGone = await call('POST', '/auth/login', {
      body: { phone: `0782${STAMP.slice(0, 6)}`, password: PASSWORD },
    });
    step('and the old one stops working', oldGone.status >= 400, String(oldGone.status));
    const flagged = await pool.query('SELECT must_change_password FROM users WHERE id = $1', [custId]);
    step('they are flagged to change it', flagged.rows[0]?.must_change_password === true, '');

    // ---- roles -------------------------------------------------------------
    const demoteSelf = await call('POST', `/admin/users/${adminId}/role`, {
      token: admin, body: { role: 'customer' },
    });
    step('an admin cannot demote themselves', demoteSelf.status === 409,
      `${demoteSelf.status} ${demoteSelf.body?.error}`);

    const promote = await call('POST', `/admin/users/${admin2Id}/role`, {
      token: admin, body: { role: 'admin' },
    });
    step('someone else can be promoted to admin', promote.status === 200
      && promote.body?.user?.role === 'admin', `${promote.status}`);
    const demote = await call('POST', `/admin/users/${admin2Id}/role`, {
      token: admin, body: { role: 'customer' },
    });
    step('and demoted again', demote.status === 200, `${demote.status}`);

    // ---- an order to work with --------------------------------------------
    const custRelog = await call('POST', '/auth/login', {
      body: { phone: `0782${STAMP.slice(0, 6)}`, password: reset.body?.temporaryPassword },
    });
    const cust = custRelog.body.accessToken;
    const shop = signsIn.body.accessToken;

    const addr = await call('POST', '/addresses', { token: cust, body: { line1: 'Ops Address', isDefault: true } });
    const req = await call('POST', '/requests', {
      token: cust,
      body: {
        title: 'Ops probe item', sourcingType: 'shopper_choice', budgetMaxUgx: 50000,
        deliveryAddressId: addr.body?.address?.id, items: [{ name: 'Ops item', quantity: '1' }],
      },
    });
    const offer = await call('POST', '/offers', {
      token: shop,
      body: { requestId: req.body?.request?.id, shoppingFeeUgx: 5000, deliveryFeeUgx: 3000, estimatedMinutes: 30 },
    });
    const accept = await call('POST', '/offers/accept', { token: cust, body: { offerId: offer.body?.offer?.id } });
    const orderId = accept.body?.order?.id;
    orderIds.push(orderId);

    for (const [path, body] of [
      ['assign', undefined], ['shopping', undefined],
      ['item-found', { actualPriceUgx: 42000, photoUrl: 'https://example.test/i.jpg', shopName: 'Ops' }],
    ]) await call('POST', `/orders/${orderId}/${path}`, { token: shop, body });
    await call('POST', `/orders/${orderId}/approve`, { token: cust });

    // ---- payments ----------------------------------------------------------
    const payments = await call('GET', '/admin/payments?status=pending', { token: admin });
    step('pending payments are listed',
      payments.status === 200 && payments.body.payments.some((p) => p.order_id === orderId),
      `${payments.status} n=${payments.body?.payments?.length}`);
    const payment = payments.body.payments.find((p) => p.order_id === orderId);
    const settle = await call('POST', `/admin/payments/${payment.id}/settle`, { token: admin });
    step('a payment can be settled', settle.status === 200 && settle.body?.payment?.status === 'paid',
      `${settle.status}`);
    const settleTwice = await call('POST', `/admin/payments/${payment.id}/settle`, { token: admin });
    step('settling twice is refused', settleTwice.status === 409, String(settleTwice.status));

    // ---- payouts -----------------------------------------------------------
    const nothingOwed = await call('POST', `/admin/payouts/${shopId}/pay`, { token: admin });
    step('paying a shopper who is owed nothing is refused', nothingOwed.status === 409,
      `${nothingOwed.status} ${nothingOwed.body?.error}`);

    await call('POST', `/orders/${orderId}/out-for-delivery`, {
      token: shop, body: { receiptPhotoUrl: 'https://example.test/r.jpg' },
    });
    await call('POST', `/orders/${orderId}/delivered`, { token: cust });
    await call('POST', `/orders/${orderId}/complete`, { token: cust });

    const payouts = await call('GET', '/admin/payouts', { token: admin });
    const owedRow = payouts.body?.payouts?.find((p) => p.shopper_id === shopId);
    step('an owed shopper appears on the payout list', Number(owedRow?.owed_ugx) === 7500,
      JSON.stringify(owedRow));

    const paid = await call('POST', `/admin/payouts/${shopId}/pay`, { token: admin });
    step('the payout goes through for the right amount',
      paid.status === 200 && paid.body?.paidUgx === 7500, `${paid.status} ${JSON.stringify(paid.body)}`);

    const bal = await pool.query('SELECT available_balance_ugx FROM shopper_profiles WHERE user_id = $1', [shopId]);
    step('and the balance is cleared', Number(bal.rows[0]?.available_balance_ugx) === 0,
      String(bal.rows[0]?.available_balance_ugx));
    const noDouble = await call('POST', `/admin/payouts/${shopId}/pay`, { token: admin });
    step('paying out twice is refused', noDouble.status === 409, String(noDouble.status));

    // ---- disputes ----------------------------------------------------------
    const disp = await call('POST', `/admin/orders/${orderId}/dispute`, {
      token: admin, body: { reason: 'price_mismatch', description: 'Charged more than agreed' },
    });
    step('an admin can open a dispute', disp.status === 201 || disp.status === 200, `${disp.status}`);
    const dId = disp.body?.dispute?.id;
    const resolved = await call('POST', `/admin/disputes/${dId}/resolve`, {
      token: admin, body: { outcome: 'resolved_customer', note: 'Refunded the difference' },
    });
    step('and resolve it', resolved.status === 200 && resolved.body?.dispute?.status === 'resolved_customer',
      `${resolved.status}`);
    const reResolve = await call('POST', `/admin/disputes/${dId}/resolve`, {
      token: admin, body: { outcome: 'closed', note: 'again' },
    });
    step('a closed dispute cannot be re-resolved', reResolve.status === 409, String(reResolve.status));

    // ---- broadcast ---------------------------------------------------------
    await call('PATCH', '/settings/preferences', { token: cust, body: { notifyMarketing: true } });
    const cast = await call('POST', '/admin/broadcast', {
      token: admin, body: { audience: 'customers', title: `Ops notice ${STAMP}`, body: 'Testing' },
    });
    step('a broadcast reaches opted-in customers', cast.status === 200 && cast.body?.reached >= 1,
      JSON.stringify(cast.body));
    const got = await pool.query('SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND title = $2',
      [custId, `Ops notice ${STAMP}`]);
    step('and lands in their bell', got.rows[0].n === 1, String(got.rows[0].n));
    const notShopper = await pool.query('SELECT count(*)::int n FROM notifications WHERE user_id = $1 AND title = $2',
      [shopId, `Ops notice ${STAMP}`]);
    step('but not in the wrong audience', notShopper.rows[0].n === 0, String(notShopper.rows[0].n));

    // ---- locations ---------------------------------------------------------
    const loc = await call('POST', '/admin/locations', {
      token: admin, body: { name: `Ops Market ${STAMP}`, type: 'market', city: 'Kampala' },
    });
    step('a location can be added', loc.status === 201, `${loc.status}`);
    const off = await call('POST', `/admin/locations/${loc.body?.location?.id}/toggle`, { token: admin });
    step('and hidden again', off.status === 200 && off.body?.location?.is_active === false, `${off.status}`);
    await pool.query('DELETE FROM locations WHERE id = $1', [loc.body?.location?.id]);

    // ---- reporting ---------------------------------------------------------
    const an = await call('GET', '/admin/analytics?days=14', { token: admin });
    step('analytics responds', an.status === 200 && Array.isArray(an.body?.daily), `${an.status}`);
    step('every day in the window is present, including empty ones',
      an.body?.daily?.length === 14, String(an.body?.daily?.length));
    step('totals are numbers, not concatenated strings',
      typeof an.body?.totals?.gmv_ugx === 'number', `${typeof an.body?.totals?.gmv_ugx}`);
    step('top shoppers are ranked', Array.isArray(an.body?.topShoppers), '');

    // ---- audit trail -------------------------------------------------------
    const log = await call('GET', '/admin/audit?limit=100', { token: admin });
    const actions = (log.body?.entries ?? []).map((e) => e.action);
    step('the audit log responds', log.status === 200 && Array.isArray(log.body?.entries), `${log.status}`);
    for (const a of ['user.suspend', 'user.reactivate', 'user.reset_password', 'user.change_role',
      'payment.settle', 'shopper.payout', 'dispute.resolve', 'broadcast', 'location.create']) {
      step(`${a} was recorded`, actions.includes(a), actions.join(','));
    }
    step('entries name the admin who acted',
      (log.body?.entries ?? []).every((e) => !!e.admin_name), '');
  } finally {
    if (orderIds.filter(Boolean).length) {
      const oi = orderIds.filter(Boolean);
      for (const t of ['messages', 'order_status_history', 'order_items', 'evidence', 'receipts',
        'payments', 'transactions', 'shopper_earnings', 'deliveries', 'ratings', 'disputes',
        'order_locations']) {
        try { await pool.query(`DELETE FROM "${t}" WHERE order_id = ANY($1)`, [oi]); } catch { /* not keyed */ }
      }
      await pool.query('DELETE FROM orders WHERE id = ANY($1)', [oi]);
    }
    if (ids.length) {
      await pool.query('DELETE FROM admin_audit_log WHERE admin_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM notifications WHERE user_id = ANY($1)', [ids]);
      // A payout writes a transaction with no order_id, so the order-scoped
      // sweep above misses it and the users delete then hits the FK.
      await pool.query('DELETE FROM transactions WHERE user_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM shopper_earnings WHERE shopper_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM shopping_request_items WHERE request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM shopper_offers WHERE shopper_id = ANY($1) OR request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [ids]);
      await pool.query('DELETE FROM shopping_requests WHERE customer_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
    }
    // Belt and braces, including anything a previous failed run left behind:
    // resolve the accounts first, then unwind their dependents in FK order.
    // Deleting the users straight off fails on transactions, which is exactly
    // how the last aborted run wedged the next one.
    const stale = await pool.query(
      "SELECT id FROM users WHERE email LIKE 'ops-%@example.test'");
    const staleIds = stale.rows.map((r) => r.id);
    if (staleIds.length) {
      const staleOrders = await pool.query(
        'SELECT id FROM orders WHERE customer_id = ANY($1) OR shopper_id = ANY($1)', [staleIds]);
      const so = staleOrders.rows.map((r) => r.id);
      if (so.length) {
        for (const t of ['messages', 'order_status_history', 'order_items', 'evidence', 'receipts',
          'payments', 'transactions', 'shopper_earnings', 'deliveries', 'ratings', 'disputes',
          'order_locations']) {
          try { await pool.query(`DELETE FROM "${t}" WHERE order_id = ANY($1)`, [so]); } catch { /* not keyed */ }
        }
        await pool.query('DELETE FROM orders WHERE id = ANY($1)', [so]);
      }
      await pool.query('DELETE FROM admin_audit_log WHERE admin_id = ANY($1)', [staleIds]);
      await pool.query('DELETE FROM notifications WHERE user_id = ANY($1)', [staleIds]);
      await pool.query('DELETE FROM transactions WHERE user_id = ANY($1)', [staleIds]);
      await pool.query('DELETE FROM shopper_earnings WHERE shopper_id = ANY($1)', [staleIds]);
      await pool.query('DELETE FROM shopping_request_items WHERE request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [staleIds]);
      await pool.query('DELETE FROM shopper_offers WHERE shopper_id = ANY($1) OR request_id IN (SELECT id FROM shopping_requests WHERE customer_id = ANY($1))', [staleIds]);
      await pool.query('DELETE FROM shopping_requests WHERE customer_id = ANY($1)', [staleIds]);
      await pool.query('DELETE FROM addresses WHERE user_id = ANY($1)', [staleIds]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [staleIds]);
    }
  }

  console.log(`\n=== ${pass} passed, ${failures.length} failed ===`);
  failures.forEach((f) => console.log('  ! ' + f));
  await pool.end();
  process.exit(failures.length ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS', e.message);
  try { await pool.end(); } catch { /* closed */ }
  process.exit(1);
});
