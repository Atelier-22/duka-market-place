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
    // In dev this is served statically by Express (see src/index.ts).
    // A real driver would return a signed/CDN URL instead.
    return `/uploads/${key}`;
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
