import { Router } from 'express';
import * as shopperController from '../controllers/shopper.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Readable by any signed-in user — a customer weighing up offers, or the two
// people on an order looking each other up. Deliberately not anonymous: a
// shopper's rating history and operating area are not public web data.
router.get('/:id/public-profile', requireAuth, asyncHandler(shopperController.getPublicProfile));

// Everything below is the shopper's own account. No route may be added above
// this line without deciding who else is allowed to see it.
router.use(requireAuth, requireRole('shopper'));
router.get('/dashboard', asyncHandler(shopperController.getDashboard));
router.get('/earnings', asyncHandler(shopperController.getEarnings));
router.patch('/profile', asyncHandler(shopperController.updateProfile));
router.post('/verification', asyncHandler(shopperController.submitVerification));

export default router;
