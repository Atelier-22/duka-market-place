import { Router } from 'express';
import * as orderController from '../controllers/order.controller';
import * as trackingController from '../controllers/tracking.controller';
import { requireAuth, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

router.use(requireAuth);
router.get('/mine', asyncHandler(orderController.listMine));
router.get('/:id', asyncHandler(orderController.getById));
router.post('/:id/assign', requireRole('shopper'), asyncHandler(orderController.markAssigned));
router.post('/:id/shopping', requireRole('shopper'), asyncHandler(orderController.markShopping));
router.post('/:id/item-found', requireRole('shopper'), asyncHandler(orderController.markItemFound));
router.post('/:id/approve', requireRole('customer'), asyncHandler(orderController.approvePurchase));
router.post('/:id/out-for-delivery', requireRole('shopper'), asyncHandler(orderController.markOutForDelivery));
router.post('/:id/delivered', requireRole('customer', 'admin'), asyncHandler(orderController.confirmDelivered));
router.post('/:id/complete', asyncHandler(orderController.complete));
router.post('/:id/cancel', asyncHandler(orderController.cancel));

// Live tracking
router.get('/:id/tracking', asyncHandler(trackingController.getTracking));
router.post('/:id/location', requireRole('shopper'), asyncHandler(trackingController.postPosition));
router.post('/:id/shopping-done', requireRole('shopper'), asyncHandler(trackingController.markShoppingDone));

export default router;
