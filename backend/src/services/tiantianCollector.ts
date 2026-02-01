import { BaseDataCollector } from './dataCollectorService';
import axios from 'axios';
import { logger } from '../utils/logger';
import db from '../config/database-sqlite';

export interface TianTianFundData {
  FCODE: string
  FSHORTNAME: string
  FTYPE: string
  FSCALE: string
  FDATE: string
  FMANAGER: string
  FGL: string
}

export interface TianTianNavData {
  FCODE: string
  FSRQ: string
  DWJZ: number
  LJJZ: number
  JZZZ: number
}

export class TianTianDataCollector extends BaseDataCollector {
  private readonly BASE_URL = 'http://fund.eastmoney.com';
  private readonly API_BASE_URL = 'http://fund.eastmoney.com/data/rankreturn.aspx';

  constructor() {
    super({
      name: 'TianTianDataCollector',
      enabled: true,
      retryTimes: 3,
      retryDelay: 5000
    });
  }

  protected async doCollect(): Promise<void> {
    logger.info('[TianTianDataCollector] Starting data collection...');

    try {
      await this.collectFundList();
      logger.info('[TianTianDataCollector] Fund list collected successfully');
    } catch (error) {
      logger.error('[TianTianDataCollector] Failed to collect fund list:', error);
    }

    try {
      await this.collectFundNav();
      logger.info('[TianTianDataCollector] Fund nav collected successfully');
    } catch (error) {
      logger.error('[TianTianDataCollector] Failed to collect fund nav:', error);
    }
  }

  private async collectFundList(): Promise<void> {
    const pageSize = 100;
    let pageIndex = 0;
    let hasMore = true;
    let totalCollected = 0;

    while (hasMore) {
      try {
        const url = `${this.API_BASE_URL}?sc=1n&st=desc&sr=1y&ft=all&sd=2024-01-01&ed=2024-12-31&qdii=&pi=0&pn=${pageIndex}&dx=1`;

        const response = await this.axiosInstance.get(url, {
          responseType: 'arraybuffer'
        });

        const data = this.parseData(response.data);

        if (!data || !data.datas || data.datas.length === 0) {
          hasMore = false;
          break;
        }

        const funds: TianTianFundData[] = data.datas;

        for (const fund of funds) {
          try {
            await this.saveFund(fund);
            totalCollected++;
          } catch (error) {
            logger.error(`Failed to save fund ${fund.FCODE}:`, error);
          }
        }

        pageIndex += pageSize;
        await this.sleep(200);
      } catch (error) {
        logger.error(`Failed to fetch fund list page ${pageIndex}:`, error);
        hasMore = false;
      }
    }

    logger.info(`[TianTianDataCollector] Collected ${totalCollected} funds`);
  }

  private async collectFundNav(): Promise<void> {
    const funds = await db.query('SELECT fund_code FROM funds WHERE fund_code IS NOT NULL LIMIT 100');
    
    for (const fund of funds.rows) {
      try {
        const fundCode = fund.fund_code;
        const navData = await this.fetchNavFromSource(fundCode);
        
        if (navData && navData.length > 0) {
          for (const nav of navData) {
            try {
              await this.saveFundNav(nav);
            } catch (error) {
              logger.error(`Failed to save nav for ${fundCode}:`, error);
            }
          }
          logger.debug(`[TianTianDataCollector] Collected ${navData.length} nav records for ${fundCode}`);
        }
        
        await this.sleep(300);
      } catch (error) {
        logger.error(`Failed to collect nav for ${fund.fund_code}:`, error);
      }
    }
  }

  private async fetchNavFromSource(fundCode: string): Promise<TianTianNavData[]> {
    const url = `${this.BASE_URL}/f10/f10data_jjjz_data.html?fundCode=${fundCode}`;
    
    const response = await this.axiosInstance.get(url);
    const data = response.data;

    if (!data || !data.Data || !data.Data.FSRQList) {
      return [];
    }

    return data.Data.FSRQList.map((item: any) => ({
      FCODE: fundCode,
      FSRQ: item.FSRQ,
      DWJZ: parseFloat(item.DWJZ) || 0,
      LJJZ: parseFloat(item.LJJZ) || 0,
      JZZZ: parseFloat(item.JZZZ) || 0
    }));
  }

  private async saveFund(fundData: TianTianFundData): Promise<void> {
    const fundType = this.parseFundType(fundData.FTYPE);
    const fundSize = this.parseFundSize(fundData.FSCALE);

    const existingFund = await db.query(
      'SELECT id FROM funds WHERE fund_code = $1',
      [fundData.FCODE]
    );

    if (existingFund.rows.length > 0) {
      await db.query(
        `UPDATE funds 
         SET fund_name = $1, fund_type = $2, fund_company = $3, fund_size = $4, updated_at = CURRENT_TIMESTAMP 
         WHERE fund_code = $5`,
        [fundData.FSHORTNAME, fundType, '天天基金', fundSize, fundData.FCODE]
      );
    } else {
      const managerResult = await db.query(
        'SELECT id FROM fund_managers WHERE name = $1',
        [fundData.FMANAGER]
      );

      let managerId = null;
      if (managerResult.rows.length === 0) {
        const newManager = await db.query(
          'INSERT INTO fund_managers (name, current_company) VALUES ($1, $2) RETURNING id',
          [fundData.FMANAGER, fundData.FGL]
        );
        managerId = newManager.rows[0].id;
      } else {
        managerId = managerResult.rows[0].id;
      }

      await db.query(
        `INSERT INTO funds (fund_code, fund_name, fund_type, fund_company, established_date, fund_size, manager_id, benchmark_index, status) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, '正常')`,
        [fundData.FCODE, fundData.FSHORTNAME, fundType, fundData.FGL, fundData.FDATE, fundSize, managerId, null]
      );
    }
  }

  private async saveFundNav(navData: TianTianNavData): Promise<void> {
    const fundResult = await db.query(
      'SELECT id FROM funds WHERE fund_code = $1',
      [navData.FCODE]
    );

    if (fundResult.rows.length === 0) {
      return;
    }

    const fundId = fundResult.rows[0].id;

    await db.query(
      `INSERT INTO fund_nav_history (fund_id, nav_date, unit_nav, accumulated_nav, daily_return) 
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (fund_id, nav_date) DO UPDATE 
       SET unit_nav = EXCLUDED.unit_nav, accumulated_nav = EXCLUDED.accumulated_nav, daily_return = EXCLUDED.daily_return`,
      [fundId, navData.FSRQ, navData.DWJZ, navData.LJJZ, navData.JZZZ]
    );
  }

  private parseFundType(ftype: string): string {
    const typeMap: Record<string, string> = {
      '股票型': '股票型',
      '混合型': '混合型',
      '债券型': '债券型',
      '指数型': '指数型',
      '货币型': '货币型',
      'QDII': 'QDII'
    };

    for (const [key, value] of Object.entries(typeMap)) {
      if (ftype.includes(key)) {
        return value;
      }
    }

    return '混合型';
  }

  private parseFundSize(fscale: string): number {
    if (!fscale) return 0;

    const unitMap: Record<string, number> = {
      '亿': 100000000,
      '万': 10000,
      '元': 1
    };

    for (const [unit, multiplier] of Object.entries(unitMap)) {
      if (fscale.includes(unit)) {
        const numStr = fscale.replace(unit, '');
        const num = parseFloat(numStr);
        return isNaN(num) ? 0 : num * multiplier;
      }
    }

    return parseFloat(fscale) || 0;
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
}
