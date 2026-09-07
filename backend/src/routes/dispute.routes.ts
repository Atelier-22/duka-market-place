import { Router } from 'express';
import * as disputeController from '../controllers/dispute.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.post('/', limits.write, asyncHandler(disputeController.raise));
router.get('/', requireRole('admin'), asyncHandler(disputeController.listAll));
router.post('/:id/resolve', requireRole('admin'), asyncHandler(disputeController.resolve));

export default router;
