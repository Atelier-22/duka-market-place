import { Router } from 'express';
import multer from 'multer';
import * as verification from '../controllers/verification.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

// Memory storage, like the general upload route: the bytes go straight to the
// storage driver and are never written to the container's disk, which is both
// wiped on restart and shared with nothing that should hold an ID scan.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();

router.post('/', requireAuth, upload.single('document'), asyncHandler(verification.submit));
router.get('/mine', requireAuth, asyncHandler(verification.mine));

// Before '/:id/document', which would otherwise swallow it.
router.get('/queue', requireAuth, requireRole('admin', 'super_admin'), asyncHandler(verification.queue));

// Authorization is inside the handler: the owner may see their own document,
// oversight roles may see any, and neither may see one after it is destroyed.
router.get('/:id/document', requireAuth, asyncHandler(verification.serveDocument));

router.post('/:id/decision', requireAuth, requireRole('admin', 'super_admin'), asyncHandler(verification.decide));

export default router;
