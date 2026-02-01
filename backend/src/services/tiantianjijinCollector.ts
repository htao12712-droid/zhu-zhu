import { BaseDataCollector } from './dataCollectorService';
import axios from 'axios';
import { logger } from '../utils/logger';
import db from '../config/database-sqlite';

export interface TiantianjijinFundData {
  fundcode: string
  fundname: string
  fundtype: string
  fundcompany: string
  fundsize: string
  established: string
}

export interface TiantianjijinNavData {
  fundcode: string
  fbrq: string
  dwjz: number
  ljjz: number
  jzze: number
}

export interface TiantianjijinValuationData {
  indexCode: string
  pe: number
  pb: number
  ps: number
  dividend: number
}

export class TiantianjijinDataCollector extends BaseDataCollector {
  private readonly BASE_URL = 'https://fund.eastmoney.com';
  private readonly API_BASE_URL = 'https://fund.eastmoney.com/pcjyh_fund';

  constructor() {
    super({
      name: 'TiantianjijinDataCollector',
      enabled: true,
      retryTimes: 3,
      retryDelay: 5000
    });
  }

  protected async doCollect(): Promise<void> {
    logger.info('[TiantianjijinDataCollector] Starting data collection...');

    try {
      await this.collectFundList();
      logger.info('[TiantianjijinDataCollector] Fund list collected successfully');
    } catch (error) {
      logger.error('[TiantianjijinDataCollector] Failed to collect fund list:', error);
    }

    try {
      await this.collectFundNav();
      logger.info('[TiantianjijinDataCollector] Fund nav collected successfully');
    } catch (error) {
      logger.error('[TiantianjijinDataCollector] Failed to collect fund nav:', error);
    }

    try {
      await this.collectValuationData();
      logger.info('[TiantianjijinDataCollector] Valuation data collected successfully');
    } catch (error) {
      logger.error('[TiantianjijinDataCollector] Failed to collect valuation data:', error);
    }
  }

  private async collectFundList(): Promise<void> {
    const pageSize = 100;
    let pageIndex = 0;
    let hasMore = true;
    let totalCollected = 0;

    while (hasMore) {
      try {
        const url = `${this.API_BASE_URL}/f10/jjflist_pjflist_v2_pjfundv4_1_${pageIndex}_${pageSize}.js`;

        const response = await this.axiosInstance.get(url, {
          responseType: 'arraybuffer'
        });

        const data = this.parseData(response.data);

        if (!data || !data.datas || data.datas.length === 0) {
          hasMore = false;
          break;
        }

        const funds: TiantianjijinFundData[] = data.datas;

        for (const fund of funds) {
          try {
            await this.saveFund(fund);
            totalCollected++;
          } catch (error) {
            logger.error(`Failed to save fund ${fund.fundcode}:`, error);
          }
        }

        pageIndex += pageSize;
        await this.sleep(100);
      } catch (error) {
        logger.error(`Failed to fetch fund list page ${pageIndex}:`, error);
        hasMore = false;
      }
    }

    logger.info(`[TiantianjijinDataCollector] Collected ${totalCollected} funds`);
  }

  private async collectFundNav(): Promise<void> {
    const pageSize = 100;
    let pageIndex = 0;
    let hasMore = true;
    let totalCollected = 0;

    while (hasMore) {
      try {
        const url = `${this.API_BASE_URL}/fundjj_data_pjjz_data.html`;

        const response = await this.axiosInstance.get(url, {
          params: {
            pageIndex,
            pageSize,
            fundType: 0,
            sortOrder: 'desc',
            sortColumn: 'zdf',
            isAsc: false,
            pageName: 1
          }
        });

        const data = response.data;

        if (!data || !data.list || data.list.length === 0) {
          hasMore = false;
          break;
        }

        for (const item of data.list) {
          try {
            await this.saveFundNav(item);
            totalCollected++;
          } catch (error) {
            logger.error(`Failed to save nav for ${item.fundcode}:`, error);
          }
        }

        pageIndex += pageSize;
        await this.sleep(100);
      } catch (error) {
        logger.error(`Failed to fetch nav data page ${pageIndex}:`, error);
        hasMore = false;
      }
    }

    logger.info(`[TiantianjijinDataCollector] Collected ${totalCollected} nav records`);
  }

  private async collectValuationData(): Promise<void> {
    const indexCodes = ['000300', '000016', '399006', '000905', '000852', '000688'];

    for (const indexCode of indexCodes) {
      try {
        const url = `${this.BASE_URL}/api/index/pepbps/${indexCode}`;
        const response = await this.axiosInstance.get(url);

        if (response.data && response.data.Data) {
          await this.saveValuation(indexCode, response.data.Data);
          logger.info(`Collected valuation for ${indexCode}`);
        }

        await this.sleep(200);
      } catch (error) {
        logger.error(`Failed to collect valuation for ${indexCode}:`, error);
      }
    }
  }

