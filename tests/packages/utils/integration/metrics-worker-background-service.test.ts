import { MetricsBackgroundService } from '../../src/metrics-worker/background-service';
import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from '../../src/social-api/manager';

// Mock dependencies
jest.mock('@repo/cache');
jest.mock('../../src/social-api/manager');
jest.mock('../../src/metrics-worker/worker');
jest.mock('../../src/metrics-worker/scheduler');
jest.mock('../../src/metrics-worker/cron-scheduler');
jest.mock('../../src/metrics-worker/data-pipeline');

describe('MetricsBackgroundService', () => {
  let backgroundService: MetricsBackgroundService;
  let mockCache: jest.Mocked<RedisCache>;
  let mockApiManager: jest.Mocked<SocialMediaAPIManager>;

  beforeEach(() => {
    mockCache = {
      ping: jest.fn().mockResolvedValue('PONG'),
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
    } as any;

    mockApiManager = {
      healthCheck: jest.fn().mockResolvedValue(new Map()),
    } as any;

    backgroundService = new MetricsBackgroundService(mockCache, mockApiManager);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', () => {
      const config = backgroundService.getConfig();

      expect(config.enableCronJobs).toBe(true);
      expect(config.enableHealthChecks).toBe(true);
      expect(config.logLevel).toBe('info');
      expect(config.gracefulShutdownTimeout).toBe(30000);
    });

    it('should initialize with custom configuration', () => {
      const customConfig = {
        enableCronJobs: false,
        logLevel: 'debug' as const,
        gracefulShutdownTimeout: 60000,
      };

      const service = new MetricsBackgroundService(
        mockCache,
        mockApiManager,
        customConfig
      );
      const config = service.getConfig();

      expect(config.enableCronJobs).toBe(false);
      expect(config.logLevel).toBe('debug');
      expect(config.gracefulShutdownTimeout).toBe(60000);
    });
  });

  describe('service lifecycle', () => {
    it('should start successfully', async () => {
      await backgroundService.start();

      const status = await backgroundService.getStatus();
      expect(status.isRunning).toBe(true);
      expect(status.startTime).toBeDefined();
    });

    it('should not start if already running', async () => {
      await backgroundService.start();

      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      await backgroundService.start();

      // Should log warning about already running
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should stop successfully', async () => {
      await backgroundService.start();
      await backgroundService.stop();

      const status = await backgroundService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should not stop if not running', async () => {
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();
      await backgroundService.stop();

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle start errors gracefully', async () => {
      // Mock a component to fail during start
      const originalStart = backgroundService.start;
      jest
        .spyOn(backgroundService as any, 'scheduler')
        .mockImplementation(() => ({
          start: jest.fn().mockRejectedValue(new Error('Start failed')),
        }));

      await expect(backgroundService.start()).rejects.toThrow('Start failed');

      const status = await backgroundService.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('graceful shutdown', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should complete graceful shutdown within timeout', async () => {
      await backgroundService.start();

      const shutdownPromise = backgroundService.gracefulShutdown();

      // Fast-forward time but not past timeout
      jest.advanceTimersByTime(10000); // 10 seconds

      await shutdownPromise;

      const status = await backgroundService.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should force stop on timeout', async () => {
      await backgroundService.start();

      // Mock stop to take longer than timeout
      jest
        .spyOn(backgroundService, 'stop')
        .mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 60000))
        );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const shutdownPromise = backgroundService.gracefulShutdown();

      // Fast-forward past timeout
      jest.advanceTimersByTime(35000); // 35 seconds (past 30s timeout)

      await shutdownPromise;

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Graceful shutdown failed'),
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('health checks', () => {
    it('should report healthy status when all components are working', async () => {
      await backgroundService.start();

      // Mock all components as healthy
      jest.spyOn(backgroundService as any, 'worker').mockImplementation(() => ({
        getWorkerStatus: jest.fn().mockResolvedValue({
          isRunning: true,
          processedJobs: 100,
          failedJobs: 5,
          currentLoad: 2,
          maxLoad: 10,
        }),
      }));

      jest
        .spyOn(backgroundService as any, 'scheduler')
        .mockImplementation(() => ({
          getStatus: jest.fn().mockResolvedValue({
            isRunning: true,
            queueSize: 50,
            processingRate: 10,
            averageWaitTime: 1000,
          }),
        }));

      const health = await backgroundService.checkHealth();

      expect(health.overall).toBe('healthy');
      expect(health.issues).toHaveLength(0);
    });

    it('should report degraded status with minor issues', async () => {
      await backgroundService.start();

      // Mock one minor issue
      jest.spyOn(backgroundService as any, 'worker').mockImplementation(() => ({
        getWorkerStatus: jest.fn().mockResolvedValue({
          isRunning: true,
          processedJobs: 100,
          failedJobs: 15, // High failure rate
          currentLoad: 2,
          maxLoad: 10,
        }),
      }));

      jest
        .spyOn(backgroundService as any, 'scheduler')
        .mockImplementation(() => ({
          getStatus: jest.fn().mockResolvedValue({
            isRunning: true,
            queueSize: 50,
            processingRate: 10,
            averageWaitTime: 1000,
          }),
        }));

      const health = await backgroundService.checkHealth();

      expect(health.overall).toBe('degraded');
      expect(health.issues.length).toBeGreaterThan(0);
      expect(health.issues).toContain('High failure rate in worker jobs');
    });

    it('should report unhealthy status with major issues', async () => {
      // Don't start the service
      const health = await backgroundService.checkHealth();

      expect(health.overall).toBe('unhealthy');
      expect(health.issues).toContain('Service is not running');
    });

    it('should handle health check errors', async () => {
      await backgroundService.start();

      // Mock cache to fail
      mockCache.ping.mockRejectedValue(new Error('Cache connection failed'));

      const health = await backgroundService.checkHealth();

      expect(health.overall).toBe('unhealthy');
      expect(health.issues).toContain('Cache connectivity issues');
    });
  });

  describe('convenience methods', () => {
    beforeEach(async () => {
      await backgroundService.start();
    });

    it('should schedule metrics collection', async () => {
      const mockScheduleCollection = jest.fn().mockResolvedValue('job123');
      jest.spyOn(backgroundService as any, 'worker').mockImplementation(() => ({
        scheduleCollection: mockScheduleCollection,
      }));

      const jobId = await backgroundService.scheduleMetricsCollection(
        'user123',
        'tiktok',
        'post123',
        'campaign123',
        { priority: 'high' }
      );

      expect(jobId).toBe('job123');
      expect(mockScheduleCollection).toHaveBeenCalledWith(
        'user123',
        'tiktok',
        'post123',
        'campaign123',
        { priority: 'high' }
      );
    });

    it('should collect metrics immediately', async () => {
      const mockMetrics = {
        userId: 'user123',
        platform: 'tiktok',
        postId: 'post123',
        campaignId: 'campaign123',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
        processed: {
          validationResults: [],
          normalizationApplied: [],
          qualityScore: 100,
          anomalyDetected: false,
          processingTimestamp: new Date(),
        },
        raw: {
          originalMetrics: {},
          apiResponse: {},
          collectionMetadata: {
            collectionTime: new Date(),
            processingTime: 1000,
            retryCount: 0,
          },
        },
      };

      const mockCollectNow = jest.fn().mockResolvedValue({
        success: true,
        metrics: mockMetrics,
      });

      jest.spyOn(backgroundService as any, 'worker').mockImplementation(() => ({
        collectMetricsNow: mockCollectNow,
      }));

      const result = await backgroundService.collectMetricsNow(
        'user123',
        'tiktok',
        'post123',
        'campaign123'
      );

      expect(result).toEqual(mockMetrics);
      expect(mockCollectNow).toHaveBeenCalledWith(
        'user123',
        'tiktok',
        'post123',
        'campaign123'
      );
    });

    it('should return null when collection fails', async () => {
      const mockCollectNow = jest.fn().mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      jest.spyOn(backgroundService as any, 'worker').mockImplementation(() => ({
        collectMetricsNow: mockCollectNow,
      }));

      const result = await backgroundService.collectMetricsNow(
        'user123',
        'tiktok',
        'post123',
        'campaign123'
      );

      expect(result).toBeNull();
    });

    it('should manage job operations', async () => {
      const mockPauseJob = jest.fn().mockResolvedValue(true);
      const mockResumeJob = jest.fn().mockResolvedValue(true);
      const mockUpdatePriority = jest.fn().mockResolvedValue(true);

      jest.spyOn(backgroundService as any, 'worker').mockImplementation(() => ({
        pauseJob: mockPauseJob,
        resumeJob: mockResumeJob,
        updateJobPriority: mockUpdatePriority,
      }));

      await backgroundService.pauseJob('job123');
      await backgroundService.resumeJob('job123');
      await backgroundService.updateJobPriority('job123', 'high');

      expect(mockPauseJob).toHaveBeenCalledWith('job123');
      expect(mockResumeJob).toHaveBeenCalledWith('job123');
      expect(mockUpdatePriority).toHaveBeenCalledWith('job123', 'high');
    });
  });

  describe('cron job management', () => {
    beforeEach(async () => {
      await backgroundService.start();
    });

    it('should manage cron jobs', async () => {
      const mockAddCronJob = jest.fn();
      const mockRemoveCronJob = jest.fn().mockResolvedValue(true);
      const mockEnableCronJob = jest.fn().mockResolvedValue(true);
      const mockDisableCronJob = jest.fn().mockResolvedValue(true);
      const mockGetCronJobs = jest.fn().mockReturnValue([]);

      jest
        .spyOn(backgroundService as any, 'cronScheduler')
        .mockImplementation(() => ({
          addCronJob: mockAddCronJob,
          removeCronJob: mockRemoveCronJob,
          enableCronJob: mockEnableCronJob,
          disableCronJob: mockDisableCronJob,
          getCronJobs: mockGetCronJobs,
        }));

      const cronConfig = {
        name: 'test_job',
        schedule: '*/10 * * * *',
        enabled: true,
      };

      await backgroundService.addCronJob(cronConfig);
      await backgroundService.removeCronJob('test_job');
      await backgroundService.enableCronJob('test_job');
      await backgroundService.disableCronJob('test_job');
      backgroundService.getCronJobs();

      expect(mockAddCronJob).toHaveBeenCalledWith(cronConfig);
      expect(mockRemoveCronJob).toHaveBeenCalledWith('test_job');
      expect(mockEnableCronJob).toHaveBeenCalledWith('test_job');
      expect(mockDisableCronJob).toHaveBeenCalledWith('test_job');
      expect(mockGetCronJobs).toHaveBeenCalled();
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = {
        logLevel: 'debug' as const,
        gracefulShutdownTimeout: 60000,
      };

      backgroundService.updateConfig(newConfig);
      const config = backgroundService.getConfig();

      expect(config.logLevel).toBe('debug');
      expect(config.gracefulShutdownTimeout).toBe(60000);
    });

    it('should return current configuration', () => {
      const config = backgroundService.getConfig();

      expect(config).toBeDefined();
      expect(config.enableCronJobs).toBeDefined();
      expect(config.logLevel).toBeDefined();
    });
  });

  describe('data pipeline operations', () => {
    beforeEach(async () => {
      await backgroundService.start();
    });

    it('should process metrics through pipeline', async () => {
      const mockProcessedMetrics = {
        userId: 'user123',
        platform: 'tiktok',
        postId: 'post123',
        campaignId: 'campaign123',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
        processed: {
          validationResults: [],
          normalizationApplied: [],
          qualityScore: 100,
          anomalyDetected: false,
          processingTimestamp: new Date(),
        },
        raw: {
          originalMetrics: {},
          apiResponse: {},
          collectionMetadata: {
            collectionTime: new Date(),
            processingTime: 1000,
            retryCount: 0,
          },
        },
      };

      const mockProcessMetrics = jest
        .fn()
        .mockResolvedValue(mockProcessedMetrics);
      jest
        .spyOn(backgroundService as any, 'dataPipeline')
        .mockImplementation(() => ({
          processMetrics: mockProcessMetrics,
        }));

      const rawMetrics = { views: 1000, likes: 100 };
      const result = await backgroundService.processMetrics(rawMetrics);

      expect(result).toEqual(mockProcessedMetrics);
      expect(mockProcessMetrics).toHaveBeenCalledWith(rawMetrics, undefined);
    });

    it('should get cached metrics', async () => {
      const mockCachedMetrics = { userId: 'user123', cached: true };
      const mockGetCachedMetrics = jest
        .fn()
        .mockResolvedValue(mockCachedMetrics);

      jest
        .spyOn(backgroundService as any, 'dataPipeline')
        .mockImplementation(() => ({
          getCachedMetrics: mockGetCachedMetrics,
        }));

      const result = await backgroundService.getCachedMetrics(
        'user123',
        'campaign123',
        'post123'
      );

      expect(result).toEqual(mockCachedMetrics);
      expect(mockGetCachedMetrics).toHaveBeenCalledWith(
        'user123',
        'campaign123',
        'post123'
      );
    });

    it('should clear cache', async () => {
      const mockClearCache = jest.fn();
      jest
        .spyOn(backgroundService as any, 'dataPipeline')
        .mockImplementation(() => ({
          clearCache: mockClearCache,
        }));

      await backgroundService.clearCache('user123', 'campaign123');

      expect(mockClearCache).toHaveBeenCalledWith('user123', 'campaign123');
    });
  });
});
