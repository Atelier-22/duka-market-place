import { Router } from 'express';
import * as locationController from '../controllers/location.controller';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();
router.get('/', asyncHandler(locationController.list));
export default router;
