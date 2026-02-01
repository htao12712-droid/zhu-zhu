import { Router } from 'express';
import {
  getUserPortfolio,
  addHolding,
  updateHolding,
  deleteHolding,
  getRiskDiagnosis,
  getSimulatedPortfolios,
  createSimulatedPortfolio,
  getSimulatedPortfolioAllocations,
  addStopLossProfitSetting
} from '../controllers/portfolioController';
import { recognizeFund, importCSV } from '../controllers/importController';
import { authenticate, optionalAuth } from '../middleware/auth';
import multer from 'multer';

const upload = multer({ storage: multer.memoryStorage() });

const router = Router();

router.get('/', optionalAuth, getUserPortfolio);
router.post('/', optionalAuth, addHolding);
router.put('/:id', optionalAuth, updateHolding);
router.delete('/:id', optionalAuth, deleteHolding);
router.get('/risk-diagnosis', optionalAuth, getRiskDiagnosis);
router.get('/simulated', optionalAuth, getSimulatedPortfolios);
router.post('/simulated', optionalAuth, createSimulatedPortfolio);
router.get('/simulated/:portfolioId', optionalAuth, getSimulatedPortfolioAllocations);
router.post('/stop-loss-profit', optionalAuth, addStopLossProfitSetting);

router.post('/recognize', upload.single('image'), recognizeFund);
router.post('/import-csv', upload.single('file'), importCSV);

export default router;
