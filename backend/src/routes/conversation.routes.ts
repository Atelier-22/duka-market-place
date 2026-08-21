import { Router } from 'express';
import * as messageController from '../controllers/message.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.get('/conversations', asyncHandler(messageController.conversations));

export default router;
