import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth, requireRole('admin'));
router.get('/dashboard', asyncHandler(adminController.getDashboard));
router.get('/customers', asyncHandler(adminController.listCustomers));
router.get('/shoppers', asyncHandler(adminController.listShoppers));
router.get('/verifications/pending', asyncHandler(adminController.listPendingVerifications));
router.post('/verifications/:id/review', asyncHandler(adminController.reviewVerification));
router.get('/orders', asyncHandler(adminController.listOrders));
router.get('/requests', asyncHandler(adminController.listRequests));
router.get('/fees', asyncHandler(adminController.listFees));
router.post('/fees', asyncHandler(adminController.createFee));

export default router;
