import { Router } from 'express';
import * as requestController from '../controllers/request.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.post('/', requireRole('customer'), asyncHandler(requestController.create));
router.get('/mine', requireRole('customer'), asyncHandler(requestController.listMine));
router.get('/available', requireRole('shopper', 'admin'), asyncHandler(requestController.listAvailable));
router.get('/:id', asyncHandler(requestController.getById));

export default router;
