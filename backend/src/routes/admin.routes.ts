import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as overview from '../controllers/adminOverview.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// Applied before every route below, with no exceptions — nothing on this
// router is reachable without an authenticated admin. Keep it that way: any
// new route added under here inherits the guard automatically, and no route
// may be registered above this line.
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

// Control centre: platform-wide overview, search, and drill-downs.
router.get('/activity', asyncHandler(overview.getActivity));
router.get('/presence', asyncHandler(overview.getPresence));
router.get('/search', asyncHandler(overview.search));
router.get('/customers/:id', asyncHandler(overview.getCustomerDetail));
router.get('/shoppers/:id', asyncHandler(overview.getShopperDetail));
router.get('/orders/:id', asyncHandler(overview.getOrderDetail));
router.post('/orders/:id/force-cancel', asyncHandler(overview.forceCancelOrder));
router.post('/orders/:id/dispute', asyncHandler(overview.openDisputeForOrder));

export default router;
