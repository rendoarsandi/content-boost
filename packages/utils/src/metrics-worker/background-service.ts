import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from '../social-media-api';
import { MetricsCollectionWorker } from './worker';
import { MetricsCollectionScheduler } from './scheduler';
import { MetricsCronScheduler } from './cron-scheduler';
import { MetricsDataPipeline } from './data-pipeline';
import { MetricsValidator } from './validator';
import { MetricsNormalizer } from './normalizer';
import { 
  MetricsCollectionConfig,
  WorkerStatus,
  SchedulerStatus,
  MetricsCollectionStats,
  CronJobConfig,
  CronJobResult,
  ProcessedMetrics
} from './types';
import { DEFAULT_COLLECTION_CONFIG } from './constants';

export interface BackgroundServiceConfig extends MetricsCollectionConfig {
  enableCronJobs: boolean;
  enableHealthChecks: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  gracefulShutdownTimeout: number;
}

export interface BackgroundServiceStatus {
  isRunning: boolean;
  startTime?: Date;
  uptime?: number;
  components: {
    worker: WorkerStatus;
    scheduler: SchedulerStatus;
    cronJobs: CronJobConfig[];
  };
  stats: MetricsCollectionStats;
  health: {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
  };
}

export class MetricsBackgroundService {
  private cache: RedisCache;
  private apiManager: SocialMediaAPIManager;
  private worker!: MetricsCollectionWorker;
  private scheduler!: MetricsCollectionScheduler;
  private cronScheduler!: MetricsCronScheduler;
  private dataPipeline!: MetricsDataPipeline;
  private validator!: MetricsValidator;
  private normalizer!: MetricsNormalizer;
  private config: BackgroundServiceConfig;
  private isRunning: boolean = false;
  private startTime?: Date;
  private shutdownHandlers: Array<() => Promise<void>> = [];

  constructor(
    cache: RedisCache,
    apiManager: SocialMediaAPIManager,
    config?: Partial<BackgroundServiceConfig>
  ) {
    this.cache = cache;
    this.apiManager = apiManager;
    
    this.config = {
      ...DEFAULT_COLLECTION_CONFIG,
      enableCronJobs: true,
      enableHealthChecks: true,
      logLevel: 'info',
      gracefulShutdownTimeout: 30000, // 30 seconds
      ...config
    };

    this.initializeComponents();
    this.setupShutdownHandlers();
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      this.log('warn', 'Background service is already running');
      return;
    }

    this.log('info', 'Starting metrics background service...');
    this.isRunning = true;
    this.startTime = new Date();

    try {
      // Start components in order
      await this.scheduler.start();
      this.log('info', 'Scheduler started');

      await this.worker.start();
      this.log('info', 'Worker started');

      if (this.config.enableCronJobs) {
        await this.cronScheduler.start();
        this.log('info', 'Cron scheduler started');
      }

      this.log('info', 'Metrics background service started successfully');

      // Log initial status
      if (this.config.logLevel === 'debug') {
        const status = await this.getStatus();
        this.log('debug', 'Initial service status:', status);
      }

    } catch (error) {
      this.log('error', 'Failed to start background service:', error);
      this.isRunning = false;
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      this.log('warn', 'Background service is not running');
      return;
    }

    this.log('info', 'Stopping metrics background service...');
    this.isRunning = false;

