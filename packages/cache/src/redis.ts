import Redis, { Cluster } from 'ioredis';
import { RedisConfig, TTLPolicy, CacheKeyConfig, CacheUtilityOptions, CacheStats } from './types';

// Default TTL policies (in seconds)
export const DEFAULT_TTL_POLICIES: TTLPolicy = {
  session: 24 * 60 * 60, // 24 hours
  viewTracking: 60, // 1 minute
  botAnalysis: 5 * 60, // 5 minutes
  rateLimit: 60 * 60, // 1 hour
  dailyPayout: 24 * 60 * 60, // 24 hours
  default: 60 * 60, // 1 hour
};

// Default cache key configuration
export const DEFAULT_KEY_CONFIG: CacheKeyConfig = {
  prefix: 'creator-platform',
  separator: ':',
};

export class CacheKeyManager {
  private config: CacheKeyConfig;

  constructor(config: CacheKeyConfig = DEFAULT_KEY_CONFIG) {
    this.config = config;
  }

  private buildKey(parts: string[]): string {
    return [this.config.prefix, ...parts].join(this.config.separator);
  }

  // Session keys
  session(sessionId: string): string {
    return this.buildKey(['session', sessionId]);
  }

  // View tracking keys
  viewTracking(promoterId: string, campaignId: string): string {
    return this.buildKey(['tracking', promoterId, campaignId]);
  }

  // Bot analysis keys
  botAnalysis(promoterId: string, campaignId: string): string {
    return this.buildKey(['bot', promoterId, campaignId]);
  }

  // Rate limiting keys
  rateLimit(platform: string, userId: string): string {
    return this.buildKey(['rate', platform, userId]);
  }

  // Daily payout keys
  dailyPayout(date: string): string {
    return this.buildKey(['payout', date]);
  }

  // Generic key builder
  custom(...parts: string[]): string {
    return this.buildKey(parts);
  }
}

