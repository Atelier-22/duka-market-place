import { Router } from 'express';
import multer from 'multer';
import * as verification from '../controllers/verification.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

router.post('/', requireAuth, limits.verification, upload.single('document'), asyncHandler(verification.submit));
router.get('/mine', requireAuth, asyncHandler(verification.mine));

router.get('/queue', requireAuth, requireRole('admin', 'super_admin'), asyncHandler(verification.queue));

router.get('/:id/document', requireAuth, asyncHandler(verification.serveDocument));

router.post('/:id/decision', requireAuth, requireRole('admin', 'super_admin'), asyncHandler(verification.decide));

export default router;
