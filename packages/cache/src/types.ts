// Cache type definitions
export interface CacheEntry<T = any> {
  value: T;
  ttl: number;
  createdAt: Date;
}

export interface CacheStats {
  hits: number;
  misses: number;
  keys: number;
  memory: number;
}

export interface RedisConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  retryDelayOnFailover?: number;
  enableReadyCheck?: boolean;
  maxRetriesPerRequest?: number;
  lazyConnect?: boolean;
  // Clustering support
  cluster?: {
    enableOfflineQueue?: boolean;
    redisOptions?: {
      password?: string;
    };
    slotsRefreshTimeout?: number;
    slotsRefreshInterval?: number;
  };
  // Connection URL (alternative to individual options)
  url?: string;
}

export interface TTLPolicy {
  session: number; // 24 hours
  viewTracking: number; // 1 minute
  botAnalysis: number; // 5 minutes
  rateLimit: number; // 1 hour
  dailyPayout: number; // 24 hours
  default: number; // 1 hour
}

export interface CacheKeyConfig {
  prefix: string;
  separator: string;
}

export interface CacheUtilityOptions {
  ttl?: number;
  serialize?: boolean;
}

export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  interval: number;
}
