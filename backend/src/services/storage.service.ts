import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { env } from '../config/env';
import { query, queryOne } from '../db/pool';

export interface StorageDriver {
  save(buffer: Buffer, originalName: string, folder: string, meta?: SaveMeta): Promise<string>;
  getUrl(key: string): string;

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

function buildKey(originalName: string, folder: string): string {
  const ext = path.extname(originalName) || '.bin';
  return `${folder}/${randomUUID()}${ext}`;
}

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

class R2StorageDriver implements StorageDriver {
  private client: S3Client;
  private bucket: string;

  private legacy = new DatabaseStorageDriver();

  constructor() {
    const { endpoint, accessKeyId, secretAccessKey, bucket, region } = env.r2;

    const missing = [
      !endpoint && 'R2_ENDPOINT (or R2_ACCOUNT_ID)',
      !accessKeyId && 'R2_ACCESS_KEY_ID',
      !secretAccessKey && 'R2_SECRET_ACCESS_KEY',
      !bucket && 'R2_BUCKET',
    ].filter(Boolean);
    if (missing.length) {
      throw new Error(`STORAGE_DRIVER=r2 but ${missing.join(', ')} not set`);
    }

    this.bucket = bucket;
    this.client = new S3Client({
      region,
      endpoint,

      forcePathStyle: true,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  async save(buffer: Buffer, originalName: string, folder: string, meta: SaveMeta = {}): Promise<string> {
    const key = buildKey(originalName, folder);
    await this.client.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: buffer,
      ContentType: meta.mimeType ?? mimeFromExtension(key),
      ContentLength: buffer.byteLength,
    }));
    return key;
  }

  getUrl(key: string): string {

    return `${env.publicUrl}/uploads/${key}`;
  }

  async read(key: string): Promise<StoredFile | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }));
      if (!result.Body) return null;
      const data = Buffer.from(await result.Body.transformToByteArray());
      return {
        data,
        mimeType: result.ContentType ?? mimeFromExtension(key),
        byteSize: data.byteLength,
        filename: path.basename(key),
      };
    } catch (err) {
      if (!isNotFound(err)) throw err;

      return this.legacy.read(key);
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));

    await this.legacy.delete(key);
  }
}

function isNotFound(err: unknown): boolean {
  const e = err as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
  return e?.name === 'NoSuchKey' || e?.name === 'NotFound'
    || e?.Code === 'NoSuchKey' || e?.$metadata?.httpStatusCode === 404;
}

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

    if (!fullPath.startsWith(this.root)) return null;
    if (!fs.existsSync(fullPath)) return null;
    const data = fs.readFileSync(fullPath);

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

export let activeStorageDriver: 'database' | 'local' | 's3' | 'r2' = 'database';

function getStorageDriver(): StorageDriver {

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

    case 'r2':
    case 's3':
      activeStorageDriver = env.storageDriver;
      return new R2StorageDriver();
    case 'database':
    default:
      activeStorageDriver = 'database';
      return new DatabaseStorageDriver();
  }
}

export const storageService = getStorageDriver();

export const localDriver = new LocalStorageDriver();
