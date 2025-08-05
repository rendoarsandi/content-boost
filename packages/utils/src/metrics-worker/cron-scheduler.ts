import { MetricsCollectionWorker } from './worker';
import { MetricsCollectionScheduler } from './scheduler';
import { RedisCache } from '@repo/cache';
import { CronJobConfig, CronJobResult } from './types';

export class MetricsCronScheduler {
  private cache: RedisCache;
  private worker: MetricsCollectionWorker;
  private scheduler: MetricsCollectionScheduler;
  private cronJobs: Map<string, CronJobConfig> = new Map();
  private cronIntervals: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(
    cache: RedisCache,
    worker: MetricsCollectionWorker,
    scheduler: MetricsCollectionScheduler
  ) {
    this.cache = cache;
    this.worker = worker;
    this.scheduler = scheduler;

    this.initializeDefaultJobs();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Cron scheduler is already running');
      return;
    }

    this.isRunning = true;
    console.log('Starting metrics cron scheduler...');

    // Load saved job configurations
    await this.loadJobConfigurations();

    // Start all enabled cron jobs
    for (const [jobName, config] of this.cronJobs.entries()) {
      if (config.enabled) {
        await this.startCronJob(jobName);
      }
    }

    console.log(`Started ${this.cronIntervals.size} cron jobs`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Cron scheduler is not running');
      return;
    }

    console.log('Stopping metrics cron scheduler...');
    this.isRunning = false;

    // Stop all running cron jobs
    for (const [jobName, interval] of this.cronIntervals.entries()) {
      clearInterval(interval);
      console.log(`Stopped cron job: ${jobName}`);
    }

    this.cronIntervals.clear();

    // Save job configurations
    await this.saveJobConfigurations();

