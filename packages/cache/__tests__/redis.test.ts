import {
  RedisCache,
  CacheKeyManager,
  DEFAULT_TTL_POLICIES,
  DEFAULT_KEY_CONFIG,
} from '../src/redis';
import { RedisConfig } from '../src/types';

// Mock ioredis
jest.mock('ioredis', () => {
  const mockRedis = {
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    setex: jest.fn().mockResolvedValue('OK'),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    ttl: jest.fn(),
    incr: jest.fn(),
    mget: jest.fn(),
    keys: jest.fn(),
    info: jest.fn(),
    flushall: jest.fn().mockResolvedValue('OK'),
    ping: jest.fn().mockResolvedValue('PONG'),
    pipeline: jest.fn(() => ({
      setex: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([]),
    })),
    on: jest.fn(),
    status: 'ready',
  };

  const MockRedisClass = jest.fn(() => mockRedis);
  MockRedisClass.Cluster = jest.fn(() => mockRedis);

  return {
    __esModule: true,
    default: MockRedisClass,
  };
});

describe('CacheKeyManager', () => {
  let keyManager: CacheKeyManager;

  beforeEach(() => {
    keyManager = new CacheKeyManager();
  });

  test('should generate session keys correctly', () => {
    const sessionId = 'test-session-123';
    const key = keyManager.session(sessionId);
    expect(key).toBe('creator-platform:session:test-session-123');
  });

  test('should generate view tracking keys correctly', () => {
    const promoterId = 'promoter-123';
    const campaignId = 'campaign-456';
    const key = keyManager.viewTracking(promoterId, campaignId);
    expect(key).toBe('creator-platform:tracking:promoter-123:campaign-456');
  });

  test('should generate bot analysis keys correctly', () => {
    const promoterId = 'promoter-123';
    const campaignId = 'campaign-456';
    const key = keyManager.botAnalysis(promoterId, campaignId);
    expect(key).toBe('creator-platform:bot:promoter-123:campaign-456');
  });

  test('should generate rate limit keys correctly', () => {
    const platform = 'tiktok';
    const userId = 'user-123';
    const key = keyManager.rateLimit(platform, userId);
    expect(key).toBe('creator-platform:rate:tiktok:user-123');
  });

  test('should generate daily payout keys correctly', () => {
    const date = '2024-01-15';
    const key = keyManager.dailyPayout(date);
    expect(key).toBe('creator-platform:payout:2024-01-15');
  });

  test('should generate custom keys correctly', () => {
    const key = keyManager.custom('custom', 'test', 'key');
    expect(key).toBe('creator-platform:custom:test:key');
  });

  test('should use custom configuration', () => {
    const customConfig = { prefix: 'test-app', separator: '-' };
    const customKeyManager = new CacheKeyManager(customConfig);
    const key = customKeyManager.session('test');
    expect(key).toBe('test-app-session-test');
  });
});

