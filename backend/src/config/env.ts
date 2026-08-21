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

  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',

  // 'database' by default: a container's disk is wiped on every deploy, so
  // anything written to a folder is gone the next time you ship.
  storageDriver: (process.env.STORAGE_DRIVER as 'database' | 'local' | 's3') ?? 'database',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',

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

  platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE ?? 10),
  defaultDeliveryFeeUgx: Number(process.env.DEFAULT_DELIVERY_FEE_UGX ?? 5000),
};
