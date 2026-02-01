import redis from '../config/redis';
import { logger } from '../utils/logger';

let cacheEnabled = true;

export class CacheService {
  private defaultTTL: number = 3600;

  private isReady(): boolean {
    return cacheEnabled && (redis as any)?.isReady === true;
  }

  async get<T = any>(key: string): Promise<T | null> {
    if (!this.isReady()) return null;
    
    try {
      const value = await redis.get(key);
      if (value === null) {
        return null;
      }
      return JSON.parse(value);
    } catch (error) {
      logger.warn('Cache get error, disabling cache:', { key, error });
      cacheEnabled = false;
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!this.isReady()) return;
    
    try {
      const serializedValue = JSON.stringify(value);
      const expireTime = ttl !== undefined ? ttl : this.defaultTTL;

      if (expireTime > 0) {
        await redis.setEx(key, expireTime, serializedValue);
      } else {
        await redis.set(key, serializedValue);
      }
    } catch (error) {
      logger.warn('Cache set error, disabling cache:', { key, error });
      cacheEnabled = false;
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isReady()) return;
    
    try {
      await redis.del(key);
    } catch (error) {
      logger.warn('Cache delete error, disabling cache:', { key, error });
      cacheEnabled = false;
    }
  }

  async delPattern(pattern: string): Promise<number> {
    if (!this.isReady()) return 0;
    
    try {
      const keys = await redis.keys(pattern);
      if (keys.length === 0) {
        return 0;
      }
      return await redis.del(keys);
    } catch (error) {
      logger.warn('Cache delete pattern error, disabling cache:', { pattern, error });
      cacheEnabled = false;
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    if (!this.isReady()) return false;
    
    try {
      const result = await redis.exists(key);
      return result === 1;
    } catch (error) {
      logger.warn('Cache exists error, disabling cache:', { key, error });
      cacheEnabled = false;
      return false;
    }
  }

  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    if (!this.isReady()) return keys.map(() => null);
    
    try {
      const values = await redis.mGet(keys);
      return values.map(value => {
        if (value === null) return null;
        try {
          return JSON.parse(value);
        } catch {
          return null;
        }
      });
    } catch (error) {
      logger.warn('Cache mget error, disabling cache:', { keys, error });
      cacheEnabled = false;
      return keys.map(() => null);
    }
  }

  async mset(keyValues: Record<string, any>, ttl?: number): Promise<void> {
    if (!this.isReady()) return;
    
    try {
      const pipeline = redis.multi();
      for (const [key, value] of Object.entries(keyValues)) {
        const serializedValue = JSON.stringify(value);
        const expireTime = ttl !== undefined ? ttl : this.defaultTTL;
        if (expireTime > 0) {
          pipeline.setEx(key, expireTime, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      }
      await pipeline.exec();
    } catch (error) {
      logger.warn('Cache mset error, disabling cache:', { keys: Object.keys(keyValues), error });
      cacheEnabled = false;
    }
  }

  async incr(key: string, ttl?: number): Promise<number> {
    if (!this.isReady()) return 0;
    
    try {
      const result = await redis.incr(key);
      if (ttl !== undefined && ttl > 0 && result === 1) {
        await redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      logger.warn('Cache incr error, disabling cache:', { key, error });
      cacheEnabled = false;
      return 0;
    }
  }

  async decr(key: string): Promise<number> {
    if (!this.isReady()) return 0;
    
    try {
      return await redis.decr(key);
    } catch (error) {
      logger.warn('Cache decr error, disabling cache:', { key, error });
      cacheEnabled = false;
      return 0;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.isReady()) return false;
    
    try {
      const result = await redis.expire(key, ttl);
      return result;
    } catch (error) {
      logger.warn('Cache expire error, disabling cache:', { key, ttl, error });
      cacheEnabled = false;
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    if (!this.isReady()) return -1;
    
    try {
      return await redis.ttl(key);
    } catch (error) {
      logger.warn('Cache ttl error, disabling cache:', { key, error });
      cacheEnabled = false;
      return -1;
    }
  }

  async flushPattern(pattern: string): Promise<void> {
    if (!this.isReady()) return;
    
    try {
      const keys = await redis.keys(pattern);
      if (keys.length > 0) {
        await redis.del(keys);
        logger.info(`Cache flushed ${keys.length} keys matching pattern: ${pattern}`);
      }
    } catch (error) {
      logger.warn('Cache flush pattern error, disabling cache:', { pattern, error });
      cacheEnabled = false;
    }
  }

  async getStats(): Promise<any> {
    if (!this.isReady()) return null;
    
    try {
      const info = await redis.info('stats');
      const keyspace = await redis.info('keyspace');

      return {
        ...this.parseRedisInfo(info),
        ...this.parseRedisInfo(keyspace)
      };
    } catch (error) {
      logger.warn('Cache get stats error, disabling cache:', error);
      cacheEnabled = false;
      return null;
    }
  }

  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await redis.ping();
      return true;
    } catch (error) {
      logger.warn('Cache health check failed:', error);
      cacheEnabled = false;
      return false;
    }
  }
}

export default new CacheService();
