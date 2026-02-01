import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import db from '../config/database';
import portfolioService from '../services/portfolioService';
import { authenticate, optionalAuth } from '../middleware/auth';
import fundService from '../services/fundService';

export const getUserPortfolio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      res.json({
        holdings: [],
        summary: null
      });
      return;
    }

    const holdings = await portfolioService.getUserHoldings(userId);
    const summary = await portfolioService.getPortfolioSummary(userId);

    res.json({
      holdings,
      summary
    });
  } catch (error) {
    next(error);
  }
};

export const addHolding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    // 小倍养基口径：允许只传 fund_code + cost_amount（买入金额），后端自动换算份额并锁定成本价
    // 兼容旧字段：fundId/fundCode/fundName/buyAmount/holdingShares 等
    const body: any = req.body || {};
    const fundIdRaw = body.fundId ?? body.fund_id;
    const fundCodeRaw = body.fundCode ?? body.fund_code;
    const fundNameRaw = body.fundName ?? body.fund_name;

    let fundId: number | null = fundIdRaw ? Number(fundIdRaw) : null;

    // If only fund_code provided, lookup or create fund record
    if (!fundId && fundCodeRaw) {
      const code = String(fundCodeRaw).trim();
      const existing = await fundService.findByCode(code);
      if (existing) {
        fundId = Number((existing as any).id);
      } else {
        const created = await fundService.create({
          fund_code: code,
          fund_name: String(fundNameRaw || code),
          fund_type: '其他',
          fund_company: '第三方数据源',
          established_date: undefined,
          fund_size: undefined,
          manager_id: undefined,
          benchmark_index: undefined,
          status: '正常'
        } as any);
        fundId = Number((created as any).id);
      }
    }

    if (!fundId) {
      throw new AppError(400, '缺少必要参数: fundId 或 fund_code');
    }

    const buyAmountRaw = body.buyAmount ?? body.cost_amount ?? body.amount;
    const holdingSharesRaw = body.holdingShares ?? body.holding_shares;
    const costPriceRaw = body.costPrice ?? body.cost_price;

    const buyAmount = buyAmountRaw !== undefined && buyAmountRaw !== null && buyAmountRaw !== '' ? Number(buyAmountRaw) : undefined;
    const holdingShares = holdingSharesRaw !== undefined && holdingSharesRaw !== null && holdingSharesRaw !== '' ? Number(holdingSharesRaw) : undefined;
    const costPrice = costPriceRaw !== undefined && costPriceRaw !== null && costPriceRaw !== '' ? Number(costPriceRaw) : undefined;

    if ((holdingShares === undefined || isNaN(holdingShares)) && (buyAmount === undefined || isNaN(buyAmount))) {
      throw new AppError(400, '请至少提供买入金额或持有份额');
    }

    const holding = await portfolioService.addHolding({
      user_id: userId,
      fund_id: fundId,
      // 若 holding_shares 不传，portfolioService 会自动用买入金额按估算价/最新净值换算份额
      holding_shares: holdingShares,
      cost_price: costPrice,
      cost_amount: buyAmount
    } as any);

    res.json({
      message: '添加持仓成功',
      holding
    });
  } catch (error) {
    next(error);
  }
};




export const updateHolding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    const { id } = req.params;
    const body: any = req.body || {};

    const holdingSharesRaw = body.holdingShares ?? body.holding_shares;
    const costPriceRaw = body.costPrice ?? body.cost_price;
    const costAmountRaw = body.buyAmount ?? body.cost_amount;

    let holdingShares = holdingSharesRaw !== undefined && holdingSharesRaw !== null && holdingSharesRaw !== '' ? Number(holdingSharesRaw) : undefined;
    let costPrice = costPriceRaw !== undefined && costPriceRaw !== null && costPriceRaw !== '' ? Number(costPriceRaw) : undefined;
    const costAmount = costAmountRaw !== undefined && costAmountRaw !== null && costAmountRaw !== '' ? Number(costAmountRaw) : undefined;

    // 若只修改金额且未提供份额，则按当前成本价反推份额
    if ((holdingShares === undefined || isNaN(holdingShares)) && costAmount !== undefined && costAmount > 0) {
      const oldHolding = await db.query<any>('SELECT * FROM user_holdings WHERE id=$1', [Number(id)]);
      const old = oldHolding.rows?.[0];
      if (!old) throw new AppError(404, '持仓不存在');
      costPrice = costPrice && costPrice > 0 ? costPrice : Number(old.cost_price || 0);
      if (costPrice && costPrice > 0) {
        holdingShares = Number((costAmount / costPrice).toFixed(4));
      }
    }

    if (holdingShares !== undefined && holdingShares <= 0) {
      throw new AppError(400, '持有份额必须大于0');
    }
    if (costPrice !== undefined && costPrice <= 0) {
      throw new AppError(400, '成本价必须大于0');
    }

    const holding = await portfolioService.updateHolding(userId, Number(id), {
      holding_shares: holdingShares,
      cost_price: costPrice,
      cost_amount: costAmount
    } as any);

    if (!holding) {
      throw new AppError(404, '持仓不存在');
    }

    res.json({
      message: '更新持仓成功',
      holding
    });
  } catch (error) {
    next(error);
  }
};

export const deleteHolding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    const { id } = req.params;

    const success = await portfolioService.deleteHolding(userId, Number(id));

    if (!success) {
      throw new AppError(404, '持仓不存在');
    }

    res.json({
      message: '删除持仓成功'
    });
  } catch (error) {
    next(error);
  }
};

export const getRiskDiagnosis = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    const diagnosis = await portfolioService.getRiskDiagnosis(userId);

    res.json(diagnosis);
  } catch (error) {
    next(error);
  }
};

export const getSimulatedPortfolios = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    const portfolios = await portfolioService.getSimulatedPortfolios(userId);

    res.json({
      portfolios
    });
  } catch (error) {
    next(error);
  }
};

export const createSimulatedPortfolio = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    const { portfolioName, initialCapital, startDate, description, isPublic } = req.body;

    if (!portfolioName || !initialCapital || !startDate) {
      throw new AppError(400, '缺少必要参数');
    }

    if (initialCapital <= 0) {
      throw new AppError(400, '初始资金必须大于0');
    }

    const portfolio = await portfolioService.createSimulatedPortfolio({
      user_id: userId,
      portfolio_name: portfolioName,
      initial_capital: initialCapital,
      start_date: new Date(startDate),
      description,
      is_public: isPublic || false
    });

    res.status(201).json({
      message: '创建模拟组合成功',
      portfolio
    });
  } catch (error) {
    next(error);
  }
};

export const getSimulatedPortfolioAllocations = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    const { portfolioId } = req.params;

    const allocations = await portfolioService.getSimulatedPortfolioAllocations(Number(portfolioId));

    res.json({
      allocations
    });
  } catch (error) {
    next(error);
  }
};

export const addStopLossProfitSetting = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId;

    if (!userId) {
      throw new AppError(401, '请先登录');
    }

    const { fundId, stopProfitType, stopProfitValue, stopLossType, stopLossValue } = req.body;

    if (!fundId) {
      throw new AppError(400, '缺少基金ID');
    }

    const setting = await portfolioService.addStopLossProfitSetting({
      user_id: userId,
      fund_id: fundId,
      stop_profit_type: stopProfitType,
      stop_profit_value: stopProfitValue,
      stop_loss_type: stopLossType,
      stop_loss_value: stopLossValue
    });

    res.status(201).json({
      message: '添加止盈止损设置成功',
      setting
    });
  } catch (error) {
    next(error);
  }
};
