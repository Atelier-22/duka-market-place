import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { requireAuth } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.get('/mine', asyncHandler(paymentController.listMine));
router.get('/order/:orderId', asyncHandler(paymentController.listForOrder));
router.post('/confirm', asyncHandler(paymentController.confirm));

export default router;
