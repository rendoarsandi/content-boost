import {
  MetricsBackgroundService,
  createMetricsBackgroundService,
  createMetricsWorker,
  createDataPipeline,
} from '../../src/metrics-worker';
import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from '../../src/social-api/manager';

// Mock dependencies
jest.mock('@repo/cache');
jest.mock('../../src/social-api/manager');

describe('Metrics Worker Integration', () => {
  let mockCache: jest.Mocked<RedisCache>;
  let mockApiManager: jest.Mocked<SocialMediaAPIManager>;

  beforeEach(() => {
    mockCache = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn().mockResolvedValue([]),
      ttl: jest.fn(),
      deletePattern: jest.fn(),
    } as any;

    mockApiManager = {
      collectMetrics: jest.fn(),
      healthCheck: jest.fn().mockResolvedValue(new Map()),
    } as any;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('factory functions', () => {
    it('should create background service with factory function', () => {
      const service = createMetricsBackgroundService(mockCache, mockApiManager);

      expect(service).toBeInstanceOf(MetricsBackgroundService);
    });

    it('should create background service with custom config', () => {
      const config = {
        enableCronJobs: false,
        logLevel: 'debug' as const,
      };

      const service = createMetricsBackgroundService(
        mockCache,
        mockApiManager,
        config
      );
      const serviceConfig = service.getConfig();

      expect(serviceConfig.enableCronJobs).toBe(false);
      expect(serviceConfig.logLevel).toBe('debug');
    });

    it('should create standalone worker', () => {
      const worker = createMetricsWorker(mockCache, mockApiManager);

      expect(worker).toBeDefined();
    });

    it('should create data pipeline', () => {
      const pipeline = createDataPipeline(mockCache);

      expect(pipeline).toBeDefined();
    });
  });

  describe('end-to-end workflow', () => {
    let backgroundService: MetricsBackgroundService;

    beforeEach(() => {
      backgroundService = createMetricsBackgroundService(
        mockCache,
        mockApiManager,
        {
          logLevel: 'error', // Reduce log noise in tests
        }
      );
    });

    it('should complete full metrics collection workflow', async () => {
      // Mock successful API response
      mockApiManager.collectMetrics.mockResolvedValue({
        success: true,
        metrics: {
          userId: 'user123',
          platform: 'tiktok',
          postId: 'post123',
          campaignId: 'campaign123',
          metrics: {
            views: 1000,
            likes: 100,
            comments: 10,
            shares: 5,
          },
          timestamp: new Date(),
          isValid: true,
        },
        rateLimited: false,
      });

      // Start the service
      await backgroundService.start();

      try {
        // Schedule a collection job
        const jobId = await backgroundService.scheduleMetricsCollection(
          'user123',
          'tiktok',
          'post123',
          'campaign123',
          { priority: 'high' }
        );

        expect(jobId).toBeDefined();

        // Collect metrics immediately
        const metrics = await backgroundService.collectMetricsNow(
          'user123',
          'tiktok',
          'post123',
          'campaign123'
        );

        expect(metrics).toBeDefined();
        expect(metrics?.userId).toBe('user123');
        expect(metrics?.processed).toBeDefined();
        expect(metrics?.raw).toBeDefined();

        // Check service status
        const status = await backgroundService.getStatus();
        expect(status.isRunning).toBe(true);
        expect(status.components).toBeDefined();

        // Check health
        const health = await backgroundService.checkHealth();
        expect(health.overall).toBeDefined();
      } finally {
        // Clean up
        await backgroundService.stop();
      }
    });

    it('should handle API failures gracefully', async () => {
      // Mock API failure
      mockApiManager.collectMetrics.mockResolvedValue({
        success: false,
        error: {
          code: 'API_ERROR',
          message: 'API request failed',
        },
        rateLimited: false,
      });

      await backgroundService.start();

      try {
        const metrics = await backgroundService.collectMetricsNow(
          'user123',
          'tiktok',
          'post123',
          'campaign123'
        );

        expect(metrics).toBeNull();
      } finally {
        await backgroundService.stop();
      }
    });

    it('should handle rate limiting', async () => {
      // Mock rate limited response
      mockApiManager.collectMetrics.mockResolvedValue({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: 'Rate limit exceeded',
          retryAfter: 60,
        },
        rateLimited: true,
        retryAfter: 60,
      });

      await backgroundService.start();

      try {
        const metrics = await backgroundService.collectMetricsNow(
          'user123',
          'tiktok',
          'post123',
          'campaign123'
        );

        expect(metrics).toBeNull();
      } finally {
        await backgroundService.stop();
      }
    });

    it('should manage cron jobs', async () => {
      await backgroundService.start();

      try {
        // Add custom cron job
        await backgroundService.addCronJob({
          name: 'test_job',
          schedule: '*/10 * * * *',
          enabled: true,
          description: 'Test job',
        });

        const cronJobs = backgroundService.getCronJobs();
        const testJob = cronJobs.find(job => job.name === 'test_job');

        expect(testJob).toBeDefined();
        expect(testJob?.enabled).toBe(true);

        // Disable the job
        await backgroundService.disableCronJob('test_job');

        const updatedJobs = backgroundService.getCronJobs();
        const disabledJob = updatedJobs.find(job => job.name === 'test_job');

        expect(disabledJob?.enabled).toBe(false);

        // Remove the job
        const removed = await backgroundService.removeCronJob('test_job');
        expect(removed).toBe(true);
      } finally {
        await backgroundService.stop();
      }
    });

    it('should process metrics through data pipeline', async () => {
      await backgroundService.start();

      try {
        const rawMetrics = {
          userId: 'user123',
          platform: 'tiktok',
          postId: 'post123',
          campaignId: 'campaign123',
          metrics: {
            views: 1000.7, // Will be normalized to integer
            likes: 100,
            comments: 10,
            shares: 5,
          },
          timestamp: new Date(),
          isValid: true,
        };

        const processedMetrics =
          await backgroundService.processMetrics(rawMetrics);

        expect(processedMetrics).toBeDefined();
        expect(processedMetrics.processed.validationResults).toBeDefined();
        expect(processedMetrics.processed.normalizationApplied).toBeDefined();
        expect(processedMetrics.processed.qualityScore).toBeGreaterThanOrEqual(
          0
        );
        expect(processedMetrics.raw.originalMetrics).toEqual(rawMetrics);
      } finally {
        await backgroundService.stop();
      }
    });

    it('should handle cache operations', async () => {
      await backgroundService.start();

      try {
        // Mock cached data
        const cachedMetrics = {
          userId: 'user123',
          cached: true,
          timestamp: new Date(),
        };

        mockCache.get.mockResolvedValue(cachedMetrics);

        const retrieved = await backgroundService.getCachedMetrics(
          'user123',
          'campaign123',
          'post123'
        );

        expect(retrieved).toEqual(cachedMetrics);

        // Clear cache
        await backgroundService.clearCache('user123');

        expect(mockCache.deletePattern).toHaveBeenCalledWith(
          'processed_metrics:user123:*'
        );
      } finally {
        await backgroundService.stop();
      }
    });
  });

  describe('service lifecycle', () => {
    it('should start and stop service cleanly', async () => {
      const service = createMetricsBackgroundService(mockCache, mockApiManager);

      // Initial state
      let status = await service.getStatus();
      expect(status.isRunning).toBe(false);

      // Start service
      await service.start();
      status = await service.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.startTime).toBeDefined();

      // Stop service
      await service.stop();
      status = await service.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should handle graceful shutdown', async () => {
      const service = createMetricsBackgroundService(mockCache, mockApiManager);

      await service.start();
      await service.gracefulShutdown();

      const status = await service.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle component initialization errors', async () => {
      // Mock cache to fail
      mockCache.ping.mockRejectedValue(new Error('Cache connection failed'));

      const service = createMetricsBackgroundService(mockCache, mockApiManager);

      const health = await service.checkHealth();
      expect(health.overall).toBe('unhealthy');
      expect(health.issues).toContain('Cache connectivity issues');
    });

    it('should handle service start errors', async () => {
      const service = createMetricsBackgroundService(mockCache, mockApiManager);

      // Mock a component to fail during start
      const mockScheduler = {
        start: jest.fn().mockRejectedValue(new Error('Scheduler start failed')),
      };

      // Replace scheduler with failing mock
      (service as any).scheduler = mockScheduler;

      await expect(service.start()).rejects.toThrow('Scheduler start failed');

      const status = await service.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('configuration', () => {
    it('should use default configuration', () => {
      const service = createMetricsBackgroundService(mockCache, mockApiManager);
      const config = service.getConfig();

      expect(config.collectionInterval).toBe(60000); // 1 minute
      expect(config.enableCronJobs).toBe(true);
      expect(config.logLevel).toBe('info');
    });

    it('should merge custom configuration', () => {
      const customConfig = {
        collectionInterval: 30000, // 30 seconds
        enableCronJobs: false,
        logLevel: 'debug' as const,
      };

      const service = createMetricsBackgroundService(
        mockCache,
        mockApiManager,
        customConfig
      );
      const config = service.getConfig();

      expect(config.collectionInterval).toBe(30000);
      expect(config.enableCronJobs).toBe(false);
      expect(config.logLevel).toBe('debug');
    });

    it('should update configuration at runtime', () => {
      const service = createMetricsBackgroundService(mockCache, mockApiManager);

      service.updateConfig({
        logLevel: 'warn',
        gracefulShutdownTimeout: 60000,
      });

      const config = service.getConfig();
      expect(config.logLevel).toBe('warn');
      expect(config.gracefulShutdownTimeout).toBe(60000);
    });
  });
});
