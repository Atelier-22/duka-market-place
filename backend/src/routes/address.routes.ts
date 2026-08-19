import { Router } from 'express';
import * as addressController from '../controllers/address.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);
router.get('/', asyncHandler(addressController.list));
router.post('/', asyncHandler(addressController.create));
export default router;
