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

  corsOrigins: (process.env.CORS_ORIGIN ?? 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean),

  storageDriver: (process.env.STORAGE_DRIVER as 'database' | 'local' | 's3' | 'r2') ?? 'database',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',

  r2: {
    endpoint: process.env.R2_ENDPOINT
      ?? (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : ''),
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET ?? '',

    region: process.env.R2_REGION ?? 'auto',
  },

  publicUrl: (process.env.PUBLIC_URL ?? `http://localhost:${Number(process.env.PORT ?? 4000)}`)
    .replace(/\/+$/, ''),

  paymentDriver: (process.env.PAYMENT_DRIVER as 'manual' | 'mtn_momo' | 'airtel_money') ?? 'manual',

  ocrDriver: (process.env.OCR_DRIVER as 'manual' | 'claude') ?? 'manual',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',

  idHashSecret: process.env.ID_HASH_SECRET ?? '',

  platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE ?? 10),
  defaultDeliveryFeeUgx: Number(process.env.DEFAULT_DELIVERY_FEE_UGX ?? 5000),
};
