import { Router } from 'express';
import { getFundList, getFundDetail, getFundNavHistory, getFundHoldings, searchFunds, getTopFunds, getFundRealtimeEstimate, getFundRealtimeEstimateBatch } from '../controllers/fundController';
import { optionalAuth } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuth, getFundList);
router.get('/search', optionalAuth, searchFunds);
router.get('/top', optionalAuth, getTopFunds);
router.post('/realtime/batch', optionalAuth, getFundRealtimeEstimateBatch);
router.get('/realtime/:code', optionalAuth, getFundRealtimeEstimate);
router.get('/:id', optionalAuth, getFundDetail);
router.get('/:id/nav', optionalAuth, getFundNavHistory);
router.get('/:id/holdings', optionalAuth, getFundHoldings);

export default router;
