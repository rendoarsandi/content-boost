import { RedisCache } from '@repo/cache';
import {
  SocialMediaAPIManager,
  SocialMediaMetrics,
  APIError,
} from './social-media-api';
import { SocialTokenManager, SocialToken } from './social-token-manager';

// Metrics Collection Types
export interface MetricsCollectionJob {
  id: string;
  promoterId: string;
  campaignId: string;
  platform: 'tiktok' | 'instagram';
  postId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  scheduledAt: Date;
  processedAt?: Date;
  retryCount: number;
  maxRetries: number;
  error?: string;
}

export interface ProcessedMetrics extends SocialMediaMetrics {
  promoterId: string;
  campaignId: string;
  platform: 'tiktok' | 'instagram';
  postId: string;
  isValid: boolean;
  validationErrors: string[];
  previousMetrics?: SocialMediaMetrics;
  deltaMetrics?: {
    viewsDelta: number;
    likesDelta: number;
    commentsDelta: number;
    sharesDelta: number;
  };
  customMetrics?: Record<string, any>;
}

export interface MetricsValidationRule {
  name: string;
  validate: (
    current: SocialMediaMetrics,
    previous?: SocialMediaMetrics
  ) => {
    isValid: boolean;
    error?: string;
  };
}

export interface MetricsCollectionConfig {
  collectionInterval: number; // in milliseconds (default: 60000 = 1 minute)
  batchSize: number; // number of jobs to process in parallel
  retryDelay: number; // delay between retries in milliseconds
  maxRetries: number; // maximum number of retries per job
  validationRules: MetricsValidationRule[];
  cacheSettings: {
    metricsHistoryTTL: number; // TTL for metrics history in seconds
    jobQueueTTL: number; // TTL for job queue in seconds
  };
}

// Default validation rules
export const DEFAULT_VALIDATION_RULES: MetricsValidationRule[] = [
  {
    name: 'non-negative-values',
    validate: current => {
      const negativeFields = [];
      if (current.viewCount < 0) negativeFields.push('viewCount');
      if (current.likeCount < 0) negativeFields.push('likeCount');
      if (current.commentCount < 0) negativeFields.push('commentCount');
      if (current.shareCount < 0) negativeFields.push('shareCount');

      return {
        isValid: negativeFields.length === 0,
        error:
          negativeFields.length > 0
            ? `Negative values found in: ${negativeFields.join(', ')}`
            : undefined,
      };
    },
  },
  {
    name: 'reasonable-growth',
    validate: (current, previous) => {
      if (!previous) return { isValid: true };

      const viewGrowth = current.viewCount - previous.viewCount;
      const likeGrowth = current.likeCount - previous.likeCount;
      const commentGrowth = current.commentCount - previous.commentCount;

      // Flag if views decreased (should not happen normally)
      if (viewGrowth < 0) {
        return {
          isValid: false,
          error: `View count decreased from ${previous.viewCount} to ${current.viewCount}`,
        };
      }

      // Flag if engagement decreased significantly while views increased
      if (viewGrowth > 100 && (likeGrowth < 0 || commentGrowth < 0)) {
        return {
          isValid: false,
          error: `Suspicious pattern: views increased by ${viewGrowth} but engagement decreased`,
        };
      }

      return { isValid: true };
    },
  },
  {
    name: 'engagement-ratio',
    validate: current => {
      if (current.viewCount === 0) return { isValid: true };

      const likeRatio = current.likeCount / current.viewCount;
      const commentRatio = current.commentCount / current.viewCount;

      // Flag if engagement ratios are suspiciously low (potential bot views)
      if (
        current.viewCount > 1000 &&
        likeRatio < 0.001 &&
        commentRatio < 0.0001
      ) {
        return {
          isValid: false,
          error: `Suspiciously low engagement ratio: ${likeRatio.toFixed(4)} likes/view, ${commentRatio.toFixed(6)} comments/view`,
        };
      }

      return { isValid: true };
    },
  },
];

export const DEFAULT_CONFIG: MetricsCollectionConfig = {
  collectionInterval: 60000, // 1 minute
  batchSize: 10,
  retryDelay: 5000, // 5 seconds
  maxRetries: 3,
  validationRules: DEFAULT_VALIDATION_RULES,
  cacheSettings: {
    metricsHistoryTTL: 7 * 24 * 60 * 60, // 7 days
    jobQueueTTL: 24 * 60 * 60, // 24 hours
  },
};

// Metrics Collector Service
export class MetricsCollector {
  private cache: RedisCache;
  private apiManager: SocialMediaAPIManager;
  private tokenManager: SocialTokenManager;
  private config: MetricsCollectionConfig;
  private isRunning: boolean = false;
  private intervalId?: NodeJS.Timeout;

