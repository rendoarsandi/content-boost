import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from '@repo/utils/social-media-api';
import { SocialTokenManager } from '@repo/utils/social-token-manager';
import {
  MetricsCollector,
  createMetricsCollector,
  DEFAULT_VALIDATION_RULES,
  DEFAULT_CONFIG,
} from '@repo/utils/metrics-collector';

// Mock dependencies
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  keys: jest.fn(),
  getKeyManager: jest.fn(() => ({
    custom: jest.fn((...parts: string[]) => parts.join(':')),
  })),
  client: {
    lpush: jest.fn(),
    rpop: jest.fn(),
    llen: jest.fn(),
  },
} as unknown as RedisCache;

const mockAPIManager = {
  getMetrics: jest.fn(),
} as unknown as SocialMediaAPIManager;

const mockTokenManager = {
  getValidToken: jest.fn(),
} as unknown as SocialTokenManager;

describe('MetricsCollector', () => {
  let metricsCollector: MetricsCollector;

  beforeEach(() => {
    jest.clearAllMocks();
    metricsCollector = createMetricsCollector(
      mockCache,
      mockAPIManager,
      mockTokenManager
    );
  });

  describe('addJob', () => {
    it('should add a new metrics collection job', async () => {
      const job = {
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok' as const,
        postId: 'video789',
        maxRetries: 3,
      };

      const jobId = await metricsCollector.addJob(job);

      expect(jobId).toMatch(/^job_\d+_[a-z0-9]+$/);
      expect(mockCache.set).toHaveBeenCalledWith(
        `metrics-job:${jobId}`,
        expect.objectContaining({
          ...job,
          id: jobId,
          status: 'pending',
          retryCount: 0,
        }),
        { ttl: DEFAULT_CONFIG.cacheSettings.jobQueueTTL }
      );
      expect(mockCache['client'].lpush).toHaveBeenCalledWith(
        'metrics-queue:pending',
        jobId
      );
    });
  });

  describe('start and stop', () => {
    it('should start the metrics collector', async () => {
      // Mock empty pending jobs
      (mockCache['client'].rpop as jest.Mock).mockResolvedValue(null);

      await metricsCollector.start();
      expect(metricsCollector.isHealthy()).toBe(true);

      await metricsCollector.stop();
      expect(metricsCollector.isHealthy()).toBe(false);
    });

    it('should not start if already running', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await metricsCollector.start();
      await metricsCollector.start(); // Second start should warn

      expect(consoleSpy).toHaveBeenCalledWith(
        'Metrics collector is already running'
      );

      await metricsCollector.stop();
      consoleSpy.mockRestore();
    });
  });

  describe('job processing', () => {
    it('should process a job successfully', async () => {
      const job = {
        id: 'job123',
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok' as const,
        postId: 'video789',
        status: 'pending' as const,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      const mockToken = {
        accessToken: 'valid_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 3600000),
        platform: 'tiktok' as const,
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      const mockMetrics = {
        viewCount: 1000,
        likeCount: 100,
        commentCount: 10,
        shareCount: 5,
        timestamp: new Date(),
      };

      // Mock dependencies
      (mockTokenManager.getValidToken as jest.Mock).mockResolvedValue(
        mockToken
      );
      (mockAPIManager.getMetrics as jest.Mock).mockResolvedValue(mockMetrics);
      (mockCache.get as jest.Mock)
        .mockResolvedValueOnce(job) // getJobStatus
        .mockResolvedValueOnce(null) // getPreviousMetrics
        .mockResolvedValueOnce(job); // updateJobStatus

      // Mock queue operations
      (mockCache['client'].rpop as jest.Mock)
        .mockResolvedValueOnce('job123')
        .mockResolvedValue(null);

      await metricsCollector.start();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockTokenManager.getValidToken).toHaveBeenCalledWith(
        'user123',
        'tiktok'
      );
      expect(mockAPIManager.getMetrics).toHaveBeenCalledWith(
        'tiktok',
        'valid_token',
        'video789',
        'user123'
      );
      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('metrics:user123:campaign456:video789:current'),
        expect.objectContaining({
          ...mockMetrics,
          promoterId: 'user123',
          campaignId: 'campaign456',
          platform: 'tiktok',
          postId: 'video789',
          isValid: true,
        }),
        { ttl: DEFAULT_CONFIG.cacheSettings.metricsHistoryTTL }
      );

      await metricsCollector.stop();
    });

    it('should handle job processing errors', async () => {
      const job = {
        id: 'job123',
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok' as const,
        postId: 'video789',
        status: 'pending' as const,
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      // Mock token manager to return null (no valid token)
      (mockTokenManager.getValidToken as jest.Mock).mockResolvedValue(null);
      (mockCache.get as jest.Mock).mockResolvedValue(job);
      (mockCache['client'].rpop as jest.Mock)
        .mockResolvedValueOnce('job123')
        .mockResolvedValue(null);

      await metricsCollector.start();

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 100));

      expect(mockCache.set).toHaveBeenCalledWith(
        'metrics-job:job123',
        expect.objectContaining({
          retryCount: 1,
          error: 'No valid token found for user user123 on tiktok',
        }),
        { ttl: DEFAULT_CONFIG.cacheSettings.jobQueueTTL }
      );

      await metricsCollector.stop();
    });
  });

  describe('validation rules', () => {
    it('should validate non-negative values', () => {
      const rule = DEFAULT_VALIDATION_RULES.find(
        r => r.name === 'non-negative-values'
      )!;

      const validMetrics = {
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date(),
      };

      const invalidMetrics = {
        viewCount: -100,
        likeCount: 10,
        commentCount: -5,
        shareCount: 2,
        timestamp: new Date(),
      };

      expect(rule.validate(validMetrics).isValid).toBe(true);

      const invalidResult = rule.validate(invalidMetrics);
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.error).toContain('viewCount');
      expect(invalidResult.error).toContain('commentCount');
    });

    it('should validate reasonable growth', () => {
      const rule = DEFAULT_VALIDATION_RULES.find(
        r => r.name === 'reasonable-growth'
      )!;

      const previousMetrics = {
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date(Date.now() - 60000),
      };

      const normalGrowth = {
        viewCount: 150,
        likeCount: 15,
        commentCount: 7,
        shareCount: 3,
        timestamp: new Date(),
      };

      const suspiciousGrowth = {
        viewCount: 250, // +150 views
        likeCount: 5, // -5 likes (suspicious)
        commentCount: 2, // -3 comments (suspicious)
        shareCount: 1,
        timestamp: new Date(),
      };

      expect(rule.validate(normalGrowth, previousMetrics).isValid).toBe(true);

      const suspiciousResult = rule.validate(suspiciousGrowth, previousMetrics);
      expect(suspiciousResult.isValid).toBe(false);
      expect(suspiciousResult.error).toContain('engagement decreased');
    });

    it('should validate engagement ratio', () => {
      const rule = DEFAULT_VALIDATION_RULES.find(
        r => r.name === 'engagement-ratio'
      )!;

      const normalEngagement = {
        viewCount: 1000,
        likeCount: 50, // 5% like rate
        commentCount: 10, // 1% comment rate
        shareCount: 5,
        timestamp: new Date(),
      };

      const suspiciousEngagement = {
        viewCount: 10000,
        likeCount: 5, // 0.05% like rate (very low)
        commentCount: 0, // 0% comment rate (very low)
        shareCount: 0,
        timestamp: new Date(),
      };

      expect(rule.validate(normalEngagement).isValid).toBe(true);

      const suspiciousResult = rule.validate(suspiciousEngagement);
      expect(suspiciousResult.isValid).toBe(false);
      expect(suspiciousResult.error).toContain(
        'Suspiciously low engagement ratio'
      );
    });
  });

  describe('getJobStatus', () => {
    it('should return job status', async () => {
      const job = {
        id: 'job123',
        status: 'completed' as const,
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok' as const,
        postId: 'video789',
        scheduledAt: new Date(),
        retryCount: 0,
        maxRetries: 3,
      };

      (mockCache.get as jest.Mock).mockResolvedValue(job);

      const result = await metricsCollector.getJobStatus('job123');
      expect(result).toEqual(job);
      expect(mockCache.get).toHaveBeenCalledWith('metrics-job:job123');
    });
  });

  describe('getQueueStats', () => {
    it('should return queue statistics', async () => {
      (mockCache['client'].llen as jest.Mock)
        .mockResolvedValueOnce(5) // pending queue
        .mockResolvedValueOnce(2); // database storage queue

      const stats = await metricsCollector.getQueueStats();

      expect(stats).toEqual({
        pending: 5,
        processing: 0,
        completed: 0,
        failed: 0,
      });
    });
  });

  describe('getMetricsHistory', () => {
    it('should return metrics history', async () => {
      const mockMetrics1 = {
        viewCount: 100,
        likeCount: 10,
        timestamp: new Date(Date.now() - 120000),
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok' as const,
        postId: 'video789',
        isValid: true,
        validationErrors: [],
      };

      const mockMetrics2 = {
        viewCount: 150,
        likeCount: 15,
        timestamp: new Date(Date.now() - 60000),
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok' as const,
        postId: 'video789',
        isValid: true,
        validationErrors: [],
      };

      (mockCache.keys as jest.Mock).mockResolvedValue([
        'metrics:user123:campaign456:video789:history_1234567890',
        'metrics:user123:campaign456:video789:history_1234567891',
      ]);

      (mockCache.get as jest.Mock)
        .mockResolvedValueOnce(mockMetrics1)
        .mockResolvedValueOnce(mockMetrics2);

      const history = await metricsCollector.getMetricsHistory(
        'user123',
        'campaign456',
        'video789'
      );

      expect(history).toHaveLength(2);
      expect(history[0]).toEqual(mockMetrics1); // Order may vary based on timestamp parsing
      expect(history[1]).toEqual(mockMetrics2);
    });
  });

  describe('getCurrentMetrics', () => {
    it('should return current aggregated metrics', async () => {
      const mockAggregatedMetrics = {
        video789: {
          viewCount: 150,
          likeCount: 15,
          timestamp: new Date(),
          promoterId: 'user123',
          campaignId: 'campaign456',
          platform: 'tiktok' as const,
          postId: 'video789',
          isValid: true,
          validationErrors: [],
        },
      };

      (mockCache.get as jest.Mock).mockResolvedValue(mockAggregatedMetrics);

      const result = await metricsCollector.getCurrentMetrics(
        'user123',
        'campaign456'
      );

      expect(result).toEqual(mockAggregatedMetrics);
      expect(mockCache.get).toHaveBeenCalledWith(
        'metrics-aggregated:user123:campaign456'
      );
    });
  });

  describe('configuration', () => {
    it('should use custom configuration', () => {
      const customConfig = {
        collectionInterval: 30000,
        batchSize: 5,
        maxRetries: 5,
      };

      const customCollector = createMetricsCollector(
        mockCache,
        mockAPIManager,
        mockTokenManager,
        customConfig
      );

      const config = customCollector.getConfig();
      expect(config.collectionInterval).toBe(30000);
      expect(config.batchSize).toBe(5);
      expect(config.maxRetries).toBe(5);
    });

    it('should merge with default configuration', () => {
      const partialConfig = {
        batchSize: 20,
      };

      const collector = createMetricsCollector(
        mockCache,
        mockAPIManager,
        mockTokenManager,
        partialConfig
      );

      const config = collector.getConfig();
      expect(config.batchSize).toBe(20);
      expect(config.collectionInterval).toBe(DEFAULT_CONFIG.collectionInterval);
      expect(config.maxRetries).toBe(DEFAULT_CONFIG.maxRetries);
    });
  });
});
