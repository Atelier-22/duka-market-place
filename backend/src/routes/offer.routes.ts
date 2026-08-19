import { Router } from 'express';
import * as offerController from '../controllers/offer.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.post('/', requireRole('shopper'), asyncHandler(offerController.submitOffer));
router.post('/accept', requireRole('customer'), asyncHandler(offerController.acceptOffer));

export default router;
