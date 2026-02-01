import { Router } from 'express';
import { getValuationDashboard, getValuationRanking, getIndexValuationDetail, runBacktest } from '../controllers/valuationController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/dashboard', optionalAuth, getValuationDashboard);
router.get('/ranking', optionalAuth, getValuationRanking);
router.get('/index/:code/detail', optionalAuth, getIndexValuationDetail);
router.post('/backtest', optionalAuth, runBacktest);

export default router;
