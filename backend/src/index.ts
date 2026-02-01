import express from 'express';
import fs from 'fs';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import dotenv from 'dotenv';
import { logger } from './utils/logger';
import { errorHandler } from './middleware/errorHandler';
import { rateLimiterMiddleware } from './middleware/rateLimiter';
import db from './config/database-sqlite';
import timeSeriesService from './services/timeSeriesService';
import dataCollectorManager from './services/dataCollectorService';
import notificationService from './services/notificationService';
import schedulerService from './services/schedulerService';

// 路由
import authRoutes from './routes/auth';
import fundRoutes from './routes/funds';
import valuationRoutes from './routes/valuation';
import portfolioRoutes from './routes/portfolio';
import analysisRoutes from './routes/analysis';
import notificationRoutes from './routes/notifications';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(rateLimiterMiddleware);

app.use('/api/auth', authRoutes);
app.use('/api/funds', fundRoutes);
app.use('/api/valuation', valuationRoutes);
app.use('/api/portfolio', portfolioRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/health', async (req, res) => {
  try {
    const dbHealth = db.isInitialized();
    const tsHealth = timeSeriesService.isInitialized();

    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      services: {
        database: dbHealth ? 'healthy' : 'unhealthy',
        influxdb: tsHealth ? 'healthy' : 'unhealthy'
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed'
    });
  }
});

app.get('/api/admin/collectors/status', (req, res) => {
  res.json(dataCollectorManager.getCollectorStatus());
});

app.post('/api/admin/collectors/run', async (req, res) => {
  try {
    const { collector } = req.body;

    if (collector) {
      await dataCollectorManager.runCollector(collector);
      res.json({ message: `Collector ${collector} executed successfully` });
    } else {
      await dataCollectorManager.runAllCollectors();
      res.json({ message: 'All collectors executed successfully' });
    }
  } catch (error) {
    logger.error('Failed to run collectors:', error);
    res.status(500).json({ error: 'Failed to run collectors' });
  }
});

app.use(errorHandler);

async function runSqlFile(filePath: string) {
  const sql = fs.readFileSync(filePath, 'utf-8');
  if (!sql.trim()) return;
  // pg supports multi-statement; schema/seeds files are written as plain SQL
  await db.query(sql);
}

async function startServer() {
  let dbInitialized = false;
  let tsInitialized = false;
  let notificationsStarted = false;
  let schedulerStarted = false;

  try {
    await db.initialize();
    logger.info('Database initialized successfully');
    const autoInit = (process.env.AUTO_INIT_DB || 'false') === 'true';
    if (autoInit) {
      try {
        const schemaFile = path.join(__dirname, '../database/schema.sql');
        const seedsFile = path.join(__dirname, '../database/seeds.sql');
        await runSqlFile(schemaFile);
        await runSqlFile(seedsFile);
        logger.info('Database schema/seeds ensured');
      } catch (error) {
        logger.warn('Database auto-init failed (schema/seeds):', error);
      }
    }
    dbInitialized = true;
  } catch (error) {
    logger.warn('Database initialization failed, running in degraded mode:', error);
  }

  try {
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('TimeSeries connection timeout')), 5000)
    );
    await Promise.race([
      timeSeriesService.initialize(),
      timeoutPromise
    ]);
    logger.info('TimeSeries database initialized successfully');
    tsInitialized = true;
  } catch (error) {
    logger.warn('TimeSeries database initialization failed:', error);
  }

  if (dbInitialized) {
    try {
      await notificationService.startProcessing();
      logger.info('Notification service started');
      notificationsStarted = true;
    } catch (error) {
      logger.warn('Notification service failed to start:', error);
    }

    try {
      schedulerService.start();
      logger.info('Scheduler service started');
      schedulerStarted = true;
    } catch (error) {
      logger.warn('Scheduler service failed to start:', error);
    }
  }

  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    if (!dbInitialized || !tsInitialized) {
      logger.warn('Server running in degraded mode - some features may not work');
    }
  });
}

startServer();

export default app;