  constructor(
    cache: RedisCache,
    apiManager: SocialMediaAPIManager,
    tokenManager: SocialTokenManager,
    config: Partial<MetricsCollectionConfig> = {}
  ) {
    this.cache = cache;
    this.apiManager = apiManager;
    this.tokenManager = tokenManager;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Start the metrics collection worker
  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Metrics collector is already running');
      return;
    }

    this.isRunning = true;
    console.log(
      `Starting metrics collector with ${this.config.collectionInterval}ms interval`
    );

    // Run initial collection
    await this.collectMetrics();

    // Schedule recurring collection
    this.intervalId = setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('Error in metrics collection cycle:', error);
      }
    }, this.config.collectionInterval);
  }

  // Stop the metrics collection worker
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Metrics collector is not running');
      return;
    }

    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    console.log('Metrics collector stopped');
  }

  // Add a new metrics collection job
  async addJob(
    job: Omit<
      MetricsCollectionJob,
      'id' | 'status' | 'scheduledAt' | 'retryCount'
    >
  ): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullJob: MetricsCollectionJob = {
      ...job,
      id: jobId,
      status: 'pending',
      scheduledAt: new Date(),
      retryCount: 0,
      maxRetries: job.maxRetries || this.config.maxRetries,
    };

    const jobKey = this.getJobKey(jobId);
    await this.cache.set(jobKey, fullJob, {
      ttl: this.config.cacheSettings.jobQueueTTL,
    });

    // Add to pending jobs queue
    const queueKey = this.getQueueKey('pending');
    await this.addToQueue(queueKey, jobId);

    console.log(
      `Added metrics collection job: ${jobId} for ${job.platform}:${job.postId}`
    );
    return jobId;
  }

  // Main metrics collection cycle
  private async collectMetrics(): Promise<void> {
    console.log('Starting metrics collection cycle...');

    try {
      // Get pending jobs
      const pendingJobs = await this.getPendingJobs();

      if (pendingJobs.length === 0) {
        console.log('No pending metrics collection jobs');
        return;
      }

      console.log(`Processing ${pendingJobs.length} pending jobs`);

      // Process jobs in batches
      const batches = this.chunkArray(pendingJobs, this.config.batchSize);

      for (const batch of batches) {
        await Promise.allSettled(batch.map(job => this.processJob(job)));
      }

      console.log('Metrics collection cycle completed');
    } catch (error) {
      console.error('Error in metrics collection cycle:', error);
    }
  }

  // Process a single metrics collection job
  private async processJob(job: MetricsCollectionJob): Promise<void> {
    try {
      console.log(`Processing job ${job.id}: ${job.platform}:${job.postId}`);

      // Update job status to processing
      await this.updateJobStatus(job.id, 'processing');

      // Get valid token for the user
      const token = await this.tokenManager.getValidToken(
        job.promoterId,
        job.platform
      );

      if (!token) {
        throw new Error(
          `No valid token found for user ${job.promoterId} on ${job.platform}`
        );
      }

      // Collect metrics from API
      const rawMetrics = await this.apiManager.getMetrics(
        job.platform,
        token.accessToken,
        job.postId,
        job.promoterId
      );

      // Get previous metrics for comparison
      const previousMetrics = await this.getPreviousMetrics(
        job.promoterId,
        job.campaignId,
        job.postId
      );

      // Process and validate metrics
      const processedMetrics = await this.processMetrics(
        rawMetrics,
        job,
        previousMetrics
      );

      // Store processed metrics
      await this.storeMetrics(processedMetrics);

      // Update job status to completed
      await this.updateJobStatus(job.id, 'completed', new Date());

      console.log(`Successfully processed job ${job.id}`);
    } catch (error) {
      console.error(`Error processing job ${job.id}:`, error);
      await this.handleJobError(
        job,
        error instanceof Error ? error.message : 'Unknown error'
      );
    }
  }

  // Process and validate raw metrics
  private async processMetrics(
    rawMetrics: SocialMediaMetrics,
    job: MetricsCollectionJob,
    previousMetrics?: SocialMediaMetrics
  ): Promise<ProcessedMetrics> {
    const validationErrors: string[] = [];
    let isValid = true;

    // Run validation rules
    for (const rule of this.config.validationRules) {
      const result = rule.validate(rawMetrics, previousMetrics);
      if (!result.isValid) {
        isValid = false;
        validationErrors.push(`${rule.name}: ${result.error}`);
      }
    }

    // Calculate deltas if previous metrics exist
    let deltaMetrics;
    if (previousMetrics) {
      deltaMetrics = {
        viewsDelta: rawMetrics.viewCount - previousMetrics.viewCount,
        likesDelta: rawMetrics.likeCount - previousMetrics.likeCount,
        commentsDelta: rawMetrics.commentCount - previousMetrics.commentCount,
        sharesDelta: rawMetrics.shareCount - previousMetrics.shareCount,
      };
    }

    const processedMetrics: ProcessedMetrics = {
      ...rawMetrics,
      promoterId: job.promoterId,
      campaignId: job.campaignId,
      platform: job.platform,
      postId: job.postId,
      isValid,
      validationErrors,
      previousMetrics,
      deltaMetrics,
    };

    return processedMetrics;
  }

  // Store processed metrics in cache and prepare for database storage
  private async storeMetrics(metrics: ProcessedMetrics): Promise<void> {
    // Store current metrics
    const currentKey = this.getMetricsKey(
      metrics.promoterId,
      metrics.campaignId,
      metrics.postId,
      'current'
    );
    await this.cache.set(currentKey, metrics, {
      ttl: this.config.cacheSettings.metricsHistoryTTL,
    });

    // Store in history with timestamp
    const historyKey = this.getMetricsKey(
      metrics.promoterId,
      metrics.campaignId,
      metrics.postId,
      `history_${Date.now()}`
    );
    await this.cache.set(historyKey, metrics, {
      ttl: this.config.cacheSettings.metricsHistoryTTL,
    });

    // Store aggregated metrics for quick access
    const aggregatedKey = this.getAggregatedMetricsKey(
      metrics.promoterId,
      metrics.campaignId
    );
    const existingAggregated =
      (await this.cache.get<Record<string, ProcessedMetrics>>(aggregatedKey)) ||
      {};
    existingAggregated[metrics.postId] = metrics;
    await this.cache.set(aggregatedKey, existingAggregated, {
      ttl: this.config.cacheSettings.metricsHistoryTTL,
    });

    // Add to processing queue for database storage (to be handled by another service)
    const dbQueueKey = this.getQueueKey('database_storage');
    await this.addToQueue(dbQueueKey, JSON.stringify(metrics));

    console.log(
      `Stored metrics for ${metrics.platform}:${metrics.postId} - Views: ${metrics.viewCount}, Valid: ${metrics.isValid}`
    );
  }

  // Get previous metrics for comparison
  private async getPreviousMetrics(
    promoterId: string,
    campaignId: string,
    postId: string
  ): Promise<SocialMediaMetrics | undefined> {
    const currentKey = this.getMetricsKey(
      promoterId,
      campaignId,
      postId,
      'current'
    );
    const previous = await this.cache.get<ProcessedMetrics>(currentKey);
    return previous || undefined;
  }

  // Handle job processing errors
  private async handleJobError(
    job: MetricsCollectionJob,
    error: string
  ): Promise<void> {
    const updatedJob = {
      ...job,
      retryCount: job.retryCount + 1,
      error,
    };

    if (updatedJob.retryCount >= updatedJob.maxRetries) {
      // Max retries reached, mark as failed
      await this.updateJobStatus(job.id, 'failed');
      console.error(
        `Job ${job.id} failed after ${updatedJob.retryCount} retries: ${error}`
      );
    } else {
      // Schedule retry
      await this.scheduleRetry(updatedJob);
      console.warn(
        `Job ${job.id} failed, scheduling retry ${updatedJob.retryCount}/${updatedJob.maxRetries}: ${error}`
      );
    }
  }

  // Schedule job retry
  private async scheduleRetry(job: MetricsCollectionJob): Promise<void> {
    // Update job with retry count and error
    const jobKey = this.getJobKey(job.id);
    await this.cache.set(jobKey, job, {
      ttl: this.config.cacheSettings.jobQueueTTL,
    });

    // Add back to pending queue after delay
    setTimeout(async () => {
      const queueKey = this.getQueueKey('pending');
      await this.addToQueue(queueKey, job.id);
    }, this.config.retryDelay);
  }

  // Get pending jobs from queue
  private async getPendingJobs(): Promise<MetricsCollectionJob[]> {
    const queueKey = this.getQueueKey('pending');
    const jobIds = await this.getFromQueue(queueKey, this.config.batchSize);

    const jobs: MetricsCollectionJob[] = [];
    for (const jobId of jobIds) {
      const jobKey = this.getJobKey(jobId);
      const job = await this.cache.get<MetricsCollectionJob>(jobKey);
      if (job && job.status === 'pending') {
        jobs.push(job);
      }
    }

    return jobs;
  }

  // Update job status
  private async updateJobStatus(
    jobId: string,
    status: MetricsCollectionJob['status'],
    processedAt?: Date
  ): Promise<void> {
    const jobKey = this.getJobKey(jobId);
    const job = await this.cache.get<MetricsCollectionJob>(jobKey);

    if (job) {
      job.status = status;
      if (processedAt) {
        job.processedAt = processedAt;
      }
      await this.cache.set(jobKey, job, {
        ttl: this.config.cacheSettings.jobQueueTTL,
      });
    }
  }

  // Utility methods for cache keys
  private getJobKey(jobId: string): string {
    return this.cache.getKeyManager().custom('metrics-job', jobId);
  }

  private getQueueKey(queueType: string): string {
    return this.cache.getKeyManager().custom('metrics-queue', queueType);
  }

  private getMetricsKey(
    promoterId: string,
    campaignId: string,
    postId: string,
    suffix: string
  ): string {
    return this.cache
      .getKeyManager()
      .custom('metrics', promoterId, campaignId, postId, suffix);
  }

  private getAggregatedMetricsKey(
    promoterId: string,
    campaignId: string
  ): string {
    return this.cache
      .getKeyManager()
      .custom('metrics-aggregated', promoterId, campaignId);
  }

  // Queue operations (simplified Redis list operations)
  private async addToQueue(queueKey: string, item: string): Promise<void> {
    try {
      // Use Redis LPUSH to add to the beginning of the list
      await this.cache['client'].lpush(queueKey, item);
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  }

  private async getFromQueue(
    queueKey: string,
    count: number
  ): Promise<string[]> {
    try {
      // Use Redis RPOP to get items from the end of the list
      const items: string[] = [];
      for (let i = 0; i < count; i++) {
        const item = await this.cache['client'].rpop(queueKey);
        if (item) {
          items.push(item);
        } else {
          break;
        }
      }
      return items;
    } catch (error) {
      console.error('Error getting from queue:', error);
      return [];
    }
  }

  // Utility method to chunk array into batches
  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Public methods for monitoring and management
  async getJobStatus(jobId: string): Promise<MetricsCollectionJob | null> {
    const jobKey = this.getJobKey(jobId);
    return await this.cache.get<MetricsCollectionJob>(jobKey);
  }

  async getQueueStats(): Promise<{
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  }> {
    try {
      const pendingCount = await this.cache['client'].llen(
        this.getQueueKey('pending')
      );
      const dbQueueCount = await this.cache['client'].llen(
        this.getQueueKey('database_storage')
      );

      return {
        pending: pendingCount || 0,
        processing: 0, // Would need to track this separately
        completed: 0, // Would need to track this separately
        failed: 0, // Would need to track this separately
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return { pending: 0, processing: 0, completed: 0, failed: 0 };
    }
  }

  async getMetricsHistory(
    promoterId: string,
    campaignId: string,
    postId: string,
    limit: number = 10
  ): Promise<ProcessedMetrics[]> {
    try {
      const pattern = this.getMetricsKey(
        promoterId,
        campaignId,
        postId,
        'history_*'
      );
      const keys = await this.cache.keys(pattern);

      // Sort keys by timestamp (newest first)
      const sortedKeys = keys
        .map((key: string) => ({
          key,
          timestamp: parseInt(key.split('_').pop() || '0'),
        }))
        .sort(
          (a: { timestamp: number }, b: { timestamp: number }) =>
            b.timestamp - a.timestamp
        )
        .slice(0, limit)
        .map((item: { key: string }) => item.key);

      const metrics: ProcessedMetrics[] = [];
      for (const key of sortedKeys) {
        const metric = await this.cache.get<ProcessedMetrics>(key);
        if (metric) {
          metrics.push(metric);
        }
      }

      return metrics;
    } catch (error) {
      console.error('Error getting metrics history:', error);
      return [];
    }
  }

  async getCurrentMetrics(
    promoterId: string,
    campaignId: string
  ): Promise<Record<string, ProcessedMetrics>> {
    const aggregatedKey = this.getAggregatedMetricsKey(promoterId, campaignId);
    return (
      (await this.cache.get<Record<string, ProcessedMetrics>>(aggregatedKey)) ||
      {}
    );
  }

  // Health check
  isHealthy(): boolean {
    return this.isRunning;
  }

  getConfig(): MetricsCollectionConfig {
    return { ...this.config };
  }
}

// Export factory function
export const createMetricsCollector = (
  cache: RedisCache,
  apiManager: SocialMediaAPIManager,
  tokenManager: SocialTokenManager,
  config?: Partial<MetricsCollectionConfig>
) => {
  return new MetricsCollector(cache, apiManager, tokenManager, config);
};
