import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router({ mergeParams: true });

router.use(requireAuth);
router.get('/:orderId/messages', asyncHandler(messageController.list));
router.post('/:orderId/messages', asyncHandler(messageController.send));
router.post('/:orderId/messages/read', asyncHandler(messageController.markRead));

export default router;