    console.log('Cron scheduler stopped');
  }

  async addCronJob(
    config: Omit<CronJobConfig, 'runCount' | 'errorCount'>
  ): Promise<void> {
    const fullConfig: CronJobConfig = {
      ...config,
      runCount: 0,
      errorCount: 0,
    };

    this.cronJobs.set(config.name, fullConfig);

    if (config.enabled && this.isRunning) {
      await this.startCronJob(config.name);
    }

    await this.saveJobConfiguration(config.name, fullConfig);
  }

  async removeCronJob(jobName: string): Promise<boolean> {
    const config = this.cronJobs.get(jobName);
    if (!config) {
      return false;
    }

    // Stop the job if it's running
    await this.stopCronJob(jobName);

    // Remove from memory and cache
    this.cronJobs.delete(jobName);
    await this.removeJobConfiguration(jobName);

    return true;
  }

  async enableCronJob(jobName: string): Promise<boolean> {
    const config = this.cronJobs.get(jobName);
    if (!config) {
      return false;
    }

    config.enabled = true;
    await this.saveJobConfiguration(jobName, config);

    if (this.isRunning) {
      await this.startCronJob(jobName);
    }

    return true;
  }

  async disableCronJob(jobName: string): Promise<boolean> {
    const config = this.cronJobs.get(jobName);
    if (!config) {
      return false;
    }

    config.enabled = false;
    await this.saveJobConfiguration(jobName, config);
    await this.stopCronJob(jobName);

    return true;
  }

  getCronJobs(): CronJobConfig[] {
    return Array.from(this.cronJobs.values());
  }

  getCronJob(jobName: string): CronJobConfig | undefined {
    return this.cronJobs.get(jobName);
  }

  async getJobHistory(
    jobName: string,
    limit: number = 10
  ): Promise<CronJobResult[]> {
    try {
      const historyKey = `cron_history:${jobName}`;
      const history = (await this.cache.get<CronJobResult[]>(historyKey)) || [];
      return history.slice(-limit);
    } catch (error) {
      console.error(`Failed to get job history for ${jobName}:`, error);
      return [];
    }
  }

  private async startCronJob(jobName: string): Promise<void> {
    const config = this.cronJobs.get(jobName);
    if (!config || !config.enabled) {
      return;
    }

    // Stop existing interval if running
    await this.stopCronJob(jobName);

    // Parse cron expression and calculate interval
    const intervalMs = this.parseCronExpression(config.schedule);

    if (intervalMs <= 0) {
      console.error(
        `Invalid cron schedule for job ${jobName}: ${config.schedule}`
      );
      return;
    }

    // Calculate next run time
    config.nextRun = new Date(Date.now() + intervalMs);

    // Start the interval
    const interval = setInterval(async () => {
      await this.executeCronJob(jobName);
    }, intervalMs);

    this.cronIntervals.set(jobName, interval);
    console.log(`Started cron job: ${jobName} with ${intervalMs}ms interval`);
  }

  private async stopCronJob(jobName: string): Promise<void> {
    const interval = this.cronIntervals.get(jobName);
    if (interval) {
      clearInterval(interval);
      this.cronIntervals.delete(jobName);
      console.log(`Stopped cron job: ${jobName}`);
    }
  }

  private async executeCronJob(jobName: string): Promise<void> {
    const config = this.cronJobs.get(jobName);
    if (!config) {
      return;
    }

    const startTime = new Date();
    let result: CronJobResult;

    try {
      console.log(`Executing cron job: ${jobName}`);

      // Update job status
      config.lastRun = startTime;
      config.runCount++;

      // Execute the specific job logic
      const metricsProcessed = await this.executeJobLogic(jobName);

      const endTime = new Date();
      result = {
        jobName,
        success: true,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        metricsProcessed,
      };

      console.log(
        `Cron job ${jobName} completed successfully in ${result.duration}ms`
      );
    } catch (error) {
      const endTime = new Date();
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';

      config.errorCount++;

      result = {
        jobName,
        success: false,
        startTime,
        endTime,
        duration: endTime.getTime() - startTime.getTime(),
        error: errorMessage,
      };

      console.error(`Cron job ${jobName} failed:`, error);
    }

    // Save job result to history
    await this.saveJobResult(result);

    // Update job configuration
    await this.saveJobConfiguration(jobName, config);
  }

  private async executeJobLogic(jobName: string): Promise<number> {
    switch (jobName) {
      case 'metrics_collection':
        return await this.executeMetricsCollection();

      case 'metrics_validation':
        return await this.executeMetricsValidation();

      case 'cache_cleanup':
        return await this.executeCacheCleanup();

      case 'health_check':
        return await this.executeHealthCheck();

      default:
        throw new Error(`Unknown cron job: ${jobName}`);
    }
  }

  private async executeMetricsCollection(): Promise<number> {
    // Get all due jobs from scheduler
    const dueJobs = await this.scheduler.getDueJobs();

    if (dueJobs.length === 0) {
      return 0;
    }

    console.log(`Processing ${dueJobs.length} due metrics collection jobs`);

    let processedCount = 0;
    const batchSize = 5; // Process in small batches to avoid overwhelming APIs

    for (let i = 0; i < dueJobs.length; i += batchSize) {
      const batch = dueJobs.slice(i, i + batchSize);

      const promises = batch.map(async job => {
        try {
          const result = await this.worker.collectMetricsNow(
            job.userId,
            job.platform,
            job.postId,
            job.campaignId
          );

          if (result.success) {
            processedCount++;
          }

          return result;
        } catch (error) {
          console.error(`Failed to collect metrics for job ${job.id}:`, error);
          return null;
        }
      });

      await Promise.allSettled(promises);

      // Small delay between batches to be respectful to APIs
      if (i + batchSize < dueJobs.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return processedCount;
  }

  private async executeMetricsValidation(): Promise<number> {
    // This could validate cached metrics for consistency
    // For now, return 0 as placeholder
    return 0;
  }

  private async executeCacheCleanup(): Promise<number> {
    try {
      // Clean up expired cache entries
      const patterns = ['processed_metrics:*', 'metrics_job:*', 'rate_limit:*'];

      let cleanedCount = 0;

      for (const pattern of patterns) {
        const keys = await this.cache.keys(pattern);

        for (const key of keys) {
          const ttl = await this.cache.ttl(key);

          // Remove keys that are expired or have no TTL set
          if (ttl === -1 || ttl === 0) {
            await this.cache.del(key);
            cleanedCount++;
          }
        }
      }

      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
      return cleanedCount;
    } catch (error) {
      console.error('Cache cleanup failed:', error);
      return 0;
    }
  }

  private async executeHealthCheck(): Promise<number> {
    try {
      // Check worker status
      const workerStatus = await this.worker.getWorkerStatus();

      // Check scheduler status
      const schedulerStatus = await this.scheduler.getStatus();

      // Log health status
      console.log('Health Check Results:', {
        worker: {
          isRunning: workerStatus.isRunning,
          processedJobs: workerStatus.processedJobs,
          failedJobs: workerStatus.failedJobs,
          currentLoad: workerStatus.currentLoad,
        },
        scheduler: {
          isRunning: schedulerStatus.isRunning,
          queueSize: schedulerStatus.queueSize,
          processingRate: schedulerStatus.processingRate,
        },
      });

      return 1; // Health check completed
    } catch (error) {
      console.error('Health check failed:', error);
      throw error;
    }
  }

  private parseCronExpression(schedule: string): number {
    // Simple cron parser for basic expressions
    // For production, consider using a proper cron library like 'node-cron'

    switch (schedule) {
      case '* * * * *': // Every minute
        return 60 * 1000;

      case '*/5 * * * *': // Every 5 minutes
        return 5 * 60 * 1000;

      case '*/15 * * * *': // Every 15 minutes
        return 15 * 60 * 1000;

      case '0 * * * *': // Every hour
        return 60 * 60 * 1000;

      case '0 0 * * *': // Every day at midnight
        return 24 * 60 * 60 * 1000;

      default:
        console.warn(
          `Unsupported cron expression: ${schedule}, defaulting to 1 minute`
        );
        return 60 * 1000;
    }
  }

  private initializeDefaultJobs(): void {
    // Main metrics collection job - runs every minute
    this.cronJobs.set('metrics_collection', {
      name: 'metrics_collection',
      schedule: '* * * * *', // Every minute
      enabled: true,
      description:
        'Collect metrics from social media APIs for all active tracking jobs',
      runCount: 0,
      errorCount: 0,
    });

    // Cache cleanup job - runs every hour
    this.cronJobs.set('cache_cleanup', {
      name: 'cache_cleanup',
      schedule: '0 * * * *', // Every hour
      enabled: true,
      description:
        'Clean up expired cache entries and optimize Redis memory usage',
      runCount: 0,
      errorCount: 0,
    });

    // Health check job - runs every 5 minutes
    this.cronJobs.set('health_check', {
      name: 'health_check',
      schedule: '*/5 * * * *', // Every 5 minutes
      enabled: true,
      description: 'Check system health and log status information',
      runCount: 0,
      errorCount: 0,
    });
  }

  private async loadJobConfigurations(): Promise<void> {
    try {
      const configKeys = await this.cache.keys('cron_config:*');

      for (const key of configKeys) {
        const config = await this.cache.get<CronJobConfig>(key);
        if (config) {
          this.cronJobs.set(config.name, config);
        }
      }

      console.log(`Loaded ${configKeys.length} cron job configurations`);
    } catch (error) {
      console.error('Failed to load cron job configurations:', error);
    }
  }

  private async saveJobConfigurations(): Promise<void> {
    try {
      for (const [jobName, config] of this.cronJobs.entries()) {
        await this.saveJobConfiguration(jobName, config);
      }
    } catch (error) {
      console.error('Failed to save cron job configurations:', error);
    }
  }

  private async saveJobConfiguration(
    jobName: string,
    config: CronJobConfig
  ): Promise<void> {
    try {
      const configKey = `cron_config:${jobName}`;
      await this.cache.set(configKey, config, { ttl: 24 * 60 * 60 }); // 24 hours
    } catch (error) {
      console.error(`Failed to save configuration for job ${jobName}:`, error);
    }
  }

  private async removeJobConfiguration(jobName: string): Promise<void> {
    try {
      const configKey = `cron_config:${jobName}`;
      await this.cache.del(configKey);
    } catch (error) {
      console.error(
        `Failed to remove configuration for job ${jobName}:`,
        error
      );
    }
  }

  private async saveJobResult(result: CronJobResult): Promise<void> {
    try {
      const historyKey = `cron_history:${result.jobName}`;
      const history = (await this.cache.get<CronJobResult[]>(historyKey)) || [];

      history.push(result);

      // Keep only last 100 results
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      await this.cache.set(historyKey, history, { ttl: 7 * 24 * 60 * 60 }); // 7 days
    } catch (error) {
      console.error(`Failed to save job result for ${result.jobName}:`, error);
    }
  }
}
