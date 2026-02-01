import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import valuationService from '../services/valuationService';
import backtestEngine from '../services/backtestEngine';
import cacheService from '../services/cacheService';

const MOCK_VALUATION_DATA = {
  indices: [
    {
      index_code: '000300',
      index_name: '沪深300',
      pe_ratio: 11.5,
      pe_percentile_5y: 32.5,
      valuation_status: '正常'
    },
    {
      index_code: '000016',
      index_name: '上证50',
      pe_ratio: 9.8,
      pe_percentile_5y: 28.3,
      valuation_status: '正常'
    },
    {
      index_code: '399006',
      index_name: '创业板指',
      pe_ratio: 28.5,
      pe_percentile_5y: 15.2,
      valuation_status: '低估'
    },
    {
      index_code: '000905',
      index_name: '中证500',
      pe_ratio: 19.2,
      pe_percentile_5y: 45.8,
      valuation_status: '正常'
    },
    {
      index_code: '000852',
      index_name: '中证1000',
      pe_ratio: 32.5,
      pe_percentile_5y: 52.3,
      valuation_status: '正常'
    },
    {
      index_code: '000688',
      index_name: '科创50',
      pe_ratio: 42.8,
      pe_percentile_5y: 75.6,
      valuation_status: '高估'
    }
  ]
};

export const getValuationDashboard = async (req: Request, res: Response, next: NextFunction) => {
  res.json(MOCK_VALUATION_DATA);
};

export const getValuationRanking = async (req: Request, res: Response, next: NextFunction) => {
  res.json({
    ranking: MOCK_VALUATION_DATA.indices
  });
};

export const getIndexValuationDetail = async (req: Request, res: Response, next: NextFunction) => {
  const { code } = req.params;  
  const index = MOCK_VALUATION_DATA.indices.find(i => i.index_code === code);
  
  if (!index) {
    throw new AppError(404, '指数不存在');
  }

  res.json({
    index
  });
};

export const runBacktest = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { indexCode, initialAmount, frequency, duration, lowPercentile = 30, highPercentile = 70, lowMultiple = 1.5, highMultiple = 0.5 } = req.body;

    if (!indexCode || !initialAmount || !frequency || !duration) {
      throw new AppError(400, '缺少必要参数');
    }

    if (initialAmount <= 0) {
      throw new AppError(400, '初始金额必须大于0');
    }

    const result = await backtestEngine.runValuationBacktest({
      indexCode,
      initialAmount: Number(initialAmount),
      frequency,
      duration: Number(duration),
      lowPercentile: Number(lowPercentile),
      highPercentile: Number(highPercentile),
      lowMultiple: Number(lowMultiple),
      highMultiple: Number(highMultiple)
    });

    res.json({
      message: '回测完成',
      result
    });
  } catch (error) {
    next(error);
  }
};
