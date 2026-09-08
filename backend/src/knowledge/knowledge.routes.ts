import { Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import * as knowledge from './knowledge.controller';

const router = Router();

router.get('/categories', asyncHandler(knowledge.categories));
router.get('/form', asyncHandler(knowledge.form));
router.get('/filters', asyncHandler(knowledge.filters));
router.get('/interpret', asyncHandler(knowledge.interpret));

export default router;