    try {
      // Stop components in reverse order
      if (this.config.enableCronJobs) {
        await this.cronScheduler.stop();
        this.log('info', 'Cron scheduler stopped');
      }

      await this.worker.stop();
      this.log('info', 'Worker stopped');

      await this.scheduler.stop();
      this.log('info', 'Scheduler stopped');

      this.log('info', 'Metrics background service stopped successfully');

    } catch (error) {
      this.log('error', 'Error during service shutdown:', error);
      throw error;
    }
  }

  async gracefulShutdown(): Promise<void> {
    this.log('info', 'Initiating graceful shutdown...');

    const shutdownPromise = this.stop();
    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(() => {
        reject(new Error('Graceful shutdown timeout'));
      }, this.config.gracefulShutdownTimeout);
    });

    try {
      await Promise.race([shutdownPromise, timeoutPromise]);
      this.log('info', 'Graceful shutdown completed');
    } catch (error) {
      this.log('error', 'Graceful shutdown failed, forcing stop:', error);
      // Force stop if graceful shutdown fails
      this.isRunning = false;
    }
  }

  async getStatus(): Promise<BackgroundServiceStatus> {
    const workerStatus = await this.worker.getWorkerStatus();
    const schedulerStatus = await this.scheduler.getStatus();
    const cronJobs = this.cronScheduler.getCronJobs();
    const stats = await this.worker.getCollectionStats();
    const health = await this.checkHealth();

    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      uptime: this.startTime ? Date.now() - this.startTime.getTime() : undefined,
      components: {
        worker: workerStatus,
        scheduler: schedulerStatus,
        cronJobs
      },
      stats,
      health
    };
  }

  async checkHealth(): Promise<{ overall: 'healthy' | 'degraded' | 'unhealthy'; issues: string[] }> {
    const issues: string[] = [];

    try {
      // Check if service is running
      if (!this.isRunning) {
        issues.push('Service is not running');
      }

      // Check worker status
      const workerStatus = await this.worker.getWorkerStatus();
      if (!workerStatus.isRunning) {
        issues.push('Worker is not running');
      }

      if (workerStatus.failedJobs > workerStatus.processedJobs * 0.1) {
        issues.push('High failure rate in worker jobs');
      }

      // Check scheduler status
      const schedulerStatus = await this.scheduler.getStatus();
      if (!schedulerStatus.isRunning) {
        issues.push('Scheduler is not running');
      }

      if (schedulerStatus.queueSize > 1000) {
        issues.push('Large queue size in scheduler');
      }

      // Check API manager health
      const apiHealth = await this.apiManager.healthCheck();
      const unhealthyClients = Object.entries(apiHealth)
        .filter(([_, isHealthy]) => !isHealthy);
      
      if (unhealthyClients.length > 0) {
        issues.push(`${unhealthyClients.length} API clients are unhealthy`);
      }

      // Check cache connectivity
      try {
        await this.cache.ping();
      } catch (error) {
        issues.push('Cache connectivity issues');
      }

      // Determine overall health
      let overall: 'healthy' | 'degraded' | 'unhealthy';
      if (issues.length === 0) {
        overall = 'healthy';
      } else if (issues.length <= 2) {
        overall = 'degraded';
      } else {
        overall = 'unhealthy';
      }

      return { overall, issues };

    } catch (error) {
      this.log('error', 'Health check failed:', error);
      return {
        overall: 'unhealthy',
        issues: ['Health check failed', ...(issues.length > 0 ? issues : [])]
      };
    }
  }

  // Convenience methods for common operations
  async scheduleMetricsCollection(
    userId: string,
    platform: 'tiktok' | 'instagram',
    postId: string,
    campaignId: string,
    options?: {
      priority?: 'low' | 'medium' | 'high';
      maxRetries?: number;
    }
  ): Promise<string> {
    return await this.worker.scheduleCollection(userId, platform, postId, campaignId, options);
  }

  async collectMetricsNow(
    userId: string,
    platform: 'tiktok' | 'instagram',
    postId: string,
    campaignId: string
  ): Promise<ProcessedMetrics | null> {
    const result = await this.worker.collectMetricsNow(userId, platform, postId, campaignId);
    return result.success ? result.metrics || null : null;
  }

  async getJobsByUser(userId: string) {
    return await this.worker.getJobsByUser(userId);
  }

  async getJobsByCampaign(campaignId: string) {
    return await this.worker.getJobsByCampaign(campaignId);
  }

  async pauseJob(jobId: string): Promise<boolean> {
    return await this.worker.pauseJob(jobId);
  }

  async resumeJob(jobId: string): Promise<boolean> {
    return await this.worker.resumeJob(jobId);
  }

  async updateJobPriority(jobId: string, priority: 'low' | 'medium' | 'high'): Promise<boolean> {
    return await this.worker.updateJobPriority(jobId, priority);
  }

  // Cron job management
  async addCronJob(config: Omit<CronJobConfig, 'runCount' | 'errorCount'>): Promise<void> {
    return await this.cronScheduler.addCronJob(config);
  }

  async removeCronJob(jobName: string): Promise<boolean> {
    return await this.cronScheduler.removeCronJob(jobName);
  }

  async enableCronJob(jobName: string): Promise<boolean> {
    return await this.cronScheduler.enableCronJob(jobName);
  }

  async disableCronJob(jobName: string): Promise<boolean> {
    return await this.cronScheduler.disableCronJob(jobName);
  }

  getCronJobs(): CronJobConfig[] {
    return this.cronScheduler.getCronJobs();
  }

  // Data pipeline access
  async processMetrics(rawMetrics: any, originalApiResponse?: any): Promise<ProcessedMetrics> {
    return await this.dataPipeline.processMetrics(rawMetrics, originalApiResponse);
  }

  async getCachedMetrics(userId: string, campaignId: string, postId: string): Promise<ProcessedMetrics | null> {
    return await this.dataPipeline.getCachedMetrics(userId, campaignId, postId);
  }

  async clearCache(userId?: string, campaignId?: string): Promise<void> {
    return await this.dataPipeline.clearCache(userId, campaignId);
  }

  // Configuration management
  updateConfig(newConfig: Partial<BackgroundServiceConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.log('info', 'Configuration updated');
  }

  getConfig(): BackgroundServiceConfig {
    return { ...this.config };
  }

  private initializeComponents(): void {
    this.validator = new MetricsValidator();
    this.normalizer = new MetricsNormalizer();
    this.dataPipeline = new MetricsDataPipeline(this.cache, undefined, this.validator, this.normalizer);
    this.scheduler = new MetricsCollectionScheduler(this.cache, this.config);
    this.worker = new MetricsCollectionWorker(this.cache, this.apiManager, this.config);
    this.cronScheduler = new MetricsCronScheduler(this.cache, this.worker, this.scheduler);
  }

  private setupShutdownHandlers(): void {
    // Handle process termination signals
    const signals = ['SIGTERM', 'SIGINT', 'SIGUSR2'];
    
    signals.forEach(signal => {
      process.on(signal, async () => {
        this.log('info', `Received ${signal}, initiating graceful shutdown...`);
        await this.gracefulShutdown();
        process.exit(0);
      });
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', async (error) => {
      this.log('error', 'Uncaught exception:', error);
      await this.gracefulShutdown();
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', async (reason, promise) => {
      this.log('error', 'Unhandled rejection at:', promise, 'reason:', reason);
      await this.gracefulShutdown();
      process.exit(1);
    });
  }

  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string, ...args: any[]): void {
    const levels = { debug: 0, info: 1, warn: 2, error: 3 };
    const configLevel = levels[this.config.logLevel];
    const messageLevel = levels[level];

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      const prefix = `[${timestamp}] [${level.toUpperCase()}] [MetricsBackgroundService]`;
      
      switch (level) {
        case 'debug':
          console.debug(prefix, message, ...args);
          break;
        case 'info':
          console.info(prefix, message, ...args);
          break;
        case 'warn':
          console.warn(prefix, message, ...args);
          break;
        case 'error':
          console.error(prefix, message, ...args);
          break;
      }
    }
  }
}