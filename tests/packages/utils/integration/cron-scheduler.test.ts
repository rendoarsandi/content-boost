import {
  CronScheduler,
  CronParser,
  createCronScheduler,
  SCHEDULES,
} from '../src/cron-scheduler';

describe('CronParser', () => {
  describe('parseInterval', () => {
    it('should parse second intervals', () => {
      expect(CronParser.parseInterval('30s')).toBe(30000);
      expect(CronParser.parseInterval('1s')).toBe(1000);
    });

    it('should parse minute intervals', () => {
      expect(CronParser.parseInterval('5m')).toBe(300000);
      expect(CronParser.parseInterval('1m')).toBe(60000);
    });

    it('should parse hour intervals', () => {
      expect(CronParser.parseInterval('2h')).toBe(7200000);
      expect(CronParser.parseInterval('1h')).toBe(3600000);
    });

    it('should parse millisecond intervals', () => {
      expect(CronParser.parseInterval('5000ms')).toBe(5000);
      expect(CronParser.parseInterval('100ms')).toBe(100);
    });

    it('should return null for invalid intervals', () => {
      expect(CronParser.parseInterval('invalid')).toBeNull();
      expect(CronParser.parseInterval('5x')).toBeNull();
      expect(CronParser.parseInterval('')).toBeNull();
    });
  });

  describe('getNextRunTime', () => {
    it('should calculate next run time for intervals', () => {
      const now = new Date();
      const nextRun = CronParser.getNextRunTime('5m', now);

      expect(nextRun.getTime()).toBe(now.getTime() + 300000);
    });

    it('should use current time if no lastRun provided', () => {
      const before = Date.now();
      const nextRun = CronParser.getNextRunTime('1m');
      const after = Date.now();

      expect(nextRun.getTime()).toBeGreaterThanOrEqual(before + 60000);
      expect(nextRun.getTime()).toBeLessThanOrEqual(after + 60000);
    });
  });
});

