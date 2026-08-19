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

  storageDriver: (process.env.STORAGE_DRIVER as 'local' | 's3') ?? 'local',
  uploadDir: process.env.UPLOAD_DIR ?? './uploads',

  paymentDriver: (process.env.PAYMENT_DRIVER as 'manual' | 'mtn_momo' | 'airtel_money') ?? 'manual',

  platformFeePercentage: Number(process.env.PLATFORM_FEE_PERCENTAGE ?? 10),
  defaultDeliveryFeeUgx: Number(process.env.DEFAULT_DELIVERY_FEE_UGX ?? 5000),
};
