#!/usr/bin/env node

require('dotenv/config');
const { Pool } = require('pg');

const APPLY = process.argv.includes('--apply');
const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set (looked in backend/.env)');
  process.exit(1);
}

const pool = new Pool({
  connectionString: url,
  ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false },
});

const TEST_EMAIL_PATTERN = '%@example.test';

async function main() {
  const client = await pool.connect();
  try {
    const FIXTURE_TITLES = [
      '%E2E%', '%probe%', 'New job: Multi job%', '%Phone charger, Type-C%',
      '%Fresh matooke and a bunch of sukuma%', '%test item%',
    ];

    const { rows: testUsers } = await client.query(
      'SELECT id, role, full_name, phone, email, created_at FROM users WHERE email LIKE $1',
      [TEST_EMAIL_PATTERN]
    );
    const testIds = testUsers.map((u) => u.id);

    const { rows: fixtureNotifications } = await client.query(
      `SELECT count(*)::int AS n FROM notifications
        WHERE title ILIKE ANY($1) OR body ILIKE ANY($1)`,
      [FIXTURE_TITLES]
    );

    const { rows: orphaned } = await client.query(
      `SELECT count(*)::int AS n FROM notifications n
        WHERE n.link ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE n.link LIKE ('%' || o.id || '%'))
          AND NOT EXISTS (SELECT 1 FROM shopping_requests r WHERE n.link LIKE ('%' || r.id || '%'))`
    );

    console.log('');
    console.log(`Fixture-worded notifications  ${fixtureNotifications[0].n}`);
    console.log(`Notifications pointing nowhere ${orphaned[0].n}`);

    if (testIds.length === 0 && fixtureNotifications[0].n === 0 && orphaned[0].n === 0) {
      console.log('Nothing to purge.');
      return;
    }

    if (testIds.length === 0) {
      if (!APPLY) {
        console.log('Dry run. Re-run with --apply to delete.');
        return;
      }
      const a = await client.query(
        `DELETE FROM notifications WHERE title ILIKE ANY($1) OR body ILIKE ANY($1)`, [FIXTURE_TITLES]
      );
      const b = await client.query(
        `DELETE FROM notifications n
          WHERE n.link ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
            AND NOT EXISTS (SELECT 1 FROM orders o WHERE n.link LIKE ('%' || o.id || '%'))
            AND NOT EXISTS (SELECT 1 FROM shopping_requests r WHERE n.link LIKE ('%' || r.id || '%'))`
      );
      console.log(`Deleted ${a.rowCount} fixture notifications and ${b.rowCount} pointing nowhere.`);
      return;
    }

    const since = testUsers.reduce((a, u) => (u.created_at < a ? u.created_at : a), testUsers[0].created_at);

    const { rows: requests } = await client.query(
      'SELECT id, title FROM shopping_requests WHERE customer_id = ANY($1)',
      [testIds]
    );
    const requestIds = requests.map((r) => r.id);
    const titles = [...new Set(requests.map((r) => `New job: ${r.title}`))];
    titles.push('New job: E2E test item');

    const { rows: allOrders } = await client.query(
      `SELECT o.id,
              (c.email LIKE $2) AS customer_is_test,
              (s.email LIKE $2) AS shopper_is_test
         FROM orders o
         JOIN users c ON c.id = o.customer_id
         JOIN users s ON s.id = o.shopper_id
        WHERE o.customer_id = ANY($1) OR o.shopper_id = ANY($1)`,
      [testIds, TEST_EMAIL_PATTERN]
    );
    const pureTestOrders = allOrders.filter((o) => o.customer_is_test && o.shopper_is_test).map((o) => o.id);
    const mixedOrders = allOrders.filter((o) => !(o.customer_is_test && o.shopper_is_test));

    const { rows: strayCount } = await client.query(
      `SELECT count(*)::int AS n
         FROM notifications n
         JOIN users u ON u.id = n.user_id
        WHERE NOT (u.id = ANY($1))
          AND n.title = ANY($2)
          AND n.created_at >= $3`,
      [testIds, titles, since]
    );

    const { rows: ownCount } = await client.query(
      'SELECT count(*)::int AS n FROM notifications WHERE user_id = ANY($1)',
      [testIds]
    );

    console.log('');
    console.log(`Automated-test accounts     ${testUsers.length}`);
    console.log(`Their shopping requests     ${requests.length}`);
    console.log(`Orders between test users   ${pureTestOrders.length}`);
    console.log(`Orders touching real users  ${mixedOrders.length}${mixedOrders.length ? ' (left alone)' : ''}`);
    console.log(`Notifications on test users ${ownCount[0].n}`);
    console.log(`Test alerts on real users   ${strayCount[0].n}`);
    console.log('');

    if (!APPLY) {
      console.log('Dry run. Re-run with --apply to delete.');
      return;
    }

    await client.query('BEGIN');

    const removed = {};
    const run = async (label, sql, params) => {
      const res = await client.query(sql, params);
      removed[label] = res.rowCount;
    };

    await run('fixture notifications',
      `DELETE FROM notifications WHERE title ILIKE ANY($1) OR body ILIKE ANY($1)`, [FIXTURE_TITLES]);

    await run('notifications pointing nowhere',
      `DELETE FROM notifications n
        WHERE n.link ~ '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
          AND NOT EXISTS (SELECT 1 FROM orders o WHERE n.link LIKE ('%' || o.id || '%'))
          AND NOT EXISTS (SELECT 1 FROM shopping_requests r WHERE n.link LIKE ('%' || r.id || '%'))`, []);

    await run('stray alerts on real accounts',
      `DELETE FROM notifications n
        USING users u
        WHERE u.id = n.user_id
          AND NOT (n.user_id = ANY($1))
          AND n.title = ANY($2)
          AND n.created_at >= $3`,
      [testIds, titles, since]);

    await run('notifications', 'DELETE FROM notifications WHERE user_id = ANY($1)', [testIds]);

    if (pureTestOrders.length) {
      await run('earnings', 'DELETE FROM shopper_earnings WHERE order_id = ANY($1)', [pureTestOrders]);
      await run('transactions', 'DELETE FROM transactions WHERE order_id = ANY($1)', [pureTestOrders]);
      await run('orders', 'DELETE FROM orders WHERE id = ANY($1)', [pureTestOrders]);
    }

    if (requestIds.length) {
      await run('shopping requests', 'DELETE FROM shopping_requests WHERE id = ANY($1)', [requestIds]);
    }

    await run('earnings held by test shoppers', 'DELETE FROM shopper_earnings WHERE shopper_id = ANY($1)', [testIds]);
    await run('transactions by test users', 'DELETE FROM transactions WHERE user_id = ANY($1)', [testIds]);
    await run('preferences', 'DELETE FROM user_preferences WHERE user_id = ANY($1)', [testIds]);
    await run('accounts', 'DELETE FROM users WHERE id = ANY($1)', [testIds]);
    await run('knowledge options learned only from tests', `DELETE FROM product_attribute_options o WHERE o.source <> 'bootstrap' AND o.source <> 'admin' AND NOT EXISTS (SELECT 1 FROM product_observations ob JOIN product_attributes a ON a.key = ob.attribute_key WHERE a.id = o.attribute_id AND ob.value_norm = o.value_norm)`);
    await run('knowledge kind rules learned only from tests', `DELETE FROM product_kind_attributes ka WHERE ka.source <> 'bootstrap' AND ka.source <> 'admin' AND NOT EXISTS (SELECT 1 FROM product_observations ob JOIN product_attributes a ON a.key = ob.attribute_key WHERE a.id = ka.attribute_id AND ob.kind_id = ka.kind_id)`);
    await run('knowledge kinds learned only from tests', `DELETE FROM product_kinds k WHERE k.source <> 'bootstrap' AND k.source <> 'admin' AND NOT EXISTS (SELECT 1 FROM product_observations ob WHERE ob.kind_id = k.id)`);
    await run('knowledge attributes learned only from tests', `DELETE FROM product_attributes a WHERE a.source <> 'bootstrap' AND a.source <> 'admin' AND NOT EXISTS (SELECT 1 FROM product_observations ob WHERE ob.attribute_key = a.key) AND NOT EXISTS (SELECT 1 FROM seller_product_attributes spa WHERE spa.attribute_id = a.id)`);
    await run('knowledge brands learned only from tests', `DELETE FROM product_brands b WHERE b.source <> 'bootstrap' AND b.source <> 'admin' AND NOT EXISTS (SELECT 1 FROM product_observations ob WHERE ob.entity_type = 'brand' AND ob.value_norm = b.slug)`);
    await run('knowledge audit rows for removed entries', `DELETE FROM product_knowledge_audit au WHERE NOT EXISTS (SELECT 1 FROM product_kinds WHERE id = au.entity_id) AND NOT EXISTS (SELECT 1 FROM product_attributes WHERE id = au.entity_id) AND NOT EXISTS (SELECT 1 FROM product_attribute_options WHERE id = au.entity_id) AND NOT EXISTS (SELECT 1 FROM product_brands WHERE id = au.entity_id) AND NOT EXISTS (SELECT 1 FROM product_kind_attributes WHERE id = au.entity_id)`);
    await run('knowledge synonyms pointing nowhere', `DELETE FROM product_synonyms s WHERE NOT EXISTS (SELECT 1 FROM product_kinds WHERE id = s.entity_id) AND NOT EXISTS (SELECT 1 FROM product_attributes WHERE id = s.entity_id) AND NOT EXISTS (SELECT 1 FROM product_attribute_options WHERE id = s.entity_id) AND NOT EXISTS (SELECT 1 FROM product_brands WHERE id = s.entity_id)`);

    await client.query('COMMIT');

    console.log('Deleted:');
    Object.entries(removed).forEach(([k, v]) => {
      if (v) console.log(`  ${String(v).padStart(5)}  ${k}`);
    });
    console.log('\nDone.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => undefined);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((err) => {
  console.error('\nPurge failed, nothing was changed.');
  console.error(err.message);
  process.exit(1);
});
