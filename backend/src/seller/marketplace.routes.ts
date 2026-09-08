import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';
import * as market from './marketplace.controller';

const router = Router();

router.get('/home', asyncHandler(market.home));
router.get('/products', asyncHandler(market.products));
router.get('/products/:id', asyncHandler(market.product));
router.get('/stores', asyncHandler(market.stores));
router.get('/stores/:slug', asyncHandler(market.store));
router.get('/search', asyncHandler(market.search));
router.get('/compare', asyncHandler(market.compare));
router.get('/categories', asyncHandler(market.categories));

router.post('/stores/:slug/follow', requireAuth, limits.write, asyncHandler(market.followStore));
router.delete('/stores/:slug/follow', requireAuth, limits.write, asyncHandler(market.unfollowStore));
router.get('/following', requireAuth, asyncHandler(market.following));

router.post('/orders', requireAuth, requireRole('customer', 'shopper'), limits.write, asyncHandler(market.checkout));
router.get('/orders/mine', requireAuth, asyncHandler(market.myPurchases));
router.get('/orders/:id', requireAuth, asyncHandler(market.myPurchase));
router.post('/orders/:id/cancel', requireAuth, limits.write, asyncHandler(market.cancelPurchase));
router.post('/orders/:id/review', requireAuth, limits.write, asyncHandler(market.reviewPurchase));

export default router;
