import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as knowledge from './knowledge.controller';
import * as intelligence from './intelligence.controller';
import { requireAuth } from '../middleware/auth';
import { limits } from '../middleware/rateLimit';

const router = Router();

router.get('/categories', asyncHandler(knowledge.categories));
router.get('/form', asyncHandler(knowledge.form));
router.get('/filters', asyncHandler(knowledge.filters));
router.get('/interpret', asyncHandler(knowledge.interpret));
router.get('/product', asyncHandler(intelligence.lookup));
router.get('/search', asyncHandler(intelligence.search));
router.post('/research', requireAuth, limits.write, asyncHandler(intelligence.research));

export default router;
