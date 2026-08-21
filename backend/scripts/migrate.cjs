#!/usr/bin/env node
/**
 * Applies everything in database/migrations, in filename order.
 *
 * Every migration in this project is written to be re-runnable (guarded with
 * IF NOT EXISTS and the like), so there is no ledger table to keep in sync —
 * running this against any database brings it up to date, and running it twice
 * is a no-op. Pass a filename to apply just one.
 *
 *   node scripts/migrate.cjs
 *   node scripts/migrate.cjs 004_chat_presence_and_voice.sql
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const DIR = path.resolve(__dirname, '../../database/migrations');

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set (looked in backend/.env)');
    process.exit(1);
  }

  const only = process.argv[2];
  const files = fs.readdirSync(DIR).filter((f) => f.endsWith('.sql')).sort()
    .filter((f) => !only || f === only);

  if (files.length === 0) {
    console.error(only ? `No migration named ${only}` : 'No migrations found');
    process.exit(1);
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  try {
    for (const file of files) {
      process.stdout.write(`→ ${file} ... `);
      // One transaction per file: a migration either lands whole or not at all.
      await client.query('BEGIN');
      try {
        await client.query(fs.readFileSync(path.join(DIR, file), 'utf8'));
        await client.query('COMMIT');
        console.log('ok');
      } catch (err) {
        await client.query('ROLLBACK');
        console.log('FAILED');
        throw err;
      }
    }
    console.log(`\n${files.length} migration(s) applied.`);
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(`\n${err.message}`);
  process.exit(1);
});
