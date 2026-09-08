import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { pool } from './db/pool';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import { limits } from './middleware/rateLimit';
import * as fileController from './controllers/file.controller';

import authRoutes from './routes/auth.routes';
import requestRoutes from './routes/request.routes';
import offerRoutes from './routes/offer.routes';
import orderRoutes from './routes/order.routes';
import messageRoutes from './routes/message.routes';
import paymentRoutes from './routes/payment.routes';
import ratingRoutes from './routes/rating.routes';
import disputeRoutes from './routes/dispute.routes';
import shopperRoutes from './routes/shopper.routes';
import adminRoutes from './routes/admin.routes';
import knowledgeRoutes from './knowledge/knowledge.routes';
import { registerKnowledge } from './knowledge';
import locationRoutes from './routes/location.routes';
import addressRoutes from './routes/address.routes';
import uploadRoutes from './routes/upload.routes';
import notificationRoutes from './routes/notification.routes';
import settingsRoutes from './routes/settings.routes';
import conversationRoutes from './routes/conversation.routes';
import verificationRoutes from './routes/verification.routes';
import sellerRoutes from './seller/seller.routes';
import marketplaceRoutes from './seller/marketplace.routes';
import * as marketplace from './seller/marketplace.controller';

const app = express();

app.disable('x-powered-by');
if (env.trustProxy) app.set('trust proxy', 1);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'none'"],
      imgSrc: ["'self'"],
      mediaSrc: ["'self'"],
      frameAncestors: ["'none'"],
      baseUri: ["'none'"],
      formAction: ["'none'"],
    },
  },
  referrerPolicy: { policy: 'no-referrer' },
  hsts: env.isProduction ? { maxAge: 31536000, includeSubDomains: true, preload: true } : false,
}));
app.use((_req, res, next) => {
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  next();
});

app.use(cors({
  origin: env.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Range'],
  exposedHeaders: ['Content-Range', 'Accept-Ranges', 'RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset', 'Retry-After'],
  maxAge: 600,
}));
app.use(express.json({ limit: '1mb' }));
app.use(morgan(env.isProduction ? 'combined' : 'dev', {
  skip: (req) => req.path === '/health',
}));

app.get(/^\/uploads\/(.+)$/, asyncHandler(fileController.serve));

app.get('/sitemap-marketplace.xml', asyncHandler(marketplace.sitemap));

app.get('/health', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  res.json({ status: 'ok' });
});

app.use('/api', limits.api);
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders', messageRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/ratings', ratingRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/shoppers', shopperRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/messages', conversationRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/seller', sellerRoutes);
app.use('/api/marketplace', marketplaceRoutes);
app.use('/api/knowledge', knowledgeRoutes);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use(errorHandler);

registerKnowledge();
const server = app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Duka API listening on port ${env.port} (${env.nodeEnv})`);
});

function shutdown(signal: string) {
  // eslint-disable-next-line no-console
  console.log(`${signal} received, closing`);
  server.close(() => {
    pool.end().finally(() => process.exit(0));
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
