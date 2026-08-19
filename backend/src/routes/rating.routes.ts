import { Router } from 'express';
import * as ratingController from '../controllers/rating.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.post('/order/:orderId', asyncHandler(ratingController.rateOrder));

export default router;
