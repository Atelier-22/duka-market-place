#!/usr/bin/env node
/**
 * Moves files already sitting in the local uploads folder into the database,
 * so images and voice notes sent before the switch keep working.
 *
 * The URLs stored in message and evidence rows do not change — only where the
 * bytes come from — so anything already on disk carries on resolving instead of
 * turning into a broken image.
 *
 * Safe to re-run: a key already in the table is skipped, not duplicated.
 *
 *   node scripts/import-uploads.cjs
 */
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const ROOT = path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads');

/** Same mapping the upload endpoint uses, so served types stay correct. */
const MIME = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.heic': 'image/heic', '.heif': 'image/heif',
  '.weba': 'audio/webm', '.webm': 'audio/webm', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.aac': 'audio/aac', '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

function walk(dir, prefix = '') {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const key = prefix ? `${prefix}/${entry.name}` : entry.name;
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full, key) : [{ key, full }];
  });
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set (looked in backend/.env)');
    process.exit(1);
  }

  const files = walk(ROOT);
  if (files.length === 0) {
    console.log(`Nothing to import — ${ROOT} is empty or missing.`);
    return;
  }

  const client = new Client({
    connectionString: url,
    ssl: url.includes('localhost') ? undefined : { rejectUnauthorized: false },
  });
  await client.connect();

  let imported = 0;
  let skipped = 0;
  let bytes = 0;

  try {
    for (const { key, full } of files) {
      const data = fs.readFileSync(full);
      const ext = path.extname(key).toLowerCase();
      const res = await client.query(
        `INSERT INTO uploaded_files (key, folder, filename, mime_type, byte_size, data)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (key) DO NOTHING
         RETURNING key`,
        [
          key,
          key.includes('/') ? key.split('/')[0] : 'misc',
          path.basename(key),
          MIME[ext] || 'application/octet-stream',
          data.byteLength,
          data,
        ]
      );
      if (res.rows.length) { imported += 1; bytes += data.byteLength; }
      else skipped += 1;
    }
  } finally {
    await client.end();
  }

  console.log(`Imported ${imported} file(s) (${(bytes / 1024 / 1024).toFixed(2)} MB), skipped ${skipped} already present.`);
  console.log('The originals are left on disk — delete them once you have confirmed the app still shows them.');
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
