import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { env } from '../config/env';

/**
 * Storage abstraction for product photos, receipts, and verification
 * documents. `LocalStorageDriver` is a working implementation suitable for
 * local development and small deployments.
 *
 * ── TO ADD A REAL PROVIDER (e.g. S3/Cloudinary/DO Spaces) ──
 * Implement `StorageDriver` with the same three methods, point
 * `STORAGE_DRIVER=s3` in .env, and wire it up in `getStorageDriver()` below.
 * Nothing else in the codebase needs to change — every route calls
 * `storageService.save(...)` / `.getUrl(...)`, never the filesystem directly.
 */
export interface StorageDriver {
  save(buffer: Buffer, originalName: string, folder: string): Promise<string>; // returns a storage key
  getUrl(key: string): string;
  delete(key: string): Promise<void>;
}

class LocalStorageDriver implements StorageDriver {
  private root = path.resolve(process.cwd(), env.uploadDir);

  constructor() {
    fs.mkdirSync(this.root, { recursive: true });
  }

  async save(buffer: Buffer, originalName: string, folder: string): Promise<string> {
    const ext = path.extname(originalName) || '.bin';
    const key = `${folder}/${randomUUID()}${ext}`;
    const fullPath = path.join(this.root, key);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, buffer);
    return key;
  }

  getUrl(key: string): string {
    // Absolute, not relative. The file is served by this API (see index.ts),
    // but the URL is stored in the database and rendered by a frontend on a
    // different origin — a relative path would resolve against the frontend
    // and 404, and would also fail the URL validation on every endpoint that
    // accepts an uploaded file.
    return `${env.publicUrl}/uploads/${key}`;
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.root, key);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
  }
}

function getStorageDriver(): StorageDriver {
  switch (env.storageDriver) {
    case 'local':
    default:
      return new LocalStorageDriver();
    // case 's3': return new S3StorageDriver(); // implement when credentials exist
  }
}

export const storageService = getStorageDriver();
