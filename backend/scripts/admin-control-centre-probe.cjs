require('dotenv/config');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const API = 'http://localhost:4000/api';
const STAMP = String(process.hrtime.bigint()).slice(-9);

let pass = 0; const fails = [];
const step = (l, ok, d = '') => {
  if (ok) { pass++; console.log('  PASS ', l); }
  else { fails.push(l + (d ? ' — ' + d : '')); console.log('  FAIL ', l, d); }
};

async function call(method, path, token, body) {
  const res = await fetch(API + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = null; try { json = await res.json(); } catch {}
  return { status: res.status, body: json };
}

(async () => {
  console.log('\n=== admin control centre probe ===\n');

  // A throwaway admin plus a throwaway customer to prove the guard.
  const reg = await call('POST', '/auth/register', null, {
    role: 'customer', fullName: 'Probe Admin',
    phone: `0755${STAMP.slice(0, 6)}`, email: `probe-admin-${STAMP}@example.test`,
    password: 'E2ePassword123!',
  });
  if (!reg.body?.accessToken) { console.log('register failed', reg.status, reg.body); return pool.end(); }
  const adminId = reg.body.user.id;

  const plain = await call('POST', '/auth/register', null, {
    role: 'customer', fullName: 'Probe Plain',
    phone: `0766${STAMP.slice(0, 6)}`, email: `probe-plain-${STAMP}@example.test`,
    password: 'E2ePassword123!',
  });
  const plainToken = plain.body.accessToken;
  const plainId = plain.body.user.id;

  // Promote one to admin, then log in again so the JWT carries role=admin.
  await pool.query("UPDATE users SET role = 'admin' WHERE id = $1", [adminId]);
  const relog = await call('POST', '/auth/login', null, {
    phone: `0755${STAMP.slice(0, 6)}`, password: 'E2ePassword123!',
  });
  const admin = relog.body?.accessToken;
  step('admin can log in', !!admin && relog.body.user.role === 'admin', JSON.stringify(relog.body?.user?.role));

  // ---- the guard ---------------------------------------------------------
  for (const p of ['/admin/activity', '/admin/presence', '/admin/search?q=a', '/admin/dashboard']) {
    const anon = await call('GET', p, null);
    step(`anonymous blocked from ${p}`, anon.status === 401, String(anon.status));
    const cust = await call('GET', p, plainToken);
    step(`customer blocked from ${p}`, cust.status === 403, String(cust.status));
  }

  // ---- the new endpoints -------------------------------------------------
  const act = await call('GET', '/admin/activity?limit=50', admin);
  step('activity feed responds', act.status === 200 && Array.isArray(act.body?.activity),
    `${act.status} ${JSON.stringify(act.body).slice(0, 200)}`);
  if (Array.isArray(act.body?.activity) && act.body.activity.length) {
    const a = act.body.activity[0];
    step('activity items carry type/summary/at',
      !!a.type && !!a.summary && !!a.at, JSON.stringify(a));
    const times = act.body.activity.map((x) => new Date(x.at).getTime());
    step('activity is reverse-chronological',
      times.every((t, i) => i === 0 || times[i - 1] >= t), '');
    console.log('    types seen:', [...new Set(act.body.activity.map((x) => x.type))].join(', '));
  } else {
    step('activity feed has events', false, 'empty');
  }

  const pres = await call('GET', '/admin/presence', admin);
  step('presence responds', pres.status === 200 && typeof pres.body?.ordersInFlight === 'number',
    `${pres.status} ${JSON.stringify(pres.body)}`);

  const srch = await call('GET', `/admin/search?q=Probe`, admin);
  step('search finds users by name',
    srch.status === 200 && srch.body.users?.some((u) => u.full_name.includes('Probe')),
    `${srch.status} users=${srch.body?.users?.length}`);

  const srchPhone = await call('GET', `/admin/search?q=0766${STAMP.slice(0, 6)}`, admin);
  step('search finds users by phone', srchPhone.body?.users?.length >= 1, `${srchPhone.body?.users?.length}`);

  const cd = await call('GET', `/admin/customers/${plainId}`, admin);
  step('customer detail responds', cd.status === 200 && cd.body?.user?.id === plainId,
    `${cd.status} ${JSON.stringify(cd.body).slice(0, 160)}`);

  const missing = await call('GET', '/admin/customers/00000000-0000-0000-0000-000000000000', admin);
  step('unknown customer 404s', missing.status === 404, String(missing.status));

  // Use a real order if the database has one.
  const anyOrder = await pool.query('SELECT id, shopper_id FROM orders LIMIT 1');
  if (anyOrder.rows.length) {
    const od = await call('GET', `/admin/orders/${anyOrder.rows[0].id}`, admin);
    step('order detail responds',
      od.status === 200 && !!od.body?.order && Array.isArray(od.body?.history) && Array.isArray(od.body?.messages),
      `${od.status} ${JSON.stringify(Object.keys(od.body || {}))}`);
    if (anyOrder.rows[0].shopper_id) {
      const sd = await call('GET', `/admin/shoppers/${anyOrder.rows[0].shopper_id}`, admin);
      step('shopper detail responds', sd.status === 200 && !!sd.body?.user,
        `${sd.status} ${JSON.stringify(Object.keys(sd.body || {}))}`);
    }
  } else {
    console.log('    (no orders in db — skipping order/shopper detail)');
  }

  await pool.query('DELETE FROM users WHERE id = ANY($1)', [[adminId, plainId]]);
  console.log(`\n=== ${pass} passed, ${fails.length} failed ===`);
  fails.forEach((f) => console.log('  ! ' + f));
  await pool.end();
  process.exit(fails.length ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS', e.message);
  try { await pool.query("DELETE FROM users WHERE email LIKE 'probe-%@example.test'"); await pool.end(); } catch {}
  process.exit(1);
});
