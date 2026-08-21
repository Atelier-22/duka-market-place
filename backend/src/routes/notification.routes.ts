import { Router } from 'express';
import * as notificationController from '../controllers/notification.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/', requireAuth, asyncHandler(notificationController.list));
router.get('/unread-count', requireAuth, asyncHandler(notificationController.unreadCount));
router.post('/read-all', requireAuth, asyncHandler(notificationController.readAll));
router.post('/:id/read', requireAuth, asyncHandler(notificationController.read));

export default router;
