import { Router } from 'express';
import * as adminController from '../controllers/admin.controller';
import * as overview from '../controllers/adminOverview.controller';
import { requireAuth, requireRole, requireSuperAdmin } from '../middleware/auth';
import * as ops from '../controllers/adminOps.controller';
import * as staff from '../controllers/staff.controller';
import * as sellers from '../seller/sellerAdmin.controller';
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

router.get('/activity', asyncHandler(overview.getActivity));
router.get('/presence', asyncHandler(overview.getPresence));
router.get('/search', asyncHandler(overview.search));
router.get('/customers/:id', asyncHandler(overview.getCustomerDetail));
router.get('/shoppers/:id', asyncHandler(overview.getShopperDetail));
router.get('/orders/:id', asyncHandler(overview.getOrderDetail));
router.post('/orders/:id/force-cancel', asyncHandler(overview.forceCancelOrder));
router.post('/orders/:id/dispute', asyncHandler(overview.openDisputeForOrder));

router.post('/users/:id/suspend', asyncHandler(ops.suspendUser));
router.post('/users/:id/reactivate', asyncHandler(ops.reactivateUser));
router.post('/users/:id/reset-password', asyncHandler(ops.resetUserPassword));
router.post('/users/:id/role', asyncHandler(ops.changeUserRole));
router.post('/shoppers/:id/revoke-verification', asyncHandler(ops.revokeVerification));

router.post('/disputes/:id/resolve', asyncHandler(ops.resolveDispute));

router.get('/payouts', asyncHandler(ops.listPayouts));
router.post('/payouts/:id/pay', asyncHandler(ops.payOutShopper));
router.get('/payments', asyncHandler(ops.listPayments));
router.post('/payments/:id/settle', asyncHandler(ops.settlePayment));

router.post('/broadcast', asyncHandler(ops.broadcast));

router.get('/locations', asyncHandler(ops.listLocations));
router.post('/locations', asyncHandler(ops.createLocation));
router.post('/locations/:id/toggle', asyncHandler(ops.toggleLocation));

router.get('/analytics', asyncHandler(ops.analytics));
router.get('/audit', asyncHandler(ops.auditLog));

router.get('/sellers/stats', asyncHandler(sellers.stats));
router.get('/sellers/verifications', asyncHandler(sellers.verificationQueue));
router.get('/sellers/verifications/:id/document', asyncHandler(sellers.verificationDocument));
router.post('/sellers/verifications/:id/decision', asyncHandler(sellers.decideVerification));
router.get('/sellers/products', asyncHandler(sellers.products));
router.post('/sellers/products/:id/unpublish', asyncHandler(sellers.unpublishProduct));
router.post('/sellers/products/:id/flag', asyncHandler(sellers.flagProduct));
router.post('/sellers/products/:id/unflag', asyncHandler(sellers.unflagProduct));
router.get('/sellers/orders', asyncHandler(sellers.orders));
router.get('/sellers/stores', asyncHandler(sellers.stores));
router.get('/sellers', asyncHandler(sellers.list));
router.get('/sellers/:id', asyncHandler(sellers.detail));
router.post('/sellers/:id/suspend', asyncHandler(sellers.suspend));
router.post('/sellers/:id/reactivate', asyncHandler(sellers.reactivate));

router.get('/staff', requireSuperAdmin, asyncHandler(staff.listStaffAccounts));
router.post('/staff', requireSuperAdmin, asyncHandler(staff.createStaffAccount));
router.post('/staff/:id/suspend', requireSuperAdmin, asyncHandler(staff.suspendStaff));
router.post('/staff/:id/reactivate', requireSuperAdmin, asyncHandler(staff.reactivateStaff));
router.post('/staff/:id/reset-password', requireSuperAdmin, asyncHandler(staff.resetStaffPassword));
router.delete('/staff/:id', requireSuperAdmin, asyncHandler(staff.removeStaff));
router.get('/god-view', requireSuperAdmin, asyncHandler(staff.godView));

export default router;
