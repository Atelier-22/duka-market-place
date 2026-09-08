import 'dotenv/config';

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProduction = nodeEnv === 'production';

const PLACEHOLDER = /change_me|changeme|example|placeholder/i;
const PRODUCTION_ORIGINS = ['https://www.dukashoppers.com', 'https://dukashoppers.com'];

const warnings: string[] = [];

function required(name: string, devFallback: string): string {
  const value = process.env[name];
  if (value && value.trim()) return value;
  if (isProduction) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return devFallback;
}

function secret(name: string, devFallback: string): string {
  const value = required(name, devFallback);
  if (isProduction && PLACEHOLDER.test(value)) {
    throw new Error(`${name} still holds a placeholder value. Set a real one before running in production.`);
  }
  if (isProduction && value.length < 32) {
    warnings.push(`${name} is only ${value.length} characters. Use at least 32 random characters.`);
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
    warnings.push(`CORS_ORIGIN is not set. Allowing ${PRODUCTION_ORIGINS.join(' and ')}.`);
    return PRODUCTION_ORIGINS;
  }
  return ['http://localhost:5173'];
}

function publicUrl(port: number): string {
  const explicit = (process.env.PUBLIC_URL ?? '').trim().replace(/\/+$/, '');
  if (explicit) return explicit;
  const render = (process.env.RENDER_EXTERNAL_URL ?? '').trim().replace(/\/+$/, '');
  if (isProduction && render) {
    warnings.push(`PUBLIC_URL is not set. Using the platform address ${render}. Set PUBLIC_URL to https://api.dukashoppers.com so upload links use your domain.`);
    return render;
  }
  if (isProduction) {
    warnings.push('PUBLIC_URL is not set. Using https://api.dukashoppers.com.');
    return 'https://api.dukashoppers.com';
  }
  return `http://localhost:${port}`;
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
  tavilyApiKey: (process.env.TAVILY_API_KEY ?? '').trim() || null,
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

  publicUrl: publicUrl(port),

  paymentDriver: (process.env.PAYMENT_DRIVER as 'manual' | 'mtn_momo' | 'airtel_money') ?? 'manual',

  ocrDriver: (process.env.OCR_DRIVER as 'manual' | 'claude') ?? 'manual',
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',

  idHashSecret: (() => {
    const value = (process.env.ID_HASH_SECRET ?? '').trim();
    if (value && !PLACEHOLDER.test(value)) {
      if (isProduction && value.length < 32) warnings.push('ID_HASH_SECRET is shorter than 32 characters.');
      return value;
    }
    if (isProduction) {
      warnings.push('ID_HASH_SECRET is not set. Set a dedicated 32+ character value; existing identity hashes keep working until you do.');
      return '';
    }
    return 'dev_id_hash_secret_change_me';
  })(),

  platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE ?? 10),
  defaultDeliveryFeeUgx: Number(process.env.DEFAULT_DELIVERY_FEE_UGX ?? 5000),

  trustProxy: process.env.TRUST_PROXY === 'false' ? false : isProduction,

  startupWarnings: warnings,
};

for (const warning of warnings) {
  // eslint-disable-next-line no-console
  console.warn(`[config] ${warning}`);
}
