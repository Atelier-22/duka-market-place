import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler, asyncHandler } from './middleware/errorHandler';
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
import locationRoutes from './routes/location.routes';
import addressRoutes from './routes/address.routes';
import uploadRoutes from './routes/upload.routes';
import notificationRoutes from './routes/notification.routes';
import settingsRoutes from './routes/settings.routes';
import conversationRoutes from './routes/conversation.routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false })); // allow serving /uploads across origin in dev
app.use(cors({ origin: env.corsOrigin, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(morgan(env.nodeEnv === 'development' ? 'dev' : 'combined'));

// Serves uploads back from whichever driver is configured — the database by
// default, because a container's disk does not survive a deploy and every
// image anyone had sent was being wiped with it. Same URL shape as the old
// static folder, so URLs already stored in message rows keep resolving.
app.get(/^\/uploads\/(.+)$/, asyncHandler(fileController.serve));

app.get('/health', (_req, res) => res.json({ status: 'ok', env: env.nodeEnv }));

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/offers', offerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/orders', messageRoutes); // mounted under /api/orders/:orderId/messages
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

app.use((req, res) => res.status(404).json({ error: `No route for ${req.method} ${req.path}` }));
app.use(errorHandler);

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(`Duka API listening on http://localhost:${env.port} (${env.nodeEnv})`);
});