export class RedisCache {
  private client: Redis | Cluster;
  private keyManager: CacheKeyManager;
  private ttlPolicies: TTLPolicy;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    keys: 0,
    memory: 0,
  };

  constructor(
    config: RedisConfig,
    keyConfig?: CacheKeyConfig,
    ttlPolicies?: Partial<TTLPolicy>
  ) {
    this.keyManager = new CacheKeyManager(keyConfig);
    this.ttlPolicies = { ...DEFAULT_TTL_POLICIES, ...ttlPolicies };
    this.client = this.createClient(config);
    this.setupEventHandlers();
  }

  private createClient(config: RedisConfig): Redis | Cluster {
    if (config.url) {
      // Single Redis instance with URL
      return new Redis(config.url, {
        keyPrefix: config.keyPrefix,
        enableReadyCheck: config.enableReadyCheck !== false,
        maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
        lazyConnect: config.lazyConnect || true,
      });
    }

    if (config.cluster) {
      // Redis Cluster
      const clusterNodes = [
        {
          host: config.host || 'localhost',
          port: config.port || 6379,
        },
      ];

      return new Redis.Cluster(clusterNodes, {
        enableOfflineQueue: config.cluster.enableOfflineQueue !== false,
        redisOptions: {
          password: config.password,
          ...config.cluster.redisOptions,
        },
        slotsRefreshTimeout: config.cluster.slotsRefreshTimeout || 10000,
        slotsRefreshInterval: config.cluster.slotsRefreshInterval || 5000,
      });
    }

    // Single Redis instance
    return new Redis({
      host: config.host || 'localhost',
      port: config.port || 6379,
      password: config.password,
      db: config.db || 0,
      keyPrefix: config.keyPrefix,
      enableReadyCheck: config.enableReadyCheck !== false,
      maxRetriesPerRequest: config.maxRetriesPerRequest || 3,
      lazyConnect: config.lazyConnect || true,
    });
  }

  private setupEventHandlers(): void {
    this.client.on('connect', () => {
      console.log('Redis cache connected');
    });

    this.client.on('error', (error) => {
      console.error('Redis cache error:', error);
    });

    this.client.on('close', () => {
      console.log('Redis cache connection closed');
    });

    this.client.on('reconnecting', () => {
      console.log('Redis cache reconnecting...');
    });
  }

  async connect(): Promise<void> {
    if (this.client.status !== 'ready') {
      await this.client.connect();
    }
  }

  async disconnect(): Promise<void> {
    await this.client.disconnect();
  }

  // Basic cache operations
  async get<T = any>(key: string, options?: CacheUtilityOptions): Promise<T | null> {
    try {
      const value = await this.client.get(key);
      if (value === null) {
        this.stats.misses++;
        return null;
      }

      this.stats.hits++;
      
      if (options?.serialize !== false) {
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      }
      
      return value as T;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  async set<T = any>(
    key: string, 
    value: T, 
    options?: CacheUtilityOptions
  ): Promise<void> {
    try {
      const serializedValue = options?.serialize !== false 
        ? JSON.stringify(value) 
        : String(value);

      const ttl = options?.ttl || this.ttlPolicies.default;
      
      await this.client.setex(key, ttl, serializedValue);
      this.stats.keys++;
    } catch (error) {
      console.error('Cache set error:', error);
      throw error;
    }
  }

  async del(key: string): Promise<number> {
    try {
      const result = await this.client.del(key);
      if (result > 0) {
        this.stats.keys = Math.max(0, this.stats.keys - result);
      }
      return result;
    } catch (error) {
      console.error('Cache delete error:', error);
      return 0;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error('Cache expire error:', error);
      return false;
    }
  }

  async ttl(key: string): Promise<number> {
    try {
      return await this.client.ttl(key);
    } catch (error) {
      console.error('Cache TTL error:', error);
      return -1;
    }
  }

  // Specialized cache utilities
  async getSession<T = any>(sessionId: string): Promise<T | null> {
    const key = this.keyManager.session(sessionId);
    return this.get<T>(key);
  }

  async setSession<T = any>(sessionId: string, data: T): Promise<void> {
    const key = this.keyManager.session(sessionId);
    await this.set(key, data, { ttl: this.ttlPolicies.session });
  }

  async deleteSession(sessionId: string): Promise<number> {
    const key = this.keyManager.session(sessionId);
    return this.del(key);
  }

  async getViewTracking<T = any>(promoterId: string, campaignId: string): Promise<T | null> {
    const key = this.keyManager.viewTracking(promoterId, campaignId);
    return this.get<T>(key);
  }

  async setViewTracking<T = any>(
    promoterId: string, 
    campaignId: string, 
    data: T
  ): Promise<void> {
    const key = this.keyManager.viewTracking(promoterId, campaignId);
    await this.set(key, data, { ttl: this.ttlPolicies.viewTracking });
  }

  async getBotAnalysis<T = any>(promoterId: string, campaignId: string): Promise<T | null> {
    const key = this.keyManager.botAnalysis(promoterId, campaignId);
    return this.get<T>(key);
  }

  async setBotAnalysis<T = any>(
    promoterId: string, 
    campaignId: string, 
    data: T
  ): Promise<void> {
    const key = this.keyManager.botAnalysis(promoterId, campaignId);
    await this.set(key, data, { ttl: this.ttlPolicies.botAnalysis });
  }

  async getRateLimit(platform: string, userId: string): Promise<number> {
    const key = this.keyManager.rateLimit(platform, userId);
    const count = await this.get<string>(key, { serialize: false });
    return count ? parseInt(count, 10) : 0;
  }

  async incrementRateLimit(platform: string, userId: string): Promise<number> {
    const key = this.keyManager.rateLimit(platform, userId);
    try {
      const result = await this.client.incr(key);
      if (result === 1) {
        // Set TTL only on first increment
        await this.client.expire(key, this.ttlPolicies.rateLimit);
      }
      return result;
    } catch (error) {
      console.error('Rate limit increment error:', error);
      return 0;
    }
  }

  async getDailyPayout<T = any>(date: string): Promise<T | null> {
    const key = this.keyManager.dailyPayout(date);
    return this.get<T>(key);
  }

  async setDailyPayout<T = any>(date: string, data: T): Promise<void> {
    const key = this.keyManager.dailyPayout(date);
    await this.set(key, data, { ttl: this.ttlPolicies.dailyPayout });
  }

  // Batch operations
  async mget<T = any>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.client.mget(...keys);
      return values.map(value => {
        if (value === null) {
          this.stats.misses++;
          return null;
        }
        this.stats.hits++;
        try {
          return JSON.parse(value);
        } catch {
          return value as T;
        }
      });
    } catch (error) {
      console.error('Cache mget error:', error);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs: Record<string, any>, ttl?: number): Promise<void> {
    try {
      const pipeline = this.client.pipeline();
      
      Object.entries(keyValuePairs).forEach(([key, value]) => {
        const serializedValue = JSON.stringify(value);
        if (ttl) {
          pipeline.setex(key, ttl, serializedValue);
        } else {
          pipeline.set(key, serializedValue);
        }
      });

      await pipeline.exec();
      this.stats.keys += Object.keys(keyValuePairs).length;
    } catch (error) {
      console.error('Cache mset error:', error);
      throw error;
    }
  }

  // Pattern-based operations
  async keys(pattern: string): Promise<string[]> {
    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Cache keys error:', error);
      return [];
    }
  }

  async deletePattern(pattern: string): Promise<number> {
    try {
      const keys = await this.keys(pattern);
      if (keys.length === 0) return 0;
      
      const result = await this.client.del(...keys);
      this.stats.keys = Math.max(0, this.stats.keys - result);
      return result;
    } catch (error) {
      console.error('Cache delete pattern error:', error);
      return 0;
    }
  }

  // Cache statistics and monitoring
  async getStats(): Promise<CacheStats> {
    try {
      const info = await this.client.info('memory');
      const memoryMatch = info.match(/used_memory:(\d+)/);
      const memory = memoryMatch ? parseInt(memoryMatch[1], 10) : 0;

      return {
        ...this.stats,
        memory,
      };
    } catch (error) {
      console.error('Cache stats error:', error);
      return this.stats;
    }
  }

  async flushAll(): Promise<void> {
    try {
      await this.client.flushall();
      this.stats = { hits: 0, misses: 0, keys: 0, memory: 0 };
    } catch (error) {
      console.error('Cache flush error:', error);
      throw error;
    }
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Cache ping error:', error);
      return false;
    }
  }

  // Get key manager for custom key operations
  getKeyManager(): CacheKeyManager {
    return this.keyManager;
  }

  // Get TTL policies
  getTTLPolicies(): TTLPolicy {
    return { ...this.ttlPolicies };
  }
}