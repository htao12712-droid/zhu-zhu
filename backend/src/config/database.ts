import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';
import { logger } from '../utils/logger';

let pool: Pool | null = null;
let initialized = false;

interface DatabaseConfig {
  connectionString?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  password?: string;
  max?: number;
  idleTimeoutMillis?: number;
  connectionTimeoutMillis?: number;
}

export class Database {
  private static instance: Database;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public async initialize(config?: DatabaseConfig): Promise<void> {
    if (pool) {
      logger.warn('Database already initialized');
      return;
    }

    try {
      const dbConfig: DatabaseConfig = config || {
        connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pigfund',
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'pigfund',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
        max: Number(process.env.DB_POOL_MAX) || 20,
        idleTimeoutMillis: Number(process.env.DB_IDLE_TIMEOUT) || 30000,
        connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT) || 10000
      };

      pool = new Pool({
        connectionString: dbConfig.connectionString,
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
        max: dbConfig.max,
        idleTimeoutMillis: dbConfig.idleTimeoutMillis,
        connectionTimeoutMillis: dbConfig.connectionTimeoutMillis
      });

      await pool.connect();

      logger.info('Database connection established successfully');
      initialized = true;
    } catch (error) {
      logger.error('Failed to initialize database:', error);
      throw error;
    }
  }

  public async query<T extends QueryResultRow = any>(
    text: string,
    params?: any[]
  ): Promise<QueryResult<T>> {
    if (!pool) {
      throw new Error('Database not initialized');
    }

    try {
      return await pool.query(text, params);
    } catch (error) {
      logger.error('Database query error:', { text, error });
      throw error;
    }
  }

  public async getClient(): Promise<PoolClient> {
    if (!pool) {
      throw new Error('Database not initialized');
    }

    return await pool.connect();
  }

  public async transaction<T>(
    callback: (client: PoolClient) => Promise<T>
  ): Promise<T> {
    const client = await this.getClient();

    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  public async healthCheck(): Promise<boolean> {
    if (!pool) {
      return false;
    }

    try {
      const result = await pool.query('SELECT 1 as health_check');
      return result.rows.length > 0;
    } catch (error) {
      logger.error('Database health check failed:', error);
      return false;
    }
  }

  public isInitialized(): boolean {
    return initialized;
  }

  public async close(): Promise<void> {
    if (pool) {
      await pool.end();
      pool = null;
      initialized = false;
      logger.info('Database connection closed');
    }
  }
}

export default Database.getInstance();