describe('RedisCache', () => {
  let cache: RedisCache;
  let mockClient: any;

  beforeEach(() => {
    const config: RedisConfig = {
      host: 'localhost',
      port: 6379,
    };
    cache = new RedisCache(config);
    mockClient = (cache as any).client;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Management', () => {
    test('should connect to Redis', async () => {
      mockClient.status = 'connecting';
      await cache.connect();
      expect(mockClient.connect).toHaveBeenCalled();
    });

    test('should not connect if already ready', async () => {
      mockClient.status = 'ready';
      await cache.connect();
      expect(mockClient.connect).not.toHaveBeenCalled();
    });

    test('should disconnect from Redis', async () => {
      await cache.disconnect();
      expect(mockClient.disconnect).toHaveBeenCalled();
    });

    test('should ping Redis successfully', async () => {
      const result = await cache.ping();
      expect(result).toBe(true);
      expect(mockClient.ping).toHaveBeenCalled();
    });
  });

  describe('Basic Cache Operations', () => {
    test('should get value from cache', async () => {
      const testValue = { test: 'data' };
      mockClient.get.mockResolvedValue(JSON.stringify(testValue));

      const result = await cache.get('test-key');
      expect(result).toEqual(testValue);
      expect(mockClient.get).toHaveBeenCalledWith('test-key');
    });

    test('should return null for non-existent key', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await cache.get('non-existent');
      expect(result).toBeNull();
    });

    test('should set value in cache with TTL', async () => {
      const testValue = { test: 'data' };
      const ttl = 300;

      await cache.set('test-key', testValue, { ttl });
      expect(mockClient.setex).toHaveBeenCalledWith(
        'test-key',
        ttl,
        JSON.stringify(testValue)
      );
    });

    test('should set value with default TTL', async () => {
      const testValue = { test: 'data' };

      await cache.set('test-key', testValue);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'test-key',
        DEFAULT_TTL_POLICIES.default,
        JSON.stringify(testValue)
      );
    });

    test('should delete key from cache', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await cache.del('test-key');
      expect(result).toBe(1);
      expect(mockClient.del).toHaveBeenCalledWith('test-key');
    });

    test('should check if key exists', async () => {
      mockClient.exists.mockResolvedValue(1);

      const result = await cache.exists('test-key');
      expect(result).toBe(true);
      expect(mockClient.exists).toHaveBeenCalledWith('test-key');
    });

    test('should set expiration for key', async () => {
      mockClient.expire.mockResolvedValue(1);

      const result = await cache.expire('test-key', 300);
      expect(result).toBe(true);
      expect(mockClient.expire).toHaveBeenCalledWith('test-key', 300);
    });

    test('should get TTL for key', async () => {
      mockClient.ttl.mockResolvedValue(300);

      const result = await cache.ttl('test-key');
      expect(result).toBe(300);
      expect(mockClient.ttl).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Session Management', () => {
    test('should get session data', async () => {
      const sessionData = { userId: '123', role: 'creator' };
      mockClient.get.mockResolvedValue(JSON.stringify(sessionData));

      const result = await cache.getSession('session-123');
      expect(result).toEqual(sessionData);
    });

    test('should set session data with correct TTL', async () => {
      const sessionData = { userId: '123', role: 'creator' };

      await cache.setSession('session-123', sessionData);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'creator-platform:session:session-123',
        DEFAULT_TTL_POLICIES.session,
        JSON.stringify(sessionData)
      );
    });

    test('should delete session', async () => {
      mockClient.del.mockResolvedValue(1);

      const result = await cache.deleteSession('session-123');
      expect(result).toBe(1);
      expect(mockClient.del).toHaveBeenCalledWith(
        'creator-platform:session:session-123'
      );
    });
  });

  describe('View Tracking', () => {
    test('should get view tracking data', async () => {
      const trackingData = { views: 100, likes: 10 };
      mockClient.get.mockResolvedValue(JSON.stringify(trackingData));

      const result = await cache.getViewTracking(
        'promoter-123',
        'campaign-456'
      );
      expect(result).toEqual(trackingData);
    });

    test('should set view tracking data with correct TTL', async () => {
      const trackingData = { views: 100, likes: 10 };

      await cache.setViewTracking('promoter-123', 'campaign-456', trackingData);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'creator-platform:tracking:promoter-123:campaign-456',
        DEFAULT_TTL_POLICIES.viewTracking,
        JSON.stringify(trackingData)
      );
    });
  });

  describe('Bot Analysis', () => {
    test('should get bot analysis data', async () => {
      const botData = { score: 25, action: 'monitor' };
      mockClient.get.mockResolvedValue(JSON.stringify(botData));

      const result = await cache.getBotAnalysis('promoter-123', 'campaign-456');
      expect(result).toEqual(botData);
    });

    test('should set bot analysis data with correct TTL', async () => {
      const botData = { score: 25, action: 'monitor' };

      await cache.setBotAnalysis('promoter-123', 'campaign-456', botData);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'creator-platform:bot:promoter-123:campaign-456',
        DEFAULT_TTL_POLICIES.botAnalysis,
        JSON.stringify(botData)
      );
    });
  });

  describe('Rate Limiting', () => {
    test('should get rate limit count', async () => {
      mockClient.get.mockResolvedValue('5');

      const result = await cache.getRateLimit('tiktok', 'user-123');
      expect(result).toBe(5);
    });

    test('should return 0 for non-existent rate limit', async () => {
      mockClient.get.mockResolvedValue(null);

      const result = await cache.getRateLimit('tiktok', 'user-123');
      expect(result).toBe(0);
    });

    test('should increment rate limit and set TTL on first increment', async () => {
      mockClient.incr.mockResolvedValue(1);

      const result = await cache.incrementRateLimit('tiktok', 'user-123');
      expect(result).toBe(1);
      expect(mockClient.incr).toHaveBeenCalledWith(
        'creator-platform:rate:tiktok:user-123'
      );
      expect(mockClient.expire).toHaveBeenCalledWith(
        'creator-platform:rate:tiktok:user-123',
        DEFAULT_TTL_POLICIES.rateLimit
      );
    });

    test('should increment rate limit without setting TTL on subsequent increments', async () => {
      mockClient.incr.mockResolvedValue(2);

      const result = await cache.incrementRateLimit('tiktok', 'user-123');
      expect(result).toBe(2);
      expect(mockClient.expire).not.toHaveBeenCalled();
    });
  });

  describe('Daily Payout', () => {
    test('should get daily payout data', async () => {
      const payoutData = { totalAmount: 1000, processed: true };
      mockClient.get.mockResolvedValue(JSON.stringify(payoutData));

      const result = await cache.getDailyPayout('2024-01-15');
      expect(result).toEqual(payoutData);
    });

    test('should set daily payout data with correct TTL', async () => {
      const payoutData = { totalAmount: 1000, processed: true };

      await cache.setDailyPayout('2024-01-15', payoutData);
      expect(mockClient.setex).toHaveBeenCalledWith(
        'creator-platform:payout:2024-01-15',
        DEFAULT_TTL_POLICIES.dailyPayout,
        JSON.stringify(payoutData)
      );
    });
  });

  describe('Batch Operations', () => {
    test('should get multiple values', async () => {
      const values = ['{"test1": "data1"}', '{"test2": "data2"}', null];
      mockClient.mget.mockResolvedValue(values);

      const result = await cache.mget(['key1', 'key2', 'key3']);
      expect(result).toEqual([{ test1: 'data1' }, { test2: 'data2' }, null]);
    });

    test('should set multiple values', async () => {
      const keyValuePairs = {
        key1: { test1: 'data1' },
        key2: { test2: 'data2' },
      };
      const mockPipeline = {
        setex: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        exec: jest.fn().mockResolvedValue([]),
      };
      mockClient.pipeline.mockReturnValue(mockPipeline);

      await cache.mset(keyValuePairs, 300);
      expect(mockPipeline.setex).toHaveBeenCalledTimes(2);
      expect(mockPipeline.exec).toHaveBeenCalled();
    });
  });

  describe('Pattern Operations', () => {
    test('should get keys by pattern', async () => {
      const keys = ['key1', 'key2', 'key3'];
      mockClient.keys.mockResolvedValue(keys);

      const result = await cache.keys('test:*');
      expect(result).toEqual(keys);
      expect(mockClient.keys).toHaveBeenCalledWith('test:*');
    });

    test('should delete keys by pattern', async () => {
      const keys = ['key1', 'key2'];
      mockClient.keys.mockResolvedValue(keys);
      mockClient.del.mockResolvedValue(2);

      const result = await cache.deletePattern('test:*');
      expect(result).toBe(2);
      expect(mockClient.keys).toHaveBeenCalledWith('test:*');
      expect(mockClient.del).toHaveBeenCalledWith('key1', 'key2');
    });
  });

  describe('Statistics and Monitoring', () => {
    test('should get cache statistics', async () => {
      mockClient.info.mockResolvedValue(
        'used_memory:1048576\nother_info:value'
      );

      const stats = await cache.getStats();
      expect(stats.memory).toBe(1048576);
      expect(typeof stats.hits).toBe('number');
      expect(typeof stats.misses).toBe('number');
    });

    test('should flush all cache', async () => {
      await cache.flushAll();
      expect(mockClient.flushall).toHaveBeenCalled();
    });
  });

  describe('Configuration', () => {
    test('should create cache with URL configuration', () => {
      const config: RedisConfig = {
        url: 'redis://localhost:6379',
      };
      const urlCache = new RedisCache(config);
      expect(urlCache).toBeInstanceOf(RedisCache);
    });

    test('should create cache with cluster configuration', () => {
      const config: RedisConfig = {
        host: 'localhost',
        port: 6379,
        cluster: {
          enableOfflineQueue: true,
          redisOptions: {
            password: 'test-password',
          },
        },
      };
      const clusterCache = new RedisCache(config);
      expect(clusterCache).toBeInstanceOf(RedisCache);
    });

    test('should get key manager', () => {
      const keyManager = cache.getKeyManager();
      expect(keyManager).toBeInstanceOf(CacheKeyManager);
    });

    test('should get TTL policies', () => {
      const policies = cache.getTTLPolicies();
      expect(policies).toEqual(DEFAULT_TTL_POLICIES);
    });
  });

  describe('Error Handling', () => {
    test('should handle get errors gracefully', async () => {
      mockClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await cache.get('test-key');
      expect(result).toBeNull();
    });

    test('should handle set errors by throwing', async () => {
      mockClient.setex.mockRejectedValue(new Error('Redis error'));

      await expect(cache.set('test-key', 'value')).rejects.toThrow(
        'Redis error'
      );
    });

    test('should handle delete errors gracefully', async () => {
      mockClient.del.mockRejectedValue(new Error('Redis error'));

      const result = await cache.del('test-key');
      expect(result).toBe(0);
    });

    test('should handle ping errors gracefully', async () => {
      mockClient.ping.mockRejectedValue(new Error('Redis error'));

      const result = await cache.ping();
      expect(result).toBe(false);
    });
  });
});
