import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const PLACEHOLDER = /change_me|changeme|example|placeholder|secret$/i;

function required(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.trim()) {
    if (isProduction && PLACEHOLDER.test(value) && value.length < 32) {
      throw new Error(`${name} still holds a placeholder value. Set a real one before running in production.`);
    }
    return value;
  }
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

function secret(name: string, devFallback: string): string {
  const value = required(name, devFallback);
  if (isProduction && value.length < 32) {
    throw new Error(`${name} must be at least 32 characters in production.`);
  }
  return value;
}

function origins(raw: string | undefined): string[] {
  const list = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
  if (list.length > 0) return list;
  if (isProduction) {
    throw new Error('CORS_ORIGIN must list the production frontend origin, for example https://www.dukashoppers.com');
  }
  return ['http://localhost:5173'];
}

const port = Number(process.env.PORT ?? 4000);

export const env = {
  nodeEnv,
  isProduction,
  port,

  databaseUrl: required('DATABASE_URL', 'postgres://duka:duka@localhost:5432/duka'),

  jwtAccessSecret: secret('JWT_ACCESS_SECRET', 'dev_access_secret_change_me'),
  jwtRefreshSecret: secret('JWT_REFRESH_SECRET', 'dev_refresh_secret_change_me'),
  jwtAccessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '30d',

  corsOrigins: origins(process.env.CORS_ORIGIN),

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

  publicUrl: (process.env.PUBLIC_URL ?? (isProduction ? '' : `http://localhost:${port}`)).replace(/\/+$/, ''),

  paymentDriver: (process.env.PAYMENT_DRIVER as 'manual' | 'mtn_momo' | 'airtel_money') ?? 'manual',

  ocrDriver: (process.env.OCR_DRIVER as 'manual' | 'claude') ?? 'manual',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',

  idHashSecret: secret('ID_HASH_SECRET', 'dev_id_hash_secret_change_me'),

  platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE ?? 10),
  defaultDeliveryFeeUgx: Number(process.env.DEFAULT_DELIVERY_FEE_UGX ?? 5000),

  trustProxy: process.env.TRUST_PROXY === 'false' ? false : isProduction,
};

if (isProduction && !env.publicUrl) {
  throw new Error('PUBLIC_URL must be the public https address of this API in production, for example https://api.dukashoppers.com');
}
