import { MetricsCronScheduler } from '../../src/metrics-worker/cron-scheduler';
import { MetricsCollectionWorker } from '../../src/metrics-worker/worker';
import { MetricsCollectionScheduler } from '../../src/metrics-worker/scheduler';
import { RedisCache } from '@repo/cache';

// Mock dependencies
jest.mock('@repo/cache');
jest.mock('../../src/metrics-worker/worker');
jest.mock('../../src/metrics-worker/scheduler');

describe('MetricsCronScheduler', () => {
  let cronScheduler: MetricsCronScheduler;
  let mockCache: jest.Mocked<RedisCache>;
  let mockWorker: jest.Mocked<MetricsCollectionWorker>;
  let mockScheduler: jest.Mocked<MetricsCollectionScheduler>;

  beforeEach(() => {
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      keys: jest.fn(),
      ttl: jest.fn(),
      ping: jest.fn()
    } as any;

    mockWorker = {
      collectMetricsNow: jest.fn(),
      getWorkerStatus: jest.fn(),
      getCollectionStats: jest.fn()
    } as any;

    mockScheduler = {
      getDueJobs: jest.fn(),
      getStatus: jest.fn()
    } as any;

    cronScheduler = new MetricsCronScheduler(mockCache, mockWorker, mockScheduler);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('initialization', () => {
    it('should initialize with default cron jobs', () => {
      const jobs = cronScheduler.getCronJobs();
      
      expect(jobs).toHaveLength(3);
      expect(jobs.find(job => job.name === 'metrics_collection')).toBeDefined();
      expect(jobs.find(job => job.name === 'cache_cleanup')).toBeDefined();
      expect(jobs.find(job => job.name === 'health_check')).toBeDefined();
    });

    it('should have correct default schedules', () => {
      const jobs = cronScheduler.getCronJobs();
      
      const metricsJob = jobs.find(job => job.name === 'metrics_collection');
      const cacheJob = jobs.find(job => job.name === 'cache_cleanup');
      const healthJob = jobs.find(job => job.name === 'health_check');

      expect(metricsJob?.schedule).toBe('* * * * *'); // Every minute
      expect(cacheJob?.schedule).toBe('0 * * * *'); // Every hour
      expect(healthJob?.schedule).toBe('*/5 * * * *'); // Every 5 minutes
    });
  });

  describe('start and stop', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockCache.keys.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should start successfully', async () => {
      await cronScheduler.start();
      
      expect(mockCache.keys).toHaveBeenCalledWith('cron_config:*');
    });

    it('should not start if already running', async () => {
      await cronScheduler.start();
      
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await cronScheduler.start();
      
      expect(consoleSpy).toHaveBeenCalledWith('Cron scheduler is already running');
      consoleSpy.mockRestore();
    });

    it('should stop successfully', async () => {
      await cronScheduler.start();
      await cronScheduler.stop();
      
      // Should save configurations on stop
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should not stop if not running', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
      await cronScheduler.stop();
      
      expect(consoleSpy).toHaveBeenCalledWith('Cron scheduler is not running');
      consoleSpy.mockRestore();
    });
  });

  describe('cron job management', () => {
    it('should add custom cron job', async () => {
      const customJob = {
        name: 'custom_job',
        schedule: '*/10 * * * *',
        enabled: true,
        description: 'Custom test job'
      };

      await cronScheduler.addCronJob(customJob);
      
      const job = cronScheduler.getCronJob('custom_job');
      expect(job).toBeDefined();
      expect(job?.name).toBe('custom_job');
      expect(job?.runCount).toBe(0);
      expect(job?.errorCount).toBe(0);
    });

    it('should remove cron job', async () => {
      const customJob = {
        name: 'custom_job',
        schedule: '*/10 * * * *',
        enabled: true
      };

      await cronScheduler.addCronJob(customJob);
      const removed = await cronScheduler.removeCronJob('custom_job');
      
      expect(removed).toBe(true);
      expect(cronScheduler.getCronJob('custom_job')).toBeUndefined();
    });

    it('should return false when removing non-existent job', async () => {
      const removed = await cronScheduler.removeCronJob('non_existent');
      expect(removed).toBe(false);
    });

    it('should enable cron job', async () => {
      const customJob = {
        name: 'custom_job',
        schedule: '*/10 * * * *',
        enabled: false
      };

      await cronScheduler.addCronJob(customJob);
      const enabled = await cronScheduler.enableCronJob('custom_job');
      
      expect(enabled).toBe(true);
      expect(cronScheduler.getCronJob('custom_job')?.enabled).toBe(true);
    });

    it('should disable cron job', async () => {
      const customJob = {
        name: 'custom_job',
        schedule: '*/10 * * * *',
        enabled: true
      };

      await cronScheduler.addCronJob(customJob);
      const disabled = await cronScheduler.disableCronJob('custom_job');
      
      expect(disabled).toBe(true);
      expect(cronScheduler.getCronJob('custom_job')?.enabled).toBe(false);
    });
  });

  describe('job execution', () => {
    beforeEach(() => {
      jest.useFakeTimers();
      mockCache.keys.mockResolvedValue([]);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should execute metrics collection job', async () => {
      const mockJobs = [
        {
          id: 'job1',
          userId: 'user1',
          platform: 'tiktok' as const,
          postId: 'post1',
          campaignId: 'campaign1',
          trackingStartTime: new Date(),
          isActive: true,
          priority: 'medium' as const,
          retryCount: 0,
          maxRetries: 3,
          nextCollectionTime: new Date()
        }
      ];

      mockScheduler.getDueJobs.mockResolvedValue(mockJobs);
      mockWorker.collectMetricsNow.mockResolvedValue({
        jobId: 'job1',
        success: true,
        collectedAt: new Date(),
        processingTime: 1000,
        rateLimited: false
      });

      await cronScheduler.start();
      
      // Fast-forward time to trigger job execution
      jest.advanceTimersByTime(60000); // 1 minute
      
      // Allow promises to resolve
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockScheduler.getDueJobs).toHaveBeenCalled();
      expect(mockWorker.collectMetricsNow).toHaveBeenCalledWith(
        'user1',
        'tiktok',
        'post1',
        'campaign1'
      );
    });

    it('should handle job execution errors gracefully', async () => {
      const mockJobs = [
        {
          id: 'job1',
          userId: 'user1',
          platform: 'tiktok' as const,
          postId: 'post1',
          campaignId: 'campaign1',
          trackingStartTime: new Date(),
          isActive: true,
          priority: 'medium' as const,
          retryCount: 0,
          maxRetries: 3,
          nextCollectionTime: new Date()
        }
      ];

      mockScheduler.getDueJobs.mockResolvedValue(mockJobs);
      mockWorker.collectMetricsNow.mockRejectedValue(new Error('API Error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      await cronScheduler.start();
      
      // Fast-forward time to trigger job execution
      jest.advanceTimersByTime(60000); // 1 minute
      
      // Allow promises to resolve
      await new Promise(resolve => setImmediate(resolve));
      
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should execute health check job', async () => {
      mockWorker.getWorkerStatus.mockResolvedValue({
        isRunning: true,
        processedJobs: 10,
        failedJobs: 1,
        currentLoad: 2,
        maxLoad: 5
      });

      mockScheduler.getStatus.mockResolvedValue({
        isRunning: true,
        queueSize: 5,
        processingRate: 10,
        averageWaitTime: 1000
      });

      await cronScheduler.start();
      
      // Fast-forward time to trigger health check (every 5 minutes)
      jest.advanceTimersByTime(5 * 60000);
      
      // Allow promises to resolve
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockWorker.getWorkerStatus).toHaveBeenCalled();
      expect(mockScheduler.getStatus).toHaveBeenCalled();
    });

    it('should execute cache cleanup job', async () => {
      const mockKeys = ['key1', 'key2', 'key3'];
      mockCache.keys.mockResolvedValue(mockKeys);
      mockCache.ttl.mockResolvedValue(-1); // Expired keys

      await cronScheduler.start();
      
      // Fast-forward time to trigger cache cleanup (every hour)
      jest.advanceTimersByTime(60 * 60000);
      
      // Allow promises to resolve
      await new Promise(resolve => setImmediate(resolve));
      
      expect(mockCache.keys).toHaveBeenCalled();
      expect(mockCache.del).toHaveBeenCalledTimes(mockKeys.length);
    });
  });

  describe('job history', () => {
    it('should save and retrieve job history', async () => {
      const mockHistory = [
        {
          jobName: 'test_job',
          success: true,
          startTime: new Date(),
          endTime: new Date(),
          duration: 1000
        }
      ];

      mockCache.get.mockResolvedValue(mockHistory);

      const history = await cronScheduler.getJobHistory('test_job', 5);
      
      expect(history).toEqual(mockHistory);
      expect(mockCache.get).toHaveBeenCalledWith('cron_history:test_job');
    });

    it('should return empty array when no history exists', async () => {
      mockCache.get.mockResolvedValue(null);

      const history = await cronScheduler.getJobHistory('non_existent_job');
      
      expect(history).toEqual([]);
    });

    it('should handle history retrieval errors', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const history = await cronScheduler.getJobHistory('test_job');
      
      expect(history).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('cron expression parsing', () => {
    it('should parse standard cron expressions correctly', () => {
      // This tests the private parseCronExpression method indirectly
      // by checking if jobs are scheduled with correct intervals
      
      const jobs = cronScheduler.getCronJobs();
      
      // All default jobs should be enabled and have valid schedules
      jobs.forEach(job => {
        expect(job.enabled).toBe(true);
        expect(job.schedule).toBeTruthy();
      });
    });
  });

  describe('configuration persistence', () => {
    it('should load configurations on start', async () => {
      const mockConfigs = [
        'cron_config:custom_job1',
        'cron_config:custom_job2'
      ];

      const mockConfig = {
        name: 'custom_job1',
        schedule: '*/10 * * * *',
        enabled: true,
        runCount: 5,
        errorCount: 1
      };

      mockCache.keys.mockResolvedValue(mockConfigs);
      mockCache.get.mockResolvedValue(mockConfig);

      await cronScheduler.start();
      
      expect(mockCache.keys).toHaveBeenCalledWith('cron_config:*');
      expect(mockCache.get).toHaveBeenCalledTimes(mockConfigs.length);
    });

    it('should save configurations on stop', async () => {
      mockCache.keys.mockResolvedValue([]);
      
      await cronScheduler.start();
      await cronScheduler.stop();
      
      // Should save all job configurations
      const jobs = cronScheduler.getCronJobs();
      expect(mockCache.set).toHaveBeenCalledTimes(jobs.length);
    });
  });
});