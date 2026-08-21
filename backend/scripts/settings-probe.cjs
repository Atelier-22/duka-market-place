/**
 * Proves the settings actually persist — every switch, not just the ones that
 * are easy to eyeball.
 *
 * A settings screen that looks like it saved and did not is worse than one that
 * plainly fails, because you only find out later when the thing you asked for
 * does not happen. Each field here is written, read back on a fresh request,
 * and compared.
 *
 * Creates one throwaway account and deletes it.
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

(async () => {
  console.log(`\n=== settings probe (${API}) ===\n`);
  const ids = [];

  try {
    const reg = await call('POST', '/auth/register', {
      body: {
        role: 'shopper', fullName: 'Settings Probe',
        phone: `0777${STAMP.slice(0, 6)}`, email: `settings-${STAMP}@example.test`,
        password: PASSWORD,
      },
    });
    if (reg.status !== 201) throw new Error(`register ${reg.status} ${JSON.stringify(reg.body)}`);
    const token = reg.body.accessToken;
    ids.push(reg.body.user.id);

    // Defaults exist without anyone having saved anything.
    const initial = await call('GET', '/settings/preferences', { token });
    step('preferences exist on first read', initial.status === 200 && !!initial.body?.preferences,
      `${initial.status}`);
    step('location starts off', initial.body?.preferences?.share_location === false,
      String(initial.body?.preferences?.share_location));

    // Every field, in one patch, then read back on a separate request.
    const patch = {
      theme: 'dark',
      accent: 'plum',
      language: 'sw',
      tone: 'candid',
      traits: ['Concise', 'Formal'],
      notifyMessages: false,
      notifyOrders: false,
      notifyOffers: false,
      notifyNewRequests: false,
      notifyMarketing: true,
      shareLocation: true,
    };
    const saved = await call('PATCH', '/settings/preferences', { token, body: patch });
    step('every preference saves in one patch', saved.status === 200, `${saved.status} ${JSON.stringify(saved.body)}`);

    const after = await call('GET', '/settings/preferences', { token });
    const p = after.body?.preferences ?? {};
    const expected = {
      theme: 'dark', accent: 'plum', language: 'sw', tone: 'candid',
      notify_messages: false, notify_orders: false, notify_offers: false,
      notify_new_requests: false, notify_marketing: true, share_location: true,
    };
    for (const [k, v] of Object.entries(expected)) {
      step(`${k} persists as ${v}`, p[k] === v, `got ${JSON.stringify(p[k])}`);
    }
    step('traits persist as a list',
      Array.isArray(p.traits) && p.traits.join(',') === 'Concise,Formal', JSON.stringify(p.traits));

    // Turning something back off has to stick too — a toggle that only saves
    // in one direction is the classic way this breaks.
    await call('PATCH', '/settings/preferences', { token, body: { shareLocation: false } });
    const off = await call('GET', '/settings/preferences', { token });
    step('a preference can be turned back off', off.body?.preferences?.share_location === false,
      String(off.body?.preferences?.share_location));

    // The dismissal timestamp drives whether the prompt returns.
    const when = new Date().toISOString();
    await call('PATCH', '/settings/preferences', { token, body: { locationPromptDismissedAt: when } });
    const dis = await call('GET', '/settings/preferences', { token });
    step('the prompt dismissal is remembered',
      !!dis.body?.preferences?.location_prompt_dismissed_at,
      String(dis.body?.preferences?.location_prompt_dismissed_at));
    await call('PATCH', '/settings/preferences', { token, body: { locationPromptDismissedAt: null } });
    const cleared = await call('GET', '/settings/preferences', { token });
    step('and can be cleared again',
      cleared.body?.preferences?.location_prompt_dismissed_at === null,
      String(cleared.body?.preferences?.location_prompt_dismissed_at));

    // An accent with no CSS block would silently render as the default.
    const bogus = await call('PATCH', '/settings/preferences', { token, body: { accent: 'chartreuse' } });
    step('an unknown accent is refused', bogus.status === 400, `${bogus.status}`);

    // Profile: the avatar in particular, since the top bar writes it.
    const prof = await call('PATCH', '/settings/profile', {
      token, body: { fullName: 'Settings Probe Renamed' },
    });
    step('profile name saves', prof.status === 200, `${prof.status} ${JSON.stringify(prof.body)}`);
    const me = await call('GET', '/auth/me', { token });
    step('the rename is what /auth/me reports',
      me.body?.user?.fullName === 'Settings Probe Renamed', String(me.body?.user?.fullName));

    const cleared2 = await call('PATCH', '/settings/profile', { token, body: { avatarUrl: null } });
    step('an avatar can be cleared', cleared2.status === 200, `${cleared2.status}`);

    const anon = await call('GET', '/settings/preferences');
    step('preferences are not readable anonymously', anon.status === 401, `${anon.status}`);
  } finally {
    if (ids.length) {
      await pool.query('DELETE FROM user_preferences WHERE user_id = ANY($1)', [ids]);
      await pool.query('DELETE FROM users WHERE id = ANY($1)', [ids]);
    }
    await pool.query("DELETE FROM users WHERE email LIKE 'settings-%@example.test' AND created_at > now() - interval '1 hour'");
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
