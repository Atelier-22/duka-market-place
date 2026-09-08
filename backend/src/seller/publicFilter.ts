import { env } from '../config/env';

export const PUBLIC_ACCOUNT_FILTER = env.isProduction ? " AND u.email NOT LIKE '%@example.test'" : '';
