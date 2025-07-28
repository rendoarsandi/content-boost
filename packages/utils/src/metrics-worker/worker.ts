import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from '../social-media-api';
import { MetricsCollectionScheduler } from './scheduler';
import { MetricsDataPipeline } from './data-pipeline';
import { 
  MetricsCollectionJob, 
  MetricsCollectionResult, 
  MetricsCollectionConfig,
  WorkerStatus,
  MetricsCollectionStats,
  ProcessedMetrics
} from './types';
import { DEFAULT_COLLECTION_CONFIG, WORKER_STATES } from './constants';

export type { 
  MetricsCollectionJob, 
  MetricsCollectionResult, 
  MetricsCollectionConfig,
  WorkerStatus,
  MetricsCollectionStats,
  ProcessedMetrics
};

export class MetricsCollectionWorker {
  private cache: RedisCache;
  private apiManager: SocialMediaAPIManager;
  private scheduler: MetricsCollectionScheduler;
  private dataPipeline: MetricsDataPipeline;
  private config: MetricsCollectionConfig;
  private status: WorkerStatus;
  private workerInterval?: NodeJS.Timeout;
  private stats: MetricsCollectionStats;

  constructor(
    cache: RedisCache,
    apiManager: SocialMediaAPIManager,
    config?: Partial<MetricsCollectionConfig>
  ) {
    this.cache = cache;
    this.apiManager = apiManager;
    this.config = { ...DEFAULT_COLLECTION_CONFIG, ...config };
    
    this.scheduler = new MetricsCollectionScheduler(cache, config);
    this.dataPipeline = new MetricsDataPipeline(cache);
    
    this.status = {
      isRunning: false,
      processedJobs: 0,
      failedJobs: 0,
      currentLoad: 0,
      maxLoad: this.config.maxConcurrentJobs
    };

    this.stats = this.initializeStats();
  }

  async start(): Promise<void> {
    if (this.status.isRunning) {
      console.warn('Metrics collection worker is already running');
      return;
    }

    console.log('Starting metrics collection worker...');
    
    this.status.isRunning = true;
    this.status.startTime = new Date();
    this.status.lastActivity = new Date();
    
    // Start the scheduler
    await this.scheduler.start();
    
    // Start the worker loop
    this.workerInterval = setInterval(
      () => this.processJobs(),
      this.config.collectionInterval
    );

    console.log('Metrics collection worker started');
  }

  async stop(): Promise<void> {
    if (!this.status.isRunning) {
      console.warn('Metrics collection worker is not running');
      return;
    }

    console.log('Stopping metrics collection worker...');
    
    this.status.isRunning = false;
    
    // Stop the worker loop
    if (this.workerInterval) {
      clearInterval(this.workerInterval);
      this.workerInterval = undefined;
    }
    
    // Stop the scheduler
    await this.scheduler.stop();
    
    console.log('Metrics collection worker stopped');
  }

  async scheduleCollection(
    userId: string,
    platform: 'tiktok' | 'instagram',
    postId: string,
    campaignId: string,
    options?: {
      priority?: 'low' | 'medium' | 'high';
      maxRetries?: number;
    }
  ): Promise<string> {
    const job: Omit<MetricsCollectionJob, 'id' | 'nextCollectionTime'> = {
      userId,
      platform,
      postId,
      campaignId,
      trackingStartTime: new Date(),
      isActive: true,
      priority: options?.priority || 'medium',
      retryCount: 0,
      maxRetries: options?.maxRetries || this.config.retryConfig.maxRetries
    };

    return await this.scheduler.scheduleJob(job);
  }

  async unscheduleCollection(jobId: string): Promise<boolean> {
    return await this.scheduler.unscheduleJob(jobId);
  }

  async collectMetricsNow(
    userId: string,
    platform: 'tiktok' | 'instagram',
    postId: string,
    campaignId: string
  ): Promise<MetricsCollectionResult> {
    const startTime = Date.now();
    
    try {
      console.log(`Collecting metrics for user ${userId}, post ${postId} on ${platform}`);
      
      // Collect raw metrics from API
      // TODO: Access token management needed here
      const rawMetrics = await this.apiManager.getMetrics(
        platform,
        'dummy-access-token', // Placeholder for access token
        postId,
        userId
      );

      // Process metrics through data pipeline
      const processedMetrics = await this.dataPipeline.processMetrics(
        rawMetrics
      );

      // Cache the processed metrics
      await this.cacheProcessedMetrics(userId, campaignId, postId, processedMetrics);

      // Update statistics
      this.updateStats(true, Date.now() - startTime, platform);

      return {
        jobId: `manual:${userId}:${platform}:${postId}:${campaignId}`,
        success: true,
        metrics: processedMetrics,
        collectedAt: new Date(),
        processingTime: Date.now() - startTime,
        rateLimited: false
      };

    } catch (error) {
      console.error('Manual metrics collection failed:', error);
      
      this.updateStats(false, Date.now() - startTime, platform);
      
      return {
        jobId: `manual:${userId}:${platform}:${postId}:${campaignId}`,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        collectedAt: new Date(),
        processingTime: Date.now() - startTime,
        rateLimited: false
      };
    }
  }

  async getWorkerStatus(): Promise<WorkerStatus> {
    return { ...this.status };
  }

  async getCollectionStats(): Promise<MetricsCollectionStats> {
    return { ...this.stats };
  }

  async getScheduledJobs(): Promise<MetricsCollectionJob[]> {
    return await this.scheduler.getAllJobs();
  }

