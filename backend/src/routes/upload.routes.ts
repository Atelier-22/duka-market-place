import { Router } from 'express';
import multer from 'multer';
import * as uploadController from '../controllers/upload.controller';
import { requireAuth } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

const router = Router();
router.post('/', requireAuth, limits.upload, upload.single('file'), asyncHandler(uploadController.upload));
export default router;