describe('CronScheduler', () => {
  let scheduler: CronScheduler;
  let mockHandler: jest.Mock;

  beforeEach(() => {
    scheduler = createCronScheduler({ logLevel: 'error' }); // Reduce log noise in tests
    mockHandler = jest.fn().mockResolvedValue(undefined);
    jest.useFakeTimers();
  });

  afterEach(() => {
    scheduler.stop();
    jest.useRealTimers();
  });

  describe('addJob', () => {
    it('should add a new job', () => {
      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '1m',
        handler: mockHandler,
        enabled: true,
      };

      scheduler.addJob(job);

      const retrievedJob = scheduler.getJob('test-job');
      expect(retrievedJob).toBeDefined();
      expect(retrievedJob?.name).toBe('Test Job');
      expect(retrievedJob?.enabled).toBe(true);
      expect(retrievedJob?.runCount).toBe(0);
      expect(retrievedJob?.errorCount).toBe(0);
    });

    it('should schedule job if scheduler is running', () => {
      scheduler.start();

      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '100ms',
        handler: mockHandler,
        enabled: true,
      };

      scheduler.addJob(job);

      // Fast-forward time
      jest.advanceTimersByTime(150);

      expect(mockHandler).toHaveBeenCalledTimes(1);
    });
  });

  describe('removeJob', () => {
    it('should remove an existing job', () => {
      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '1m',
        handler: mockHandler,
        enabled: true,
      };

      scheduler.addJob(job);
      expect(scheduler.getJob('test-job')).toBeDefined();

      const removed = scheduler.removeJob('test-job');
      expect(removed).toBe(true);
      expect(scheduler.getJob('test-job')).toBeUndefined();
    });

    it('should return false for non-existent job', () => {
      const removed = scheduler.removeJob('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('toggleJob', () => {
    it('should enable/disable jobs', () => {
      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '1m',
        handler: mockHandler,
        enabled: true,
      };

      scheduler.addJob(job);

      // Disable job
      const disabled = scheduler.toggleJob('test-job', false);
      expect(disabled).toBe(true);
      expect(scheduler.getJob('test-job')?.enabled).toBe(false);

      // Enable job
      const enabled = scheduler.toggleJob('test-job', true);
      expect(enabled).toBe(true);
      expect(scheduler.getJob('test-job')?.enabled).toBe(true);
    });

    it('should return false for non-existent job', () => {
      const result = scheduler.toggleJob('non-existent', true);
      expect(result).toBe(false);
    });
  });

  describe('start and stop', () => {
    it('should start and stop the scheduler', () => {
      expect(scheduler.isHealthy()).toBe(false);

      scheduler.start();
      expect(scheduler.isHealthy()).toBe(true);

      scheduler.stop();
      expect(scheduler.isHealthy()).toBe(false);
    });

    it('should execute jobs when started', () => {
      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '100ms',
        handler: mockHandler,
        enabled: true,
      };

      scheduler.addJob(job);
      scheduler.start();

      // Fast-forward time to trigger job
      jest.advanceTimersByTime(150);

      expect(mockHandler).toHaveBeenCalledTimes(1);

      const retrievedJob = scheduler.getJob('test-job');
      expect(retrievedJob?.runCount).toBe(1);
      expect(retrievedJob?.lastRun).toBeDefined();
    });

    it('should not execute disabled jobs', () => {
      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '100ms',
        handler: mockHandler,
        enabled: false,
      };

      scheduler.addJob(job);
      scheduler.start();

      // Fast-forward time
      jest.advanceTimersByTime(150);

      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('job execution', () => {
    it('should handle job errors', async () => {
      const errorHandler = jest.fn().mockRejectedValue(new Error('Test error'));

      const job = {
        id: 'error-job',
        name: 'Error Job',
        schedule: '100ms',
        handler: errorHandler,
        enabled: true,
      };

      scheduler.addJob(job);
      scheduler.start();

      // Fast-forward time to trigger job
      jest.advanceTimersByTime(150);

      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 50));

      const retrievedJob = scheduler.getJob('error-job');
      expect(retrievedJob?.errorCount).toBe(1);
      expect(retrievedJob?.lastError).toBe('Test error');
    }, 10000);

    it('should reschedule jobs after execution', async () => {
      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '100ms',
        handler: mockHandler,
        enabled: true,
      };

      scheduler.addJob(job);
      scheduler.start();

      // First execution
      jest.advanceTimersByTime(150);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockHandler).toHaveBeenCalledTimes(1);

      // Second execution
      jest.advanceTimersByTime(100);
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockHandler).toHaveBeenCalledTimes(2);
    });

    it('should respect concurrent job limits', () => {
      const slowHandler = jest
        .fn()
        .mockImplementation(
          () => new Promise(resolve => setTimeout(resolve, 200))
        );

      const limitedScheduler = createCronScheduler({
        maxConcurrentJobs: 1,
        logLevel: 'error',
      });

      const job1 = {
        id: 'job1',
        name: 'Job 1',
        schedule: '50ms',
        handler: slowHandler,
        enabled: true,
      };

      const job2 = {
        id: 'job2',
        name: 'Job 2',
        schedule: '50ms',
        handler: slowHandler,
        enabled: true,
      };

      limitedScheduler.addJob(job1);
      limitedScheduler.addJob(job2);
      limitedScheduler.start();

      // Trigger both jobs
      jest.advanceTimersByTime(100);

      // Only one should execute due to limit
      expect(slowHandler).toHaveBeenCalledTimes(1);

      limitedScheduler.stop();
    });
  });

  describe('getAllJobs', () => {
    it('should return all jobs', () => {
      const job1 = {
        id: 'job1',
        name: 'Job 1',
        schedule: '1m',
        handler: mockHandler,
        enabled: true,
      };

      const job2 = {
        id: 'job2',
        name: 'Job 2',
        schedule: '2m',
        handler: mockHandler,
        enabled: false,
      };

      scheduler.addJob(job1);
      scheduler.addJob(job2);

      const allJobs = scheduler.getAllJobs();
      expect(allJobs).toHaveLength(2);
      expect(allJobs.find(j => j.id === 'job1')).toBeDefined();
      expect(allJobs.find(j => j.id === 'job2')).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('should return scheduler statistics', () => {
      const job1 = {
        id: 'job1',
        name: 'Job 1',
        schedule: '1m',
        handler: mockHandler,
        enabled: true,
      };

      const job2 = {
        id: 'job2',
        name: 'Job 2',
        schedule: '2m',
        handler: mockHandler,
        enabled: false,
      };

      scheduler.addJob(job1);
      scheduler.addJob(job2);

      const stats = scheduler.getStats();
      expect(stats.totalJobs).toBe(2);
      expect(stats.enabledJobs).toBe(1);
      expect(stats.runningJobs).toBe(0);
      expect(stats.totalRuns).toBe(0);
      expect(stats.totalErrors).toBe(0);
    });
  });

  describe('executeJobManually', () => {
    it('should execute job manually', async () => {
      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '1m',
        handler: mockHandler,
        enabled: true,
      };

      scheduler.addJob(job);

      const executed = await scheduler.executeJobManually('test-job');
      expect(executed).toBe(true);

      // Wait for async execution
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockHandler).toHaveBeenCalledTimes(1);
    });

    it('should return false for non-existent job', async () => {
      const executed = await scheduler.executeJobManually('non-existent');
      expect(executed).toBe(false);
    });
  });

  describe('updateJobSchedule', () => {
    it('should update job schedule', () => {
      const job = {
        id: 'test-job',
        name: 'Test Job',
        schedule: '1m',
        handler: mockHandler,
        enabled: true,
      };

      scheduler.addJob(job);

      const updated = scheduler.updateJobSchedule('test-job', '30s');
      expect(updated).toBe(true);

      const retrievedJob = scheduler.getJob('test-job');
      expect(retrievedJob?.schedule).toBe('30s');
    });

    it('should return false for non-existent job', () => {
      const updated = scheduler.updateJobSchedule('non-existent', '30s');
      expect(updated).toBe(false);
    });
  });

  describe('predefined schedules', () => {
    it('should have correct predefined schedules', () => {
      expect(SCHEDULES.EVERY_MINUTE).toBe('1m');
      expect(SCHEDULES.EVERY_5_MINUTES).toBe('5m');
      expect(SCHEDULES.EVERY_HOUR).toBe('1h');
      expect(SCHEDULES.EVERY_DAY).toBe('24h');
    });
  });
});
