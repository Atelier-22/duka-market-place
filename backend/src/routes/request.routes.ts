import { Router } from 'express';
import * as requestController from '../controllers/request.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.post('/', requireRole('customer'), limits.write, asyncHandler(requestController.create));
router.get('/mine', requireRole('customer'), asyncHandler(requestController.listMine));
router.get('/available', requireRole('shopper', 'admin'), asyncHandler(requestController.listAvailable));
router.get('/:id', asyncHandler(requestController.getById));
router.post('/:id/cancel', requireRole('customer', 'admin'), asyncHandler(requestController.cancel));

export default router;
