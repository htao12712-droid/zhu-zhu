import cron from 'node-cron';
import { logger } from '../utils/logger';
import dataCollectorManager from './dataCollectorService';
import portfolioService from './portfolioService';
import valuationService from './valuationService';
import notificationService from './notificationService';
import db from '../config/database';

export class SchedulerService {
  private static instance: SchedulerService;
  private tasks: Map<string, any> = new Map();

  private constructor() {}

  public static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  public start(): void {
    logger.info('[Scheduler] Starting scheduler service...');

    this.registerTask(
      'data-collection-tiantianjijin',
      '0 18 * * 1-5',
      async () => {
        logger.info('[Scheduler] Running Tiantianjijin data collection task');
        await dataCollectorManager.runTiantianjijinCollector();
      }
    );

    this.registerTask(
      'data-collection-tiantian',
      '0 18 * * 1-5',
      async () => {
        logger.info('[Scheduler] Running Tiantian data collection task');
        await dataCollectorManager.runTiantianCollector();
      }
    );

    this.registerTask(
      'valuation-calculation',
      '0 19 * * 1-5',
      async () => {
        logger.info('[Scheduler] Running valuation calculation task');
        await valuationService.updateValuationStatus();
      }
    );

    this.registerTask(
      'portfolio-risk-check',
      '0 20 * * *',
      async () => {
        logger.info('[Scheduler] Running portfolio risk check task');
        await this.checkPortfolioRisk();
      }
    );

    this.registerTask(
      'daily-notification',
      '0 21 * * *',
      async () => {
        logger.info('[Scheduler] Running daily notification task');
        await this.sendDailyNotifications();
      }
    );

    this.registerTask(
      'weekly-report',
      '0 9 * * 0',
      async () => {
        logger.info('[Scheduler] Running weekly report task');
        await this.sendWeeklyReport();
      }
    );

    logger.info('[Scheduler] All scheduled tasks registered');
  }

  private async checkPortfolioRisk(): Promise<void> {
    try {
      const users = await db.query(
        'SELECT DISTINCT user_id FROM user_holdings'
      );

      for (const user of users.rows) {
        try {
          const diagnosis = await portfolioService.getRiskDiagnosis(user.user_id);

          if (diagnosis.warnings && diagnosis.warnings.length > 0) {
            for (const warning of diagnosis.warnings) {
              await notificationService.sendPortfolioRiskWarning(user.user_id, warning);
            }
          }
        } catch (error) {
          logger.error(`Failed to check risk for user ${user.user_id}:`, error);
        }
      }
    } catch (error) {
      logger.error('[Scheduler] Failed to check portfolio risks:', error);
    }
  }

  private async sendDailyNotifications(): Promise<void> {
    try {
      const valuations = await valuationService.getValuationDashboard();

      const lowValuationIndices = valuations.filter(
        (v: any) => v.valuation_status === '低估' && v.pe_percentile_5y < 20
      );

      const highValuationIndices = valuations.filter(
        (v: any) => v.valuation_status === '高估' && v.pe_percentile_5y > 80
      );

      const users = await db.query(
        'SELECT id FROM users WHERE member_level >= 1'
      );

      for (const user of users.rows) {
        try {
          for (const index of lowValuationIndices) {
            await notificationService.sendValuationSignal(
              user.id,
              index.index_name,
              index.pe_percentile_5y,
              true
            );
          }

          for (const index of highValuationIndices) {
            await notificationService.sendValuationSignal(
              user.id,
              index.index_name,
              index.pe_percentile_5y,
              false
            );
          }
        } catch (error) {
          logger.error(`Failed to send notification to user ${user.id}:`, error);
        }
      }

      logger.info(`[Scheduler] Sent daily notifications for ${users.rows.length} users`);
    } catch (error) {
      logger.error('[Scheduler] Failed to send daily notifications:', error);
    }
  }

  private async sendWeeklyReport(): Promise<void> {
    logger.info('[Scheduler] Weekly report generated');
  }

  private registerTask(name: string, cronExpression: string, task: () => Promise<void>): void {
    if (this.tasks.has(name)) {
      logger.warn(`[Scheduler] Task ${name} already registered`);
      return;
    }

    const scheduledTask = cron.schedule(cronExpression, async () => {
      try {
        await task();
        logger.info(`[Scheduler] Task ${name} completed successfully`);
      } catch (error) {
        logger.error(`[Scheduler] Task ${name} failed:`, error);
      }
    }, {
      timezone: 'Asia/Shanghai'
    });

    this.tasks.set(name, scheduledTask);
    logger.info(`[Scheduler] Task ${name} registered with schedule: ${cronExpression}`);
  }

  public stop(): void {
    logger.info('[Scheduler] Stopping all scheduled tasks...');

    this.tasks.forEach((task, name) => {
      task.stop();
      logger.info(`[Scheduler] Task ${name} stopped`);
    });

    this.tasks.clear();
    logger.info('[Scheduler] All tasks stopped');
  }

  public stopTask(name: string): void {
    const task = this.tasks.get(name);

    if (task) {
      task.stop();
      this.tasks.delete(name);
      logger.info(`[Scheduler] Task ${name} stopped`);
    }
  }

  public getTaskStatus(): Record<string, { running: boolean }> {
    const status: Record<string, { running: boolean }> = {};

    this.tasks.forEach((task, name) => {
      status[name] = {
        running: task.getRunning()
      };
    });

    return status;
  }

  public async runTaskNow(name: string): Promise<void> {
    logger.info(`[Scheduler] Running task ${name} immediately`);

    switch (name) {
      case 'data-collection-tiantianjijin':
        await dataCollectorManager.runTiantianjijinCollector();
        break;
      case 'data-collection-tiantian':
        await dataCollectorManager.runTiantianCollector();
        break;
      case 'valuation-calculation':
        await valuationService.updateValuationStatus();
        break;
      case 'portfolio-risk-check':
        await this.checkPortfolioRisk();
        break;
      case 'daily-notification':
        await this.sendDailyNotifications();
        break;
      case 'weekly-report':
        await this.sendWeeklyReport();
        break;
      default:
        throw new Error(`Unknown task: ${name}`);
    }
  }
}

export default SchedulerService.getInstance();
