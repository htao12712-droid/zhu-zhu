import { Router } from 'express';
import { getPerformanceAnalysis, getRiskAnalysis, getHoldingsAnalysis, getManagerAnalysis, calculateCorrelationMatrix } from '../controllers/analysisController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/:fundId/performance', optionalAuth, getPerformanceAnalysis);
router.get('/:fundId/risk', optionalAuth, getRiskAnalysis);
router.get('/:fundId/holdings', optionalAuth, getHoldingsAnalysis);
router.get('/:fundId/manager', optionalAuth, getManagerAnalysis);
router.post('/correlation', optionalAuth, calculateCorrelationMatrix);

export default router;
