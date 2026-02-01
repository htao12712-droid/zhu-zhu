import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import analysisService from '../services/analysisService';
import cacheService from '../services/cacheService';

export const getPerformanceAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fundId } = req.params;
    const { days = 365 } = req.query;

    const cacheKey = `analysis:performance:${fundId}:${days}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const metrics = await analysisService.calculatePerformanceMetrics(
      Number(fundId),
      Number(days)
    );

    const comparison = await analysisService.getPerformanceComparison(Number(fundId));

    const result = {
      ...metrics,
      comparison
    };

    await cacheService.set(cacheKey, result, 1800);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getRiskAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fundId } = req.params;
    const { days = 365 } = req.query;

    const cacheKey = `analysis:risk:${fundId}:${days}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const metrics = await analysisService.calculatePerformanceMetrics(
      Number(fundId),
      Number(days)
    );

    const result = {
      volatility: metrics.volatility,
      maxDrawdown: metrics.maxDrawdown,
      sharpeRatio: metrics.sharpeRatio,
      winRate: metrics.winRate,
      riskLevel: metrics.maxDrawdown > 20 ? '高风险' : (metrics.maxDrawdown > 10 ? '中风险' : '低风险'),
      annualizedReturn: metrics.annualizedReturn
    };

    await cacheService.set(cacheKey, result, 1800);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getHoldingsAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fundId } = req.params;

    const cacheKey = `analysis:holdings:${fundId}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const concentration = await analysisService.analyzeHoldingsConcentration(Number(fundId));

    const result = {
      top10HoldingRatio: concentration.top10HoldingRatio,
      top5HoldingRatio: concentration.top5HoldingRatio,
      industryConcentration: concentration.industryConcentration,
      styleExposure: concentration.styleExposure,
      riskLevel: concentration.top10HoldingRatio > 70 ? '高集中' : (concentration.top10HoldingRatio > 50 ? '中集中' : '低集中')
    };

    await cacheService.set(cacheKey, result, 3600);

    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const getManagerAnalysis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fundId } = req.params;

    const fundResult = await cacheService.get(`fund:detail:${fundId}`);
    if (!fundResult) {
      throw new AppError(404, '基金不存在');
    }

    if (!fundResult.manager_id) {
      return res.json({
        manager: null,
        message: '该基金未设置基金经理'
      });
    }

    const cacheKey = `analysis:manager:${fundResult.manager_id}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) {
      return res.json(cached);
    }

    const performance = await analysisService.analyzeManagerPerformance(fundResult.manager_id);

    const result = {
      managerId: fundResult.manager_id,
      managerName: fundResult.manager_name,
      ...performance
    };

    await cacheService.set(cacheKey, result, 7200);

    res.json({ manager: result });
  } catch (error) {
    next(error);
  }
};

export const calculateCorrelationMatrix = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fundIds } = req.body;

    if (!fundIds || !Array.isArray(fundIds) || fundIds.length < 2) {
      throw new AppError(400, '请提供至少2个基金ID');
    }

    if (fundIds.length > 10) {
      throw new AppError(400, '最多支持10个基金的相关性计算');
    }

    const matrix = await analysisService.calculateCorrelationMatrix(fundIds);

    res.json({
      fundIds,
      correlationMatrix: matrix
    });
  } catch (error) {
    next(error);
  }
};
