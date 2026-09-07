#!/usr/bin/env node

const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const CHECKS = [
  ['002_live_tracking',        'table shopper_locations',        table('shopper_locations')],
  ['003_user_preferences',     'table user_preferences',         table('user_preferences')],
  ['004_chat_presence_voice',  'messages.attachment_type',       column('messages', 'attachment_type')],
  ['006_two_way_live_location','shopper_locations.party',        column('shopper_locations', 'party')],
  ['007_new_request_alerts',   'user_preferences.notify_new_requests', column('user_preferences', 'notify_new_requests')],
  ['008_persistent_uploads',   'table uploaded_files',           table('uploaded_files')],
  ['009_location_preference',  'user_preferences.share_location',column('user_preferences', 'share_location')],
  ['010_admin_operations',     'table admin_audit_log',          table('admin_audit_log')],
  ['011_staff_accounts',       'table staff',                    table('staff')],
  ['012_expand_locations',     'a location outside Kampala',
    `SELECT EXISTS (SELECT 1 FROM locations WHERE city <> 'Kampala') AS present`],
];

function table(name) {
  return `SELECT EXISTS (
    SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = '${name}'
  ) AS present`;
}

function column(tbl, col) {
  return `SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = '${tbl}' AND column_name = '${col}'
  ) AS present`;
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set (looked in backend/.env)');
    process.exit(1);
  }

  const parsed = new URL(url);
  console.log('Connecting to');
  console.log(`  host     : ${parsed.hostname}`);
  console.log(`  port     : ${parsed.port || 5432}`);
  console.log(`  database : ${parsed.pathname.replace(/^\//, '')}`);
  console.log(`  user     : ${parsed.username}`);
  console.log('');

  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    const now = await client.query('SELECT current_database() AS db, now() AS at');
    console.log(`Connected to "${now.rows[0].db}" at ${now.rows[0].at.toISOString()}\n`);

    let missing = 0;
    for (const [name, proof, sql] of CHECKS) {
      let present;
      try {
        present = (await client.query(sql)).rows[0].present;
      } catch {

        present = false;
      }
      if (!present) missing += 1;
      console.log(`${present ? '  applied' : '  MISSING'}  ${name.padEnd(28)} (${proof})`);
    }

    const loc = await client.query(
      `SELECT count(*)::int AS n, count(DISTINCT city)::int AS cities FROM locations WHERE is_active`
    );
    console.log(`\nlocations: ${loc.rows[0].n} across ${loc.rows[0].cities} cities`);
    console.log(missing ? `\n${missing} migration(s) not applied to this database.` : '\nAll checked migrations are present.');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\nFAILED: ${err.message}`);
  process.exit(1);
});
