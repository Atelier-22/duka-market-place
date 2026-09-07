import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import * as seller from './seller.controller';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });
const router = Router();

router.post('/enroll', requireAuth, limits.write, asyncHandler(seller.enroll));

router.use(requireAuth, requireRole('seller'));

router.get('/me', asyncHandler(seller.me));
router.get('/dashboard', asyncHandler(seller.dashboard));

router.post('/store', limits.write, asyncHandler(seller.createMyStore));
router.patch('/store', limits.write, asyncHandler(seller.updateMyStore));

router.get('/products', asyncHandler(seller.listProducts));
router.post('/products', limits.write, asyncHandler(seller.createNewProduct));
router.get('/products/:id', asyncHandler(seller.getProduct));
router.patch('/products/:id', limits.write, asyncHandler(seller.editProduct));
router.delete('/products/:id', limits.write, asyncHandler(seller.removeProduct));
router.post('/products/:id/publish', limits.write, asyncHandler(seller.publishProduct));
router.post('/products/:id/unpublish', limits.write, asyncHandler(seller.unpublishProduct));
router.post('/products/:id/archive', limits.write, asyncHandler(seller.archiveProduct));
router.post('/products/:id/duplicate', limits.write, asyncHandler(seller.copyProduct));
router.get('/products/:id/inventory', asyncHandler(seller.inventoryHistory));

router.get('/inventory', asyncHandler(seller.inventory));
router.post('/inventory/adjust', limits.write, asyncHandler(seller.adjustInventory));

router.get('/orders', asyncHandler(seller.orders));
router.get('/orders/:id', asyncHandler(seller.orderDetail));
router.post('/orders/:id/status', limits.write, asyncHandler(seller.updateOrder));

router.get('/customers', asyncHandler(seller.customers));
router.get('/reviews', asyncHandler(seller.reviews));
router.post('/reviews/:id/reply', limits.write, asyncHandler(seller.reply));
router.get('/followers', asyncHandler(seller.followers));
router.get('/analytics', asyncHandler(seller.analytics));
router.get('/forecast', asyncHandler(seller.forecast));

router.get('/promotions', asyncHandler(seller.promotions));
router.post('/promotions', limits.write, asyncHandler(seller.addPromotion));
router.patch('/promotions/:id', limits.write, asyncHandler(seller.togglePromotion));
router.delete('/promotions/:id', limits.write, asyncHandler(seller.removePromotion));

router.get('/settings', asyncHandler(seller.settings));
router.patch('/settings', limits.write, asyncHandler(seller.patchSettings));
router.get('/payments', asyncHandler(seller.payments));

router.get('/verification', asyncHandler(seller.myVerifications));
router.post('/verification', limits.verification, upload.single('document'), asyncHandler(seller.submitVerification));

export default router;
