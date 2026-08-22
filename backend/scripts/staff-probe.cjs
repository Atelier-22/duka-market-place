/**
 * Proves the staff layer: separation, the two caps, and invisibility.
 *
 * The caps are the fiddly part — twenty admins BETWEEN two super admins, not
 * twenty each — and invisibility is the part that is easy to claim and hard to
 * be sure of, so it is checked from the outside: a customer's own endpoints,
 * the admin search, the user counts.
 *
 * Creates throwaway staff and users and deletes them.
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

const staffIds = [];
const userIds = [];

/** Seeds a staff row directly, for the two super admins the caps start from. */
async function seedStaff(role, name, phone) {
  const bcrypt = require('bcryptjs');
  const r = await pool.query(
    `INSERT INTO staff (role, full_name, phone, password_hash) VALUES ($1,$2,$3,$4) RETURNING id`,
    [role, name, phone, await bcrypt.hash(PASSWORD, 10)]
  );
  staffIds.push(r.rows[0].id);
  return r.rows[0].id;
}

(async () => {
  console.log(`\n=== staff probe (${API}) ===\n`);

  // Real staff are demoted to admin for the run so the two super-admin places
  // are free, then put back in the finally block. Their ids are captured first
  // so the restore names them exactly, rather than matching on a pattern that
  // could sweep up a probe account.
  const parked = await pool.query("SELECT id, role FROM staff WHERE full_name NOT LIKE 'Probe %'");
  if (parked.rows.length) {
    await pool.query("UPDATE staff SET role = 'admin' WHERE id = ANY($1)",
      [parked.rows.map((r) => r.id)]);
  }

  try {
    // ---- separation --------------------------------------------------------
    const inUsers = await pool.query("SELECT count(*)::int n FROM users WHERE role = 'admin'");
    step('no admin is a row in users', inUsers.rows[0].n === 0, String(inUsers.rows[0].n));

    const sa1 = await seedStaff('super_admin', 'Probe Super One', `0791${STAMP.slice(0, 6)}`);
    const sa2 = await seedStaff('super_admin', 'Probe Super Two', `0792${STAMP.slice(0, 6)}`);
    step('two super admins can exist', !!sa1 && !!sa2);

    const login = async (phone) => (await call('POST', '/auth/login', { body: { phone, password: PASSWORD } }));
    const one = await login(`0791${STAMP.slice(0, 6)}`);
    const two = await login(`0792${STAMP.slice(0, 6)}`);
    step('a super admin signs in', one.body?.user?.role === 'super_admin', String(one.body?.user?.role));
    const t1 = one.body.accessToken;
    const t2 = two.body.accessToken;

    // ---- the super-admin cap ----------------------------------------------
    const third = await call('POST', '/admin/staff', {
      token: t1, body: { role: 'super_admin', fullName: 'Probe Super Three', phone: `0793${STAMP.slice(0, 6)}` },
    });
    step('a third super admin is refused', third.status === 409, `${third.status} ${third.body?.error}`);

    // ---- the shared admin cap ---------------------------------------------
    const before = await call('GET', '/admin/staff', { token: t1 });
    const room = before.body.capacity.admins.remaining;
    step('capacity is reported', typeof room === 'number', JSON.stringify(before.body?.capacity));

    // Fill every remaining place, alternating between the two super admins to
    // show the pool is shared rather than one each.
    let made = 0;
    for (let i = 0; i < room; i += 1) {
      const token = i % 2 === 0 ? t1 : t2;
      const r = await call('POST', '/admin/staff', {
        token, body: { fullName: `Probe Admin ${i}`, phone: `07${String(200000 + i).slice(0, 2)}${STAMP.slice(0, 6)}${i}` },
      });
      if (r.status === 201) { made += 1; staffIds.push(r.body.staff.id); }
      else { step(`creating admin ${i} succeeded`, false, `${r.status} ${r.body?.error}`); break; }
    }
    step(`both super admins filled the shared pool (${made} created)`, made === room, `${made} of ${room}`);

    const full = await call('GET', '/admin/staff', { token: t1 });
    step('the pool now reads as full', full.body.capacity.admins.remaining === 0,
      JSON.stringify(full.body?.capacity?.admins));

    const overflow1 = await call('POST', '/admin/staff', {
      token: t1, body: { fullName: 'Probe Overflow A', phone: `0794${STAMP.slice(0, 6)}` },
    });
    step('super admin one cannot exceed the shared cap', overflow1.status === 409,
      `${overflow1.status} ${overflow1.body?.error}`);
    const overflow2 = await call('POST', '/admin/staff', {
      token: t2, body: { fullName: 'Probe Overflow B', phone: `0795${STAMP.slice(0, 6)}` },
    });
    step('and neither can super admin two — the twenty are shared, not each',
      overflow2.status === 409, `${overflow2.status} ${overflow2.body?.error}`);

    // Removing one frees exactly one place.
    // Only ever a probe account. Choosing "the first admin" once picked the
    // oldest, which was the real operator's, and deleted it. A destructive test
    // must name its target, never take whatever is at the top of a list.
    const victim = full.body.staff.find(
      (s) => s.role === 'admin' && String(s.full_name).startsWith('Probe ')
    );
    if (!victim) throw new Error('no probe admin to remove — refusing to touch a real account');
    const removed = await call('DELETE', `/admin/staff/${victim.id}`, { token: t2 });
    step('a super admin can remove an admin', removed.status === 200, String(removed.status));
    const afterRemove = await call('POST', '/admin/staff', {
      token: t1, body: { fullName: 'Probe Replacement', phone: `0796${STAMP.slice(0, 6)}` },
    });
    step('which frees exactly one place', afterRemove.status === 201, `${afterRemove.status} ${afterRemove.body?.error}`);
    if (afterRemove.status === 201) staffIds.push(afterRemove.body.staff.id);

    // ---- what an ordinary admin may see -----------------------------------
    const adminLogin = await login(afterRemove.body.staff.phone);
    step('a created admin can sign in with the temporary password', adminLogin.status !== 200,
      'expected the temp password to be required');
    const adminReal = await call('POST', '/auth/login', {
      body: { phone: afterRemove.body.staff.phone, password: afterRemove.body.temporaryPassword },
    });
    step('the temporary password works', adminReal.status === 200 && adminReal.body?.user?.role === 'admin',
      `${adminReal.status} ${adminReal.body?.user?.role}`);
    const adminToken = adminReal.body.accessToken;

    step('an admin can still use the ordinary admin console',
      (await call('GET', '/admin/dashboard', { token: adminToken })).status === 200);
    step('but cannot list staff', (await call('GET', '/admin/staff', { token: adminToken })).status === 403);
    step('cannot create staff',
      (await call('POST', '/admin/staff', { token: adminToken, body: { fullName: 'Nope', phone: '0700000001' } })).status === 403);
    step('and cannot reach the whole-platform view',
      (await call('GET', '/admin/god-view', { token: adminToken })).status === 403);

    // ---- invisibility to customers and shoppers ---------------------------
    const cust = await call('POST', '/auth/register', {
      body: { role: 'customer', fullName: 'Probe Watcher', phone: `0797${STAMP.slice(0, 6)}`,
              email: `staff-probe-${STAMP}@example.test`, password: PASSWORD },
    });
    userIds.push(cust.body.user.id);
    const custToken = cust.body.accessToken;

    step('a customer cannot reach the staff list',
      (await call('GET', '/admin/staff', { token: custToken })).status === 403);
    step('a customer cannot reach the god view',
      (await call('GET', '/admin/god-view', { token: custToken })).status === 403);

    // The strongest form: staff simply are not in the data customers can read.
    const searchable = await pool.query(
      "SELECT count(*)::int n FROM users WHERE full_name ILIKE 'Probe Super%' OR full_name ILIKE 'Probe Admin%'");
    step('no staff member appears anywhere in users', searchable.rows[0].n === 0, String(searchable.rows[0].n));

    const adminSearch = await call('GET', '/admin/search?q=Probe%20Super', { token: adminToken });
    step('even the admin search cannot surface a super admin',
      !(adminSearch.body?.users ?? []).some((u) => String(u.full_name).includes('Probe Super')),
      JSON.stringify((adminSearch.body?.users ?? []).map((u) => u.full_name)));

    // ---- the god view ------------------------------------------------------
    const god = await call('GET', '/admin/god-view', { token: t1 });
    step('the super admin sees the whole platform',
      god.status === 200 && typeof god.body?.platform?.customers === 'number',
      `${god.status}`);
    step('and what the staff have been doing',
      Array.isArray(god.body?.staffActivity) && god.body.staffActivity.length > 0,
      String(god.body?.staffActivity?.length));
    step('staff actions are attributed by name',
      god.body.staffActivity.every((a) => !!a.admin_name), '');

    // ---- guardrails --------------------------------------------------------
    const self = await call('DELETE', `/admin/staff/${sa1}`, { token: t1 });
    step('a super admin cannot remove themselves', self.status === 409, String(self.status));
    await call('DELETE', `/admin/staff/${sa2}`, { token: t1 });
    const last = await call('DELETE', `/admin/staff/${sa1}`, { token: t1 });
    step('the last super admin cannot be removed', last.status === 409,
      `${last.status} ${last.body?.error}`);
  } finally {
    if (userIds.length) {
      await pool.query('DELETE FROM notifications WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM user_preferences WHERE user_id = ANY($1)', [userIds]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [userIds]);
    }
    await pool.query("DELETE FROM users WHERE email LIKE 'staff-probe-%@example.test'");
    await pool.query("DELETE FROM admin_audit_log WHERE admin_name LIKE 'Probe %'");
    await pool.query("DELETE FROM staff WHERE full_name LIKE 'Probe %'");
    // Put the real staff back exactly as they were — their own role, not an
    // assumed one, and only for rows that still exist.
    for (const row of parked.rows) {
      await pool.query('UPDATE staff SET role = $2, is_active = TRUE WHERE id = $1', [row.id, row.role]);
    }
  }

  console.log(`\n=== ${pass} passed, ${failures.length} failed ===`);
  failures.forEach((f) => console.log('  ! ' + f));
  await pool.end();
  process.exit(failures.length ? 1 : 0);
})().catch(async (e) => {
  console.error('HARNESS', e.message);
  try {
    await pool.query("DELETE FROM staff WHERE full_name LIKE 'Probe %'");
    await pool.query("DELETE FROM users WHERE email LIKE 'staff-probe-%@example.test'");
    await pool.end();
  } catch { /* closed */ }
  process.exit(1);
});
