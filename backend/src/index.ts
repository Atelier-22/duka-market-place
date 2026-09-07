import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
import * as fileController from './controllers/file.controller';
import { activeStorageDriver } from './services/storage.service';

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
import locationRoutes from './routes/location.routes';
import addressRoutes from './routes/address.routes';
import uploadRoutes from './routes/upload.routes';
import notificationRoutes from './routes/notification.routes';
import settingsRoutes from './routes/settings.routes';
import conversationRoutes from './routes/conversation.routes';
import verificationRoutes from './routes/verification.routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: env.corsOrigins, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

app.get(/^\/uploads\/(.+)$/, asyncHandler(fileController.serve));

app.get('/health', (_req, res) => res.json({
  status: 'ok',
  env: env.nodeEnv,
  storage: activeStorageDriver,
}));

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

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Duka API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});
