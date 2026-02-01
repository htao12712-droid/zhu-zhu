import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';
import { logger } from '../utils/logger';

let influxDB: InfluxDB | null = null;
let writeApi: WriteApi | null = null;
let initialized = false;

interface InfluxConfig {
  url?: string;
  token?: string;
  org?: string;
  bucket?: string;
}

export class TimeSeriesService {
  private static instance: TimeSeriesService;

  private constructor() {}

  public static getInstance(): TimeSeriesService {
    if (!TimeSeriesService.instance) {
      TimeSeriesService.instance = new TimeSeriesService();
    }
    return TimeSeriesService.instance;
  }

  public async initialize(config?: InfluxConfig): Promise<void> {
    if (influxDB) {
      logger.warn('InfluxDB already initialized');
      return;
    }

    const influxConfig: InfluxConfig = config || {
      url: process.env.INFLUX_URL || 'http://localhost:8086',
      token: process.env.INFLUX_TOKEN || 'admin-token',
      org: process.env.INFLUX_ORG || 'pigfund',
      bucket: process.env.INFLUX_BUCKET || 'fund-nav'
    };

    try {
      influxDB = new InfluxDB({
        url: influxConfig.url!,
        token: influxConfig.token!
      });

      writeApi = influxDB.getWriteApi(influxConfig.org!, influxConfig.bucket!);
      writeApi.useDefaultTags({ location: 'server-1' });

      await writeApi.flush();
      logger.info('InfluxDB connection established successfully');
      initialized = true;
    } catch (error) {
      logger.error('Failed to connect to InfluxDB:', error);
      throw error;
    }
  }

  public async writeFundNav(data: {
    fundCode: string;
    fundType: string;
    unitNav: number;
    accumulatedNav: number;
    dailyReturn?: number;
    timestamp?: Date;
  }): Promise<void> {
    if (!writeApi) {
      throw new Error('InfluxDB writeApi not initialized');
    }

    try {
      const point = new Point('fund_nav')
        .tag('fund_code', data.fundCode)
        .tag('fund_type', data.fundType)
        .floatField('unit_nav', data.unitNav)
        .floatField('accumulated_nav', data.accumulatedNav)
        .timestamp(data.timestamp || new Date());

      if (data.dailyReturn !== undefined) {
        point.floatField('daily_return', data.dailyReturn);
      }

      writeApi.writePoint(point);
    } catch (error) {
      logger.error('Failed to write fund nav to InfluxDB:', error);
      throw error;
    }
  }

  public async writeBatchFundNav(dataArray: Array<{
    fundCode: string;
    fundType: string;
    unitNav: number;
    accumulatedNav: number;
    dailyReturn?: number;
    timestamp?: Date;
  }>): Promise<void> {
    if (!writeApi) {
      throw new Error('InfluxDB writeApi not initialized');
    }

    try {
      for (const data of dataArray) {
        const point = new Point('fund_nav')
          .tag('fund_code', data.fundCode)
          .tag('fund_type', data.fundType)
          .floatField('unit_nav', data.unitNav)
          .floatField('accumulated_nav', data.accumulatedNav)
          .timestamp(data.timestamp || new Date());

        if (data.dailyReturn !== undefined) {
          point.floatField('daily_return', data.dailyReturn);
        }

        writeApi.writePoint(point);
      }
    } catch (error) {
      logger.error('Failed to write batch fund nav to InfluxDB:', error);
      throw error;
    }
  }

  public async flush(): Promise<void> {
    if (!writeApi) {
      logger.warn('InfluxDB writeApi not initialized');
      return;
    }

    try {
      await writeApi.flush();
      logger.debug('InfluxDB data flushed successfully');
    } catch (error) {
      logger.error('Failed to flush InfluxDB data:', error);
      throw error;
    }
  }