  async getJobsByUser(userId: string): Promise<MetricsCollectionJob[]> {
    return await this.scheduler.getJobsByUser(userId);
  }

  async getJobsByCampaign(campaignId: string): Promise<MetricsCollectionJob[]> {
    return await this.scheduler.getJobsByCampaign(campaignId);
  }

  async pauseJob(jobId: string): Promise<boolean> {
    return await this.scheduler.updateJob(jobId, { isActive: false });
  }

  async resumeJob(jobId: string): Promise<boolean> {
    return await this.scheduler.updateJob(jobId, { isActive: true });
  }

  async updateJobPriority(jobId: string, priority: 'low' | 'medium' | 'high'): Promise<boolean> {
    return await this.scheduler.updateJob(jobId, { priority });
  }

  private async processJobs(): Promise<void> {
    if (!this.status.isRunning) return;

    try {
      const dueJobs = await this.scheduler.getDueJobs();
      
      if (dueJobs.length === 0) {
        return;
      }

      // Respect concurrency limits
      const availableSlots = this.config.maxConcurrentJobs - this.status.currentLoad;
      const jobsToProcess = dueJobs.slice(0, Math.min(availableSlots, this.config.batchSize));

      console.log(`Processing ${jobsToProcess.length} metrics collection jobs`);

      // Process jobs concurrently
      const processingPromises = jobsToProcess.map(job => this.processJob(job));
      await Promise.allSettled(processingPromises);

      this.status.lastActivity = new Date();

    } catch (error) {
      console.error('Error processing jobs:', error);
    }
  }

  private async processJob(job: MetricsCollectionJob): Promise<void> {
    const startTime = Date.now();
    this.status.currentLoad++;

    try {
      console.log(`Processing job ${job.id}`);

      // Collect metrics
      const result = await this.collectMetricsNow(
        job.userId,
        job.platform,
        job.postId,
        job.campaignId
      );

      if (result.success) {
        this.status.processedJobs++;
        
        // Reset retry count on success
        await this.scheduler.updateJob(job.id, { 
          retryCount: 0,
          lastCollected: new Date()
        });
        
        console.log(`Job ${job.id} completed successfully`);
      } else {
        throw new Error(result.error || 'Unknown error');
      }

    } catch (error) {
      console.error(`Job ${job.id} failed:`, error);
      
      this.status.failedJobs++;
      
      // Handle retry logic
      const newRetryCount = job.retryCount + 1;
      
      if (newRetryCount >= job.maxRetries) {
        console.error(`Job ${job.id} exceeded max retries, deactivating`);
        await this.scheduler.updateJob(job.id, { 
          isActive: false,
          retryCount: newRetryCount
        });
      } else {
        await this.scheduler.updateJob(job.id, { 
          retryCount: newRetryCount
        });
      }

      this.updateStats(false, Date.now() - startTime, job.platform);
    } finally {
      this.status.currentLoad--;
    }
  }

  private async cacheProcessedMetrics(userId: string, campaignId: string, postId: string, metrics: ProcessedMetrics): Promise<void> {
    try {
      const cacheKey = `processed_metrics:${userId}:${campaignId}:${postId}`;
      await this.cache.set(cacheKey, metrics, { ttl: this.config.cacheConfig.ttl });
    } catch (error) {
      console.error('Failed to cache processed metrics:', error);
    }
  }

  private updateStats(success: boolean, processingTime: number, platform: 'tiktok' | 'instagram'): void {
    this.stats.collections.total++;
    
    if (success) {
      this.stats.collections.successful++;
    } else {
      this.stats.collections.failed++;
    }

    // Update performance stats
    this.stats.performance.totalProcessingTime += processingTime;
    this.stats.performance.averageProcessingTime = 
      this.stats.performance.totalProcessingTime / this.stats.collections.total;
    
    if (processingTime < this.stats.performance.minProcessingTime || this.stats.performance.minProcessingTime === 0) {
      this.stats.performance.minProcessingTime = processingTime;
    }
    
    if (processingTime > this.stats.performance.maxProcessingTime) {
      this.stats.performance.maxProcessingTime = processingTime;
    }

    // Update platform stats
    if (!this.stats.platforms[platform]) {
      this.stats.platforms[platform] = {
        collections: 0,
        successRate: 0,
        averageProcessingTime: 0
      };
    }

    this.stats.platforms[platform].collections++;
    this.stats.platforms[platform].successRate = success ? 
      ((this.stats.platforms[platform].successRate * (this.stats.platforms[platform].collections - 1)) + 1) / this.stats.platforms[platform].collections :
      (this.stats.platforms[platform].successRate * (this.stats.platforms[platform].collections - 1)) / this.stats.platforms[platform].collections;
    
    this.stats.platforms[platform].averageProcessingTime = 
      ((this.stats.platforms[platform].averageProcessingTime * (this.stats.platforms[platform].collections - 1)) + processingTime) / this.stats.platforms[platform].collections;
  }

  private initializeStats(): MetricsCollectionStats {
    return {
      period: {
        start: new Date(),
        end: new Date()
      },
      collections: {
        total: 0,
        successful: 0,
        failed: 0,
        rateLimited: 0
      },
      performance: {
        averageProcessingTime: 0,
        minProcessingTime: 0,
        maxProcessingTime: 0,
        totalProcessingTime: 0
      },
      platforms: {
        tiktok: {
          collections: 0,
          successRate: 0,
          averageProcessingTime: 0
        },
        instagram: {
          collections: 0,
          successRate: 0,
          averageProcessingTime: 0
        }
      },
      errors: []
    };
  }
}