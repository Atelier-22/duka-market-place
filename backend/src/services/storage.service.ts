import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';
import { query, queryOne } from '../db/pool';

/**
 * Storage abstraction for product photos, receipts, voice notes and
 * verification documents.
 *
 * ── WHY THE DEFAULT IS THE DATABASE ──
 * The local driver writes to a folder on the server's disk. On Render — and on
 * any container platform — that disk is recreated on every deploy, so every
 * image anyone had ever sent vanished while the message rows kept pointing at
 * them. Postgres is the only durable thing in this stack, so that is where the
 * bytes go.
 *
 * ── TO ADD A REAL PROVIDER (e.g. S3/Cloudinary/R2) ──
 * Implement `StorageDriver` with the same four methods, set STORAGE_DRIVER=s3,
 * and wire it up in `getStorageDriver()`. Nothing else changes: every route
 * calls `storageService.save(...)` / `.getUrl(...)`, never the filesystem or
 * the database directly.
 */
export interface StorageDriver {
  save(buffer: Buffer, originalName: string, folder: string, meta?: SaveMeta): Promise<string>;
  getUrl(key: string): string;
  /** Null when the key is unknown. */
  read(key: string): Promise<StoredFile | null>;
  delete(key: string): Promise<void>;
}

export interface SaveMeta {
  mimeType?: string;
  uploadedBy?: string | null;
}

export interface StoredFile {
  data: Buffer;
  mimeType: string;
  byteSize: number;
  filename: string | null;
}

/**
 * Extension to content type. Mirrors the allowlist in upload.controller.ts;
 * `.weba` maps to audio/webm on purpose, since `.webm` means video to every
 * mime table and no <audio> element will touch it.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.gif': 'image/gif', '.heic': 'image/heic', '.heif': 'image/heif',
  '.weba': 'audio/webm', '.webm': 'audio/webm', '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4', '.mp3': 'audio/mpeg', '.aac': 'audio/aac', '.wav': 'audio/wav',
  '.pdf': 'application/pdf',
};

function mimeFromExtension(key: string): string {
  return MIME_BY_EXTENSION[path.extname(key).toLowerCase()] ?? 'application/octet-stream';
}

/** Keys are always "<folder>/<uuid><ext>" — see save(). */
function buildKey(originalName: string, folder: string): string {
  const ext = path.extname(originalName) || '.bin';
  return `${folder}/${randomUUID()}${ext}`;
}

/**
 * Durable storage. The bytes go in a row alongside everything else that
 * matters, and are served back by the /uploads route in index.ts.
 */
class DatabaseStorageDriver implements StorageDriver {
  async save(buffer: Buffer, originalName: string, folder: string, meta: SaveMeta = {}): Promise<string> {
    const key = buildKey(originalName, folder);
    await query(
      `INSERT INTO uploaded_files (key, folder, filename, mime_type, byte_size, data, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [
        key,
        folder,
        originalName,
        meta.mimeType ?? 'application/octet-stream',
        buffer.byteLength,
        buffer,
        meta.uploadedBy ?? null,
      ]
    );
    return key;
  }

  getUrl(key: string): string {
    // Absolute, not relative. The URL is stored in the database and rendered by
    // a frontend on a different origin — a relative path would resolve against
    // the frontend and 404.
    return `${env.publicUrl}/uploads/${key}`;
  }

  async read(key: string): Promise<StoredFile | null> {
    const row = await queryOne<{ data: Buffer; mime_type: string; byte_size: number; filename: string | null }>(
      'SELECT data, mime_type, byte_size, filename FROM uploaded_files WHERE key = $1',
      [key]
    );
    if (!row) return null;
    return { data: row.data, mimeType: row.mime_type, byteSize: row.byte_size, filename: row.filename };
  }

  async delete(key: string): Promise<void> {
    await query('DELETE FROM uploaded_files WHERE key = $1', [key]);
  }
}

/** Kept for local development against a folder, and as the migration source. */
class LocalStorageDriver implements StorageDriver {
  private root = path.resolve(process.cwd(), env.uploadDir);

  constructor() {
    fs.mkdirSync(this.root, { recursive: true });
  }

  async save(buffer: Buffer, originalName: string, folder: string): Promise<string> {
    const key = buildKey(originalName, folder);
    const fullPath = path.join(this.root, key);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);
    return key;
  }

  getUrl(key: string): string {
    return `${env.publicUrl}/uploads/${key}`;
  }

  async read(key: string): Promise<StoredFile | null> {
    const fullPath = path.join(this.root, key);
    // Refuse anything that escapes the upload root, however it was spelled.
    if (!fullPath.startsWith(this.root)) return null;
    if (!fs.existsSync(fullPath)) return null;
    const data = fs.readFileSync(fullPath);
    // A file on disk carries no recorded type, so it has to come from the
    // extension. Serving everything as octet-stream means no image renders and
    // no audio plays.
    return {
      data,
      mimeType: mimeFromExtension(key),
      byteSize: data.byteLength,
      filename: path.basename(key),
    };
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.root, key);
    if (fullPath.startsWith(this.root) && fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
}

/** Which driver actually ended up serving, which is not always what was asked for. */
export let activeStorageDriver: 'database' | 'local' | 's3' = 'database';

function getStorageDriver(): StorageDriver {
  // A container's disk is wiped whenever the container is replaced, and is not
  // shared between instances. A photo written there is served correctly for a
  // few minutes — by the instance that accepted the upload, and afterwards out
  // of the browser's cache, since /uploads is sent as immutable — and then
  // 404s permanently. That delay is why it reads as "photos vanish from the
  // chat after a minute or two" rather than as an upload that plainly failed.
  //
  // Migration 008 moved the bytes into Postgres to end exactly this, but the
  // driver is chosen by an environment variable, so one stale value in a
  // dashboard silently brings the whole bug back. In production it is not
  // allowed to: durability is not a thing worth honouring a typo over.
  if (env.storageDriver === 'local' && env.nodeEnv === 'production') {
    console.warn(
      '[storage] STORAGE_DRIVER=local is not durable in production — a container disk ' +
      'does not survive a restart and is not shared between instances, so uploads would ' +
      'disappear minutes after being sent. Falling back to the database driver. ' +
      'Remove STORAGE_DRIVER from the environment to silence this warning.'
    );
    activeStorageDriver = 'database';
    return new DatabaseStorageDriver();
  }

  switch (env.storageDriver) {
    case 'local':
      activeStorageDriver = 'local';
      return new LocalStorageDriver();
    case 'database':
    default:
      activeStorageDriver = 'database';
      return new DatabaseStorageDriver();
    // case 's3': return new S3StorageDriver(); // implement when credentials exist
  }
}

export const storageService = getStorageDriver();

/**
 * The local folder, read directly. Used only by the import script that moves
 * pre-existing files into the database, which has to reach past whichever
 * driver is currently configured.
 */
export const localDriver = new LocalStorageDriver();
