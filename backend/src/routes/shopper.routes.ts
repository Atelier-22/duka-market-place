import { Router } from 'express';
import * as shopperController from '../controllers/shopper.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.get('/:id/public-profile', asyncHandler(shopperController.getPublicProfile));

router.use(requireAuth, requireRole('shopper'));
router.get('/dashboard', asyncHandler(shopperController.getDashboard));
router.get('/earnings', asyncHandler(shopperController.getEarnings));
router.patch('/profile', asyncHandler(shopperController.updateProfile));
router.post('/verification', asyncHandler(shopperController.submitVerification));

export default router;
