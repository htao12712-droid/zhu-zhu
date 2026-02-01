import { Request, Response, NextFunction } from 'express';
import { AppError } from '../middleware/errorHandler';
import fundService from '../services/fundService';
import authorityProviderService, { FundSuggestion } from '../services/authorityProviderService';
import { logger } from '../utils/logger';

const ensureFundRecord = async (suggestion: FundSuggestion) => {
  try {
    let record = await fundService.findByCode(suggestion.fund_code);
    if (!record) {
      record = await fundService.create({
        fund_code: suggestion.fund_code,
        fund_name: suggestion.fund_name,
        fund_type: suggestion.fund_type || '其他',
        fund_company: suggestion.fund_company || '第三方数据源',
        established_date: undefined,
        fund_size: undefined,
        manager_id: undefined,
        benchmark_index: undefined,
        status: '正常'
      });
    }
    return record;
  } catch (error) {
    logger.warn('ensureFundRecord failed', { code: suggestion.fund_code, error });
    return null;
  }
};

export const getFundList = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, page = 1, pageSize = 20, keyword } = req.query;

    const pageNum = Math.max(1, Number(page) || 1);
    const pageSizeNum = Math.min(100, Number(pageSize) || 20);

    if (keyword) {
      const keywordStr = String(keyword);
      const funds = await fundService.search(keywordStr, pageSizeNum);
      return res.json({
        funds,
        pagination: {
          page: pageNum,
          pageSize: pageSizeNum,
          total: funds.length
        }
      });
    }

    const { funds, total } = await fundService.list(
      { type: type ? String(type) : undefined },
      { page: pageNum, pageSize: pageSizeNum }
    );

    res.json({
      funds,
      pagination: {
        page: pageNum,
        pageSize: pageSizeNum,
        total
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getFundDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const fund = await fundService.findById(Number(req.params.id));
    if (!fund) {
      throw new AppError(404, '基金不存在');
    }
    res.json({ fund });
  } catch (error) {
    next(error);
  }
};

export const getFundNavHistory = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { days = 365 } = req.query;

    const fund = await fundService.findById(Number(id));
    if (!fund) {
      throw new AppError(404, '基金不存在');
    }

    const navHistory = await fundService.getNavHistory(fund.id, Number(days));
    res.json({ navHistory });
  } catch (error) {
    next(error);
  }
};

export const getFundHoldings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    const fund = await fundService.findById(Number(id));
    if (!fund) {
      throw new AppError(404, '基金不存在');
    }

    const holdings = await fundService.getHoldings(fund.id, Number(limit));
    res.json({ holdings });
  } catch (error) {
    next(error);
  }
};

export const searchFunds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { keyword, limit = 10 } = req.query;

    if (!keyword) {
      const { funds } = await fundService.list({}, { page: 1, pageSize: Number(limit) });
      return res.json({ funds });
    }

    const keywordStr = String(keyword);
    const limitNum = Math.min(30, Math.max(1, Number(limit) || 10));

    logger.debug(`[searchFunds] keyword=${keywordStr} limit=${limitNum}`);
    const providerFunds = await authorityProviderService.searchFunds(keywordStr, limitNum);
    if (providerFunds.length > 0) {
      const enriched = await Promise.all(providerFunds.map(async (fund) => {
        const record = await ensureFundRecord(fund);
        return {
          id: record?.id || null,
          fund_code: fund.fund_code,
          fund_name: fund.fund_name,
          fund_type: fund.fund_type,
          fund_company: fund.fund_company,
          provider: fund.provider
        };
      }));
      return res.json({ funds: enriched });
    }

    const fallbackFunds = await fundService.search(keywordStr, limitNum);
    res.json({ funds: fallbackFunds });
  } catch (error) {
    next(error);
  }
};

export const getTopFunds = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { type, limit = 10 } = req.query;

    const funds = await fundService.getTopFunds(type ? String(type) : undefined, Number(limit));
    res.json({ funds });
  } catch (error) {
    next(error);
  }
};


export const getFundRealtimeEstimateBatch = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const codesRaw = (req.body?.codes || req.body?.fund_codes || []) as any;
    const codes: string[] = Array.isArray(codesRaw) ? codesRaw : [];
    const uniqueCodes = Array.from(new Set(codes.map(c => String(c || '').trim()).filter(Boolean))).slice(0, 50);

    if (uniqueCodes.length === 0) {
      res.json({ estimates: {} });
      return;
    }

    // Concurrency-limited fetch to avoid hammering provider
    const estimates: Record<string, any> = {};
    const concurrency = 5;
    let idx = 0;

    const workers = new Array(concurrency).fill(0).map(async () => {
      while (idx < uniqueCodes.length) {
        const code = uniqueCodes[idx++];
        try {
          const est = await authorityProviderService.getRealtimeEstimate(code);
          estimates[code] = est;
        } catch (e) {
          estimates[code] = null;
        }
      }
    });

    await Promise.all(workers);
    res.json({ estimates });
  } catch (error) {
    next(error);
  }
};

export const getFundRealtimeEstimate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { code } = req.params;
    logger.debug(`[getFundRealtimeEstimate] code=${code}`);
    const estimate = await authorityProviderService.getRealtimeEstimate(code);
    res.json({ estimate });
  } catch (error) {
    next(error);
  }
};
