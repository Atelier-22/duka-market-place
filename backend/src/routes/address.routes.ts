import { Router } from 'express';
import * as addressController from '../controllers/address.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.use(requireAuth);
router.get('/', asyncHandler(addressController.list));
router.post('/', asyncHandler(addressController.create));
router.patch('/:id/pin', asyncHandler(addressController.pin));
router.patch('/:id/default', asyncHandler(addressController.makeDefault));
router.patch('/:id', asyncHandler(addressController.update));
router.delete('/:id', asyncHandler(addressController.remove));
export default router;
