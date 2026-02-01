import axios, { AxiosInstance } from 'axios';
import { logger } from '../utils/logger';
import db from '../config/database-sqlite';
import fundService from './fundService';
import valuationService from './valuationService';

export interface DataCollectorConfig {
  name: string;
  enabled: boolean;
  schedule?: string;
  retryTimes?: number;
  retryDelay?: number;
}

export abstract class BaseDataCollector {
  protected axiosInstance: AxiosInstance;
  protected config: DataCollectorConfig;

  constructor(config: DataCollectorConfig) {
    this.config = config;
    this.axiosInstance = axios.create({
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    this.axiosInstance.interceptors.request.use(
      (config) => {
        logger.debug(`[DataCollector] Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        logger.error('[DataCollector] Request error:', error);
        return Promise.reject(error);
      }
    );

    this.axiosInstance.interceptors.response.use(
      (response) => {
        logger.debug(`[DataCollector] Response: ${response.config.url} - ${response.status}`);
        return response;
      },
      (error) => {
        logger.error('[DataCollector] Response error:', error.message);
        return Promise.reject(error);
      }
    );
  }

  public async collect(): Promise<void> {
    if (!this.config.enabled) {
      logger.info(`[DataCollector] ${this.config.name} is disabled, skipping`);
      return;
    }

    logger.info(`[DataCollector] Starting ${this.config.name} collection...`);

    const retryTimes = this.config.retryTimes || 3;
    const retryDelay = this.config.retryDelay || 5000;

    for (let attempt = 1; attempt <= retryTimes; attempt++) {
      try {
        await this.doCollect();
        logger.info(`[DataCollector] ${this.config.name} collection completed successfully`);
        return;
      } catch (error) {
        logger.error(`[DataCollector] ${this.config.name} collection attempt ${attempt} failed:`, error);

        if (attempt < retryTimes) {
          logger.info(`[DataCollector] Retrying in ${retryDelay}ms...`);
          await this.sleep(retryDelay);
        } else {
          logger.error(`[DataCollector] ${this.config.name} collection failed after ${retryTimes} attempts`);
          throw error;
        }
      }
    }
  }

  protected abstract doCollect(): Promise<void>;

  protected async retry<T>(
    fn: () => Promise<T>,
    retries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < retries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === retries - 1) throw error;
        await this.sleep(delay * (i + 1));
      }
    }
    throw new Error('Retry failed');
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  protected validateDate(date: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(date);
  }

  protected validateNumber(value: any, min?: number, max?: number): boolean {
    if (typeof value !== 'number' || isNaN(value)) {
      return false;
    }
    if (min !== undefined && value < min) return false;
    if (max !== undefined && value > max) return false;
    return true;
  }

  protected safeParseNumber(value: any, defaultValue: number = 0): number {
    const num = parseFloat(value);
    return isNaN(num) ? defaultValue : num;
  }
}

export class DataCollectorManager {
  private collectors: Map<string, BaseDataCollector> = new Map();
  private isRunning: boolean = false;
  private initialized: boolean = false;

  public static getInstance(): DataCollectorManager {
    if (!DataCollectorManager.instance) {
      DataCollectorManager.instance = new DataCollectorManager();
    }
    return DataCollectorManager.instance;
  }

  private static instance: DataCollectorManager;

  private constructor() {
  }

  private ensureInitialized() {
    if (!this.initialized) {
      try {
        const tiantianjijinCollector = require('./tiantianjijinCollector').default;
        this.registerCollector('tiantianjijin', tiantianjijinCollector);
        this.initialized = true;
      } catch (error) {
        logger.warn('[DataCollectorManager] Failed to load tiantianjijin collector:', error);
      }
    }
  }

  public registerCollector(name: string, collector: BaseDataCollector): void {
    this.collectors.set(name, collector);
    logger.info(`[DataCollectorManager] Registered collector: ${name}`);
  }

  public unregisterCollector(name: string): void {
    this.collectors.delete(name);
    logger.info(`[DataCollectorManager] Unregistered collector: ${name}`);
  }

  public async runCollector(name: string): Promise<void> {
    this.ensureInitialized();
    const collector = this.collectors.get(name);
    if (!collector) {
      throw new Error(`Collector ${name} not found`);
    }
    await collector.collect();
  }

  public async runAllCollectors(): Promise<void> {
    this.ensureInitialized();

    if (this.isRunning) {
      logger.warn('[DataCollectorManager] Data collection is already running');
      return;
    }

    this.isRunning = true;
    const startTime = Date.now();

    try {
      const promises = Array.from(this.collectors.entries()).map(async ([name, collector]) => {
        try {
          await collector.collect();
        } catch (error) {
          logger.error(`[DataCollectorManager] Collector ${name} failed:`, error);
        }
      });

      await Promise.allSettled(promises);

      const duration = Date.now() - startTime;
      logger.info(`[DataCollectorManager] All collectors completed in ${duration}ms`);
    } finally {
      this.isRunning = false;
    }
  }

  public getCollectorStatus(): Record<string, { enabled: boolean; running: boolean }> {
    this.ensureInitialized();

    const status: Record<string, { enabled: boolean; running: boolean }> = {};

    this.collectors.forEach((collector, name) => {
      status[name] = {
        enabled: collector['config'].enabled,
        running: this.isRunning
      };
    });

    return status;
  }

  public async runTiantianjijinCollector(): Promise<void> {
    await this.runCollector('tiantianjijin');
  }

  public async runTiantianCollector(): Promise<void> {
    await this.runCollector('tiantian');
  }
}

export const dataCollectorManager = DataCollectorManager.getInstance();

export default dataCollectorManager;
