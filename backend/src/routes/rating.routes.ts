import { Router } from 'express';
import * as ratingController from '../controllers/rating.controller';
import { requireAuth } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.post('/order/:orderId', limits.write, asyncHandler(ratingController.rateOrder));

export default router;
