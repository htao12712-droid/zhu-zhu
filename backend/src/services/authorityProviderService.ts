import axios, { AxiosInstance } from 'axios';
import cacheService from './cacheService';
import { logger } from '../utils/logger';
import { AppError } from '../middleware/errorHandler';

export interface FundSuggestion {
  fund_code: string;
  fund_name: string;
  fund_type?: string;
  fund_company?: string;
  provider: string;
}

export interface FundRealtimeEstimate {
  fund_code: string;
  fund_name: string;
  nav_date: string;
  unit_nav: number;
  estimate_nav: number;
  estimate_change_pct: number;
  updated_at: string;
  source_timestamp: string;
  received_at: string;
  provider: string;
  delayed: boolean;
}

class AuthorityProviderService {
  private readonly suggestionEndpoint = process.env.FUND_SEARCH_ENDPOINT || 'https://fundsuggest.eastmoney.com/FundSearch/api/FundSearchAPI.ashx';
  private readonly realtimeEndpoint = process.env.FUND_ESTIMATE_ENDPOINT || 'https://fundgz.1234567.com.cn/js';
  private readonly searchMode = process.env.FUND_SEARCH_MODE || '10';
  private readonly minKeywordLength = Number(process.env.FUND_SEARCH_MIN_LENGTH || 2);
  private readonly suggestionCacheTTL = Number(process.env.FUND_SEARCH_CACHE_TTL || 30);
  private readonly estimateCacheTTL = Number(process.env.FUND_ESTIMATE_CACHE_TTL || 10);
  private readonly providerName = process.env.FUND_PROVIDER_NAME || 'Eastmoney';
  private readonly userAgent = process.env.FUND_PROVIDER_USER_AGENT || 'Mozilla/5.0 (PigFundH5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36';

  private readonly suggestionClient: AxiosInstance;
  private readonly realtimeClient: AxiosInstance;

  constructor() {
    this.suggestionClient = axios.create({
      timeout: Number(process.env.FUND_SEARCH_TIMEOUT || 4000),
      headers: {
        Referer: 'https://fund.eastmoney.com',
        'User-Agent': this.userAgent
      }
    });

    this.realtimeClient = axios.create({
      timeout: Number(process.env.FUND_ESTIMATE_TIMEOUT || 4000),
      headers: {
        Referer: 'https://fund.eastmoney.com',
        'User-Agent': this.userAgent
      }
    });
  }

  async searchFunds(keyword: string, limit: number = 10): Promise<FundSuggestion[]> {
    const trimmed = keyword.trim();
    if (!trimmed || trimmed.length < this.minKeywordLength) {
      return [];
    }

    logger.debug(`[AuthorityProviderService] searchFunds keyword=${trimmed} limit=${limit}`);

    const cacheKey = `fund_search:${trimmed.toLowerCase()}:${limit}`;
    const cached = await cacheService.get<FundSuggestion[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const response = await this.suggestionClient.get(this.suggestionEndpoint, {
        params: {
          m: this.searchMode,
          key: trimmed,
          keyword: trimmed,
          pageindex: 1,
          pagesize: limit
        }
      });

      const datas = response.data?.Datas;
      if (!Array.isArray(datas)) {
        return [];
      }

      const suggestions: FundSuggestion[] = datas.slice(0, limit).map((item: any) => {
        const baseInfo = item.FundBaseInfo || {};
        const fund_code = item.FundCode || item.CODE || item.FCODE || baseInfo.FCODE || item._id || '';
        const fund_name = item.FundName || item.NAME || item.SHORTNAME || baseInfo.SHORTNAME || '';
        const fund_type = item.FundType || item.FUNDTYPE || baseInfo.FTYPE || '';
        const fund_company = item.FundCompany || item.JJGS || baseInfo.JJGS || '';

        return {
          fund_code,
          fund_name,
          fund_type,
          fund_company,
          provider: this.providerName
        };
      }).filter(item => item.fund_code && item.fund_name);

      if (suggestions.length > 0) {
        await cacheService.set(cacheKey, suggestions, this.suggestionCacheTTL);
      }

      return suggestions;
    } catch (error) {
      logger.error('AuthorityProviderService.searchFunds failed', { error });
      return [];
    }
  }

  async getRealtimeEstimate(fundCode: string): Promise<FundRealtimeEstimate> {
    const normalizedCode = fundCode.trim();
    if (!normalizedCode) {
      throw new AppError(400, '基金代码不能为空');
    }

    logger.debug(`[AuthorityProviderService] getRealtimeEstimate code=${normalizedCode}`);

    const cacheKey = `fund_estimate:${normalizedCode}`;
    const cached = await cacheService.get<FundRealtimeEstimate>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const url = `${this.realtimeEndpoint}/${normalizedCode}.js`;
      const response = await this.realtimeClient.get(url, {
        params: { rt: Date.now() }
      });

      const payload = this.parseJsonp(response.data);
      if (!payload) {
        throw new AppError(404, '未获取到实时估值');
      }

      const estimate: FundRealtimeEstimate = {
        fund_code: payload.fundcode,
        fund_name: payload.name,
        nav_date: payload.jzrq,
        unit_nav: Number(payload.dwjz) || 0,
        estimate_nav: Number(payload.gsz) || 0,
        estimate_change_pct: Number(payload.gszzl) || 0,
        updated_at: payload.gztime,
        source_timestamp: payload.gztime,
        received_at: new Date().toISOString(),
        provider: this.providerName,
        delayed: this.isDelayed(payload.gztime)
      };

      await cacheService.set(cacheKey, estimate, this.estimateCacheTTL);
      return estimate;
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      logger.error('AuthorityProviderService.getRealtimeEstimate failed', { error });
      throw new AppError(502, '实时估值服务不可用');
    }
  }

  private parseJsonp(payload: string): any | null {
    if (!payload) return null;
    const match = payload.match(/jsonpgz\((.*)\);?/);
    if (!match || match.length < 2) {
      return null;
    }
    try {
      return JSON.parse(match[1]);
    } catch (error) {
      logger.warn('Failed to parse fund realtime JSONP', { error });
      return null;
    }
  }

  private isDelayed(timestamp: string): boolean {
    if (!timestamp) return true;
    const parsed = new Date(timestamp.replace(/-/g, '/'));
    if (Number.isNaN(parsed.getTime())) {
      return true;
    }
    const diff = Date.now() - parsed.getTime();
    return diff > 5 * 60 * 1000;
  }
}

export default new AuthorityProviderService();
