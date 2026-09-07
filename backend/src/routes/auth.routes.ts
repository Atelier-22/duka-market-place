import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.post('/register', limits.register, asyncHandler(authController.register));
router.post('/login', limits.login, limits.loginByIdentity, asyncHandler(authController.login));
router.post('/refresh', limits.refresh, asyncHandler(authController.refresh));
router.get('/me', requireAuth, asyncHandler(authController.me));
router.post('/switch-role', requireAuth, asyncHandler(authController.switchRole));
router.post('/switch-account', requireAuth, asyncHandler(authController.switchAccount));

export default router;
