import Database from 'better-sqlite3';
import path from 'path';
import { logger } from '../utils/logger';

class SQLiteDB {
  private db: Database.Database | null = null;
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) {
      logger.warn('SQLite already initialized');
      return;
    }

    try {
      const dbPath = path.join(__dirname, '../../data/pigfund.db');
      this.db = new Database(dbPath);
      
      // Enable WAL mode for better concurrency
      this.db.pragma('journal_mode = WAL');
      
      logger.info('SQLite database connection established');
      this.initialized = true;
      
      // Create tables if they don't exist
      await this.createTables();
    } catch (error) {
      logger.error('Failed to initialize SQLite database:', error);
      throw error;
    }
  }

  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    // Create funds table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS funds (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fund_code TEXT UNIQUE NOT NULL,
        fund_name TEXT NOT NULL,
        fund_type TEXT,
        fund_company TEXT,
        established_date TEXT,
        fund_size REAL,
        manager_id INTEGER,
        benchmark_index TEXT,
        status TEXT DEFAULT '正常',
        created_at TEXT DEFAULT datetime('now'),
        updated_at TEXT DEFAULT datetime('now')
      )
    `);

    // Create user_holdings table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS user_holdings (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        fund_id INTEGER NOT NULL,
        holding_shares REAL NOT NULL DEFAULT 0,
        cost_price REAL NOT NULL DEFAULT 0,
        cost_amount REAL NOT NULL DEFAULT 0,
        source TEXT DEFAULT '手动',
        sync_platform TEXT,
        created_at TEXT DEFAULT datetime('now'),
        updated_at TEXT DEFAULT datetime('now'),
        UNIQUE(user_id, fund_id)
      )
    `);

    // Create fund_nav_history table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS fund_nav_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fund_id INTEGER NOT NULL,
        nav_date TEXT NOT NULL,
        unit_nav REAL NOT NULL,
        accumulated_nav REAL,
        daily_return REAL,
        UNIQUE(fund_id, nav_date)
      )
    `);

    // Create users table
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        nickname TEXT,
        email TEXT,
        member_level INTEGER DEFAULT 1,
        member_expires_at TEXT,
        created_at TEXT DEFAULT datetime('now'),
        updated_at TEXT DEFAULT datetime('now')
      )
    `);

    logger.info('SQLite tables created successfully');
  }

  async query<T = any>(text: string, params?: any[]): Promise<{ rows: T[] }> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      // Convert PostgreSQL syntax to SQLite
      const sqliteText = this.convertToSQLite(text);
      const stmt = this.db.prepare(sqliteText);
      
      // Check if this is a SELECT query or INSERT/UPDATE/DELETE
      const isSelectQuery = /^\s*SELECT/i.test(sqliteText);
      
      if (isSelectQuery) {
        // SELECT queries return data
        const rows = stmt.all(params || []) as T[];
        return { rows };
      } else {
        // INSERT/UPDATE/DELETE use run()
        const result = stmt.run(params || []);
        // Return empty rows array for non-SELECT queries
        return { rows: [] };
      }
    } catch (error) {
      logger.error('SQLite query error:', { text, error });
      throw error;
    }
  }

  async getClient(): Promise<any> {
    return this;
  }

  async transaction<T>(callback: (client: any) => Promise<T>): Promise<T> {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    try {
      this.db.exec('BEGIN');
      const result = await callback(this);
      this.db.exec('COMMIT');
      return result;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private convertToSQLite(pgQuery: string): string {
    let query = pgQuery;
    
    // Replace PostgreSQL specific syntax with SQLite
    query = query.replace(/\$1/g, '?');
    query = query.replace(/\$2/g, '?');
    query = query.replace(/\$3/g, '?');
    query = query.replace(/\$4/g, '?');
    query = query.replace(/\$5/g, '?');
    query = query.replace(/\$6/g, '?');
    query = query.replace(/\$7/g, '?');
    query = query.replace(/\$8/g, '?');
    query = query.replace(/\$9/g, '?');
    query = query.replace(/\$(\d+)/g, '?');
    query = query.replace(/CURRENT_TIMESTAMP/g, "datetime('now')");
    query = query.replace(/INTERVAL '1 day'/g, "'1 day'");
    
    // Handle INSERT ... RETURNING * -> just remove RETURNING *
    query = query.replace(/RETURNING\s+\*/gi, '');
    
    // Handle ON CONFLICT ... DO UPDATE ... RETURNING * -> INSERT OR REPLACE ...
    query = query.replace(/INSERT\s+INTO\s+(\w+)\s+\(([^)]+)\)\s+VALUES\s+\(([^)]+)\)\s+ON\s+CONFLICT\s*\([^)]+\)\s+DO\s+UPDATE\s+[^;]+RETURNING\s+\*/gi, 
      (match, table, cols, vals) => `INSERT OR REPLACE INTO ${table} (${cols}) VALUES (${vals})`);
    
    return query;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async healthCheck(): Promise<boolean> {
    if (!this.db) return false;
    try {
      this.db.prepare('SELECT 1').get();
      return true;
    } catch {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initialized = false;
      logger.info('SQLite database connection closed');
    }
  }
}

export default new SQLiteDB();
