import { Router } from 'express';
import * as locationController from '../controllers/location.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
// Before '/', which would otherwise never see it — Express matches in order.
router.get('/cities', asyncHandler(locationController.cities));
router.get('/', asyncHandler(locationController.list));
export default router;