  public async queryFundNav(fundCode: string, options: {
    start?: Date;
    stop?: Date;
    limit?: number;
  } = {}): Promise<Array<{
    time: Date;
    unit_nav: number;
    accumulated_nav: number;
    daily_return?: number;
  }>> {
    if (!influxDB) {
      throw new Error('InfluxDB not initialized');
    }

    try {
      const queryApi = influxDB.getQueryApi(process.env.INFLUX_ORG || 'pigfund');

      const start = options.start ? options.start.toISOString() : '-30d';
      const stop = options.stop ? options.stop.toISOString() : 'now()';
      const limit = options.limit || 100;

      const fluxQuery = `
        from(bucket: "${process.env.INFLUX_BUCKET || 'fund-nav'}")
          |> range(start: ${start}, stop: ${stop})
          |> filter(fn: (r) => r._measurement == "fund_nav")
          |> filter(fn: (r) => r.fund_code == "${fundCode}")
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
          |> sort(columns: ["_time"], desc: false)
          |> limit(n: ${limit})
      `;

      const result = await queryApi.collectRows(fluxQuery);

      return result.map((row: any) => ({
        time: new Date(row._time),
        unit_nav: row.unit_nav,
        accumulated_nav: row.accumulated_nav,
        daily_return: row.daily_return
      }));
    } catch (error) {
      logger.error('Failed to query fund nav from InfluxDB:', error);
      throw error;
    }
  }

  public async queryLatestNav(fundCode: string): Promise<{
    time: Date;
    unit_nav: number;
    accumulated_nav: number;
    daily_return?: number;
  } | null> {
    if (!influxDB) {
      throw new Error('InfluxDB not initialized');
    }

    try {
      const queryApi = influxDB.getQueryApi(process.env.INFLUX_ORG || 'pigfund');

      const fluxQuery = `
        from(bucket: "${process.env.INFLUX_BUCKET || 'fund-nav'}")
          |> range(start: -7d)
          |> filter(fn: (r) => r._measurement == "fund_nav")
          |> filter(fn: (r) => r.fund_code == "${fundCode}")
          |> last()
          |> pivot(rowKey:["_time"], columnKey: ["_field"], valueColumn: "_value")
      `;

      const result = await queryApi.collectRows(fluxQuery);

      if (result.length === 0) {
        return null;
      }

      const row = result[0] as any;
      return {
        time: new Date(row._time),
        unit_nav: row.unit_nav,
        accumulated_nav: row.accumulated_nav,
        daily_return: row.daily_return
      };
    } catch (error) {
      logger.error('Failed to query latest nav from InfluxDB:', error);
      throw error;
    }
  }

  public async queryFundNavBatch(fundCodes: string[], options: {
    start?: Date;
    stop?: Date;
    limit?: number;
  } = {}): Promise<Map<string, Array<{
    time: Date;
    unit_nav: number;
    accumulated_nav: number;
  }>>> {
    const result = new Map<string, Array<{
      time: Date;
      unit_nav: number;
      accumulated_nav: number;
    }>>();

    for (const fundCode of fundCodes) {
      try {
        const navData = await this.queryFundNav(fundCode, options);
        result.set(fundCode, navData);
      } catch (error) {
        logger.error(`Failed to query nav for fund ${fundCode}:`, error);
        result.set(fundCode, []);
      }
    }

    return result;
  }

  public async deleteFundNav(fundCode: string, start?: Date, stop?: Date): Promise<void> {
    logger.warn(`InfluxDB delete not supported in current version. Fund data for ${fundCode} will not be deleted.`);
  }

  public async healthCheck(): Promise<boolean> {
    if (!influxDB || !writeApi) {
      return false;
    }

    try {
      await writeApi.flush();
      return true;
    } catch (error) {
      logger.error('InfluxDB health check failed:', error);
      return false;
    }
  }

  public async getStats(): Promise<any> {
    if (!influxDB) {
      throw new Error('InfluxDB not initialized');
    }

    try {
      const queryApi = influxDB.getQueryApi(process.env.INFLUX_ORG || 'pigfund');

      const fluxQuery = `
        from(bucket: "${process.env.INFLUX_BUCKET || 'fund-nav'}")
          |> range(start: -30d)
          |> filter(fn: (r) => r._measurement == "fund_nav")
          |> group(columns: ["fund_code"])
          |> count()
      `;

      const result = await queryApi.collectRows(fluxQuery);
      return {
        fund_count: result.length,
        funds: result.map((row: any) => ({
          fund_code: row.fund_code,
          record_count: row._value
        }))
      };
    } catch (error) {
      logger.error('Failed to get InfluxDB stats:', error);
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      if (writeApi) {
        await writeApi.close();
        writeApi = null;
      }
      influxDB = null;
      initialized = false;
      logger.info('InfluxDB connection closed');
    } catch (error) {
      logger.error('Failed to close InfluxDB connection:', error);
    }
  }

  public isInitialized(): boolean {
    return initialized;
  }
}

export default TimeSeriesService.getInstance();
