import 'dotenv/config';

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 4000),

  databaseUrl: required('DATABASE_URL', 'postgres://duka:duka@localhost:5432/duka'),

  jwtAccessSecret: required('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
  jwtRefreshSecret: required('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',

  /**
   * Allowed browser origins, comma-separated. A site normally answers to more
   * than one at a time — the apex and its www, plus the old host still serving
   * traffic while DNS moves — and every one of them has to be listed or the
   * browser blocks the call.
   */
  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  // 'database' by default: a container's disk is wiped on every deploy, so
  // anything written to a folder is gone the next time you ship.
  storageDriver: (process.env.STORAGE_DRIVER as 'database' | 'local' | 's3' | 'r2') ?? 'database',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',

  /**
   * Cloudflare R2. Durable like the database driver, but without putting image
   * bytes in Postgres, where they compete for space with the orders.
   *
   * R2 is S3-compatible, so the same client and the same driver serve either
   * one — point the endpoint at AWS and this is an S3 driver.
   */
  r2: {
    endpoint: process.env.R2_ENDPOINT
      ?? (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : ''),
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',
    // R2 ignores regions, but the S3 client refuses to start without one.
    region: process.env.R2_REGION ?? 'auto',
  },

  /**
   * Public origin of this API, used to build absolute URLs for uploaded files.
   *
   * It must be absolute: the frontend is served from a different origin in
   * production, so a relative "/uploads/x.png" would resolve against the
   * frontend's domain and 404. Set PUBLIC_URL on the API host to its own
   * public address (e.g. https://duka-backend-9098.onrender.com).
   */
  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`)
    .replace(/\/+$/, ''),

  paymentDriver: (process.env.PAYMENT_DRIVER as 'manual' | 'mtn_momo' | 'airtel_money') ?? 'manual',

  /**
   * Reading fields off an identity document. 'manual' means no automated
   * reading at all and a reviewer types what they see, which is a complete
   * workflow rather than a degraded one — see services/ocr.service.ts.
   */
  ocrDriver: (process.env.OCR_DRIVER as 'manual' | 'claude') ?? 'manual',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',

  /**
   * Keys the hash of every ID number in identity_registry.
   *
   * An unkeyed digest of a national ID number is reversible by anyone willing
   * to enumerate the format, which is short and structured, so the secret is
   * what stops the registry from being a list of real ID numbers. Changing it
   * makes every stored hash unmatchable and silently disables duplicate
   * detection, so it is treated as required in production rather than
   * defaulted.
   */
  idHashSecret: process.env.ID_HASH_SECRET ?? '',

  platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE ?? 10),
  defaultDeliveryFeeUgx: Number(process.env.DEFAULT_DELIVERY_FEE_UGX ?? 5000),
};
