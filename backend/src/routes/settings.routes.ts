import { Router } from 'express';
import * as settingsController from '../controllers/settings.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.get('/preferences', asyncHandler(settingsController.getPreferences));
router.patch('/preferences', asyncHandler(settingsController.patchPreferences));
router.patch('/profile', asyncHandler(settingsController.updateProfile));
router.post('/password', asyncHandler(settingsController.changePassword));
router.get('/export', asyncHandler(settingsController.exportData));

export default router;