  private async saveFund(fundData: TiantianjijinFundData): Promise<void> {
    const fundSize = this.parseFundSize(fundData.fundsize);

    const existingFund = await db.query(
      'SELECT id FROM funds WHERE fund_code = $1',
      [fundData.fundcode]
    );

    if (existingFund.rows.length > 0) {
      await db.query(
        `UPDATE funds
         SET fund_name = $1, fund_type = $2, fund_company = $3, fund_size = $4, updated_at = CURRENT_TIMESTAMP
         WHERE fund_code = $5`,
        [fundData.fundname, fundData.fundtype, fundData.fundcompany, fundSize, fundData.fundcode] as any[]
      );
    } else {
      await db.query(
        `INSERT INTO funds (fund_code, fund_name, fund_type, fund_company, established_date, fund_size, status)
         VALUES ($1, $2, $3, $4, $5, $6, '正常')`,
        [fundData.fundcode, fundData.fundname, fundData.fundtype, fundData.fundcompany, fundData.established, fundSize] as any[]
      );
    }
  }

  private async saveFundNav(navData: any): Promise<void> {
    const fundCode = navData.fundcode;
    const navDate = navData.fbrq;
    const unitNav = parseFloat(navData.dwjz);
    const accumulatedNav = parseFloat(navData.ljjz);
    const dailyReturn = parseFloat(navData.jzze);

    if (!unitNav || !accumulatedNav) {
      return;
    }

    const fund = await db.query(
      'SELECT id FROM funds WHERE fund_code = $1',
      [fundCode]
    );

    if (fund.rows.length === 0) {
      return;
    }

    const fundId = fund.rows[0].id;

    await db.query(
      `INSERT INTO fund_nav_history (fund_id, nav_date, unit_nav, accumulated_nav, daily_return) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (fund_id, nav_date) DO UPDATE 
       SET unit_nav = EXCLUDED.unit_nav, accumulated_nav = EXCLUDED.accumulated_nav, daily_return = EXCLUDED.daily_return`,
      [fundId, navDate, unitNav, accumulatedNav, dailyReturn]
    );
  }

  private async saveValuation(indexCode: string, data: any): Promise<void> {
    const index = await db.query(
      'SELECT id FROM indices WHERE index_code = $1',
      [indexCode]
    );

    if (index.rows.length === 0) {
      return;
    }

    const indexId = index.rows[0].id;

    const peRatio = data.PE || null;
    const pbRatio = data.PB || null;
    const psRatio = data.PS || null;
    const dividendYield = data.DY || null;

    if (!peRatio) {
      return;
    }

    const percentile = await this.calculatePercentile(indexId, peRatio);

    const valuationStatus = this.getValuationStatus(percentile);

    await db.query(
      `INSERT INTO index_valuations (index_id, valuation_date, pe_ratio, pb_ratio, ps_ratio, dividend_yield, pe_percentile_5y, valuation_status) 
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (index_id, valuation_date) DO UPDATE 
       SET pe_ratio = EXCLUDED.pe_ratio, pb_ratio = EXCLUDED.pb_ratio, ps_ratio = EXCLUDED.ps_ratio, 
           dividend_yield = EXCLUDED.dividend_yield, pe_percentile_5y = EXCLUDED.pe_percentile_5y, 
           valuation_status = EXCLUDED.valuation_status`,
      [indexId, peRatio, pbRatio, psRatio, dividendYield, percentile, valuationStatus]
    );
  }

  private async calculatePercentile(indexId: number, currentPe: number): Promise<number> {
    const result = await db.query(
      'SELECT COUNT(*) as count, SUM(CASE WHEN pe_ratio <= $1 THEN 1 ELSE 0 END) as rank FROM index_valuations WHERE index_id = $2',
      [currentPe, indexId]
    );

    const { count, rank } = result.rows[0];
    return count > 0 ? (rank / count) * 100 : 50;
  }

  private getValuationStatus(percentile: number): string {
    if (percentile < 30) return '低估';
    if (percentile > 70) return '高估';
    return '正常';
  }

  private parseData(data: any): any {
    if (typeof data === 'string') {
      const match = data.match(/var\s+(\w+)\s*=\s*(\{[^}]+\})/);
      if (match) {
        try {
          return JSON.parse(match[2]);
        } catch {
          return null;
        }
      }
    }
    return data;
  }

  private parseFundSize(sizeStr: string): number {
    if (!sizeStr) return 0;

    const unitMap: Record<string, number> = {
      '亿': 100000000,
      '万': 10000,
      '元': 1
    };

    for (const [unit, multiplier] of Object.entries(unitMap)) {
      if (sizeStr.includes(unit)) {
        const numStr = sizeStr.replace(unit, '');
        const num = parseFloat(numStr);
        return isNaN(num) ? 0 : num * multiplier;
      }
    }

    return parseFloat(sizeStr) || 0;
  }
}

export default new TiantianjijinDataCollector();
