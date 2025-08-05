import { RedisConfig, TTLPolicy, CacheKeyConfig } from './types';

// Environment-based Redis configuration
export function createRedisConfig(): RedisConfig {
  const redisUrl = process.env.REDIS_URL;
  const redisHost = process.env.REDIS_HOST || 'localhost';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;
  const redisDb = parseInt(process.env.REDIS_DB || '0', 10);
  const enableCluster = process.env.REDIS_CLUSTER_ENABLED === 'true';

  if (redisUrl) {
    return {
      url: redisUrl,
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'creator-platform:',
      lazyConnect: true,
    };
  }

  const baseConfig: RedisConfig = {
    host: redisHost,
    port: redisPort,
    password: redisPassword,
    db: redisDb,
    keyPrefix: process.env.REDIS_KEY_PREFIX || 'creator-platform:',
    retryDelayOnFailover: 100,
    enableReadyCheck: true,
    maxRetriesPerRequest: 3,
    lazyConnect: true,
  };

  if (enableCluster) {
    baseConfig.cluster = {
      enableOfflineQueue: true,
      redisOptions: {
        password: redisPassword,
      },
      slotsRefreshTimeout: 10000,
      slotsRefreshInterval: 5000,
    };
  }

  return baseConfig;
}

// Environment-based TTL configuration
export function createTTLPolicies(): TTLPolicy {
  return {
    session: parseInt(process.env.CACHE_TTL_SESSION || '86400', 10), // 24 hours
    viewTracking: parseInt(process.env.CACHE_TTL_VIEW_TRACKING || '60', 10), // 1 minute
    botAnalysis: parseInt(process.env.CACHE_TTL_BOT_ANALYSIS || '300', 10), // 5 minutes
    rateLimit: parseInt(process.env.CACHE_TTL_RATE_LIMIT || '3600', 10), // 1 hour
    dailyPayout: parseInt(process.env.CACHE_TTL_DAILY_PAYOUT || '86400', 10), // 24 hours
    default: parseInt(process.env.CACHE_TTL_DEFAULT || '3600', 10), // 1 hour
  };
}

// Environment-based key configuration
export function createKeyConfig(): CacheKeyConfig {
  return {
    prefix: process.env.CACHE_KEY_PREFIX || 'creator-platform',
    separator: process.env.CACHE_KEY_SEPARATOR || ':',
  };
}

// Factory function to create a configured cache instance
export function createCache() {
  const redisConfig = createRedisConfig();
  const keyConfig = createKeyConfig();
  const ttlPolicies = createTTLPolicies();

  // Import here to avoid circular dependency
  const { RedisCache } = require('./redis');
  return new RedisCache(redisConfig, keyConfig, ttlPolicies);
}

// Health check configuration
export interface HealthCheckConfig {
  timeout: number;
  retries: number;
  interval: number;
}

export function createHealthCheckConfig(): HealthCheckConfig {
  return {
    timeout: parseInt(process.env.CACHE_HEALTH_TIMEOUT || '5000', 10), // 5 seconds
    retries: parseInt(process.env.CACHE_HEALTH_RETRIES || '3', 10),
    interval: parseInt(process.env.CACHE_HEALTH_INTERVAL || '30000', 10), // 30 seconds
  };
}
