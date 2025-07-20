import { RedisCache } from '@repo/cache';
import { 
  MetricsCollectionJob, 
  CollectionSchedule, 
  SchedulerStatus,
  MetricsCollectionConfig 
} from './types';
import { DEFAULT_COLLECTION_CONFIG, JOB_PRIORITIES } from './constants';

export class MetricsCollectionScheduler {
  private cache: RedisCache;
  private config: MetricsCollectionConfig;
  private isRunning: boolean = false;
  private schedulerInterval?: NodeJS.Timeout;
  private jobQueue: Map<string, MetricsCollectionJob> = new Map();
  private processingQueue: Set<string> = new Set();
  private stats = {
    totalScheduled: 0,
    totalProcessed: 0,
    totalFailed: 0,
    startTime: new Date()
  };

  constructor(cache: RedisCache, config?: Partial<MetricsCollectionConfig>) {
    this.cache = cache;
    this.config = { ...DEFAULT_COLLECTION_CONFIG, ...config };
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      console.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    this.stats.startTime = new Date();
    
    console.log('Starting metrics collection scheduler...');
    
    // Load existing jobs from cache
    await this.loadJobsFromCache();
    
    // Start the scheduler loop
    this.schedulerInterval = setInterval(
      () => this.processScheduledJobs(),
      this.config.collectionInterval
    );

    console.log(`Scheduler started with ${this.config.collectionInterval}ms interval`);
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.warn('Scheduler is not running');
      return;
    }

    console.log('Stopping metrics collection scheduler...');
    
    this.isRunning = false;
    
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = undefined;
    }

    // Wait for current processing to complete
    while (this.processingQueue.size > 0) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Save jobs to cache
    await this.saveJobsToCache();
    
    console.log('Scheduler stopped');
  }

  async scheduleJob(job: Omit<MetricsCollectionJob, 'id' | 'nextCollectionTime'>): Promise<string> {
    const jobId = this.generateJobId(job.userId, job.platform, job.postId, job.campaignId);
    
    const fullJob: MetricsCollectionJob = {
      ...job,
      id: jobId,
      nextCollectionTime: this.calculateNextCollectionTime(job.priority)
    };

    this.jobQueue.set(jobId, fullJob);
    this.stats.totalScheduled++;
    
    // Save to cache for persistence
    await this.saveJobToCache(fullJob);
    
    console.log(`Scheduled job ${jobId} for ${fullJob.nextCollectionTime.toISOString()}`);
    
    return jobId;
  }

  async unscheduleJob(jobId: string): Promise<boolean> {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      return false;
    }

    this.jobQueue.delete(jobId);
    this.processingQueue.delete(jobId);
    
    // Remove from cache
    await this.removeJobFromCache(jobId);
    
    console.log(`Unscheduled job ${jobId}`);
    return true;
  }

  async updateJob(jobId: string, updates: Partial<MetricsCollectionJob>): Promise<boolean> {
    const job = this.jobQueue.get(jobId);
    if (!job) {
      return false;
    }

    const updatedJob = { ...job, ...updates };
    
    // Recalculate next collection time if priority changed
    if (updates.priority && updates.priority !== job.priority) {
      updatedJob.nextCollectionTime = this.calculateNextCollectionTime(updates.priority);
    }

    this.jobQueue.set(jobId, updatedJob);
    await this.saveJobToCache(updatedJob);
    
    return true;
  }

  async getJob(jobId: string): Promise<MetricsCollectionJob | undefined> {
    return this.jobQueue.get(jobId);
  }

  async getAllJobs(): Promise<MetricsCollectionJob[]> {
    return Array.from(this.jobQueue.values());
  }

  async getJobsByUser(userId: string): Promise<MetricsCollectionJob[]> {
    return Array.from(this.jobQueue.values()).filter(job => job.userId === userId);
  }

  async getJobsByCampaign(campaignId: string): Promise<MetricsCollectionJob[]> {
    return Array.from(this.jobQueue.values()).filter(job => job.campaignId === campaignId);
  }

  async getScheduledJobs(limit: number = 10): Promise<CollectionSchedule[]> {
    const now = new Date();
    
    return Array.from(this.jobQueue.values())
      .filter(job => job.isActive && job.nextCollectionTime > now)
      .sort((a, b) => a.nextCollectionTime.getTime() - b.nextCollectionTime.getTime())
      .slice(0, limit)
      .map(job => ({
        jobId: job.id,
        scheduledTime: job.nextCollectionTime,
        priority: job.priority,
        estimatedDuration: this.estimateJobDuration(job)
      }));
  }

  async getDueJobs(): Promise<MetricsCollectionJob[]> {
    const now = new Date();
    
    return Array.from(this.jobQueue.values())
      .filter(job => 
        job.isActive && 
        job.nextCollectionTime <= now &&
        !this.processingQueue.has(job.id)
      )
      .sort((a, b) => this.getPriorityWeight(a.priority) - this.getPriorityWeight(b.priority));
  }

  async getStatus(): Promise<SchedulerStatus> {
    const dueJobs = await this.getDueJobs();
    const scheduledJobs = await this.getScheduledJobs(1);
    
    const totalJobs = this.jobQueue.size;
    const processingTime = Date.now() - this.stats.startTime.getTime();
    const processingRate = processingTime > 0 ? (this.stats.totalProcessed / (processingTime / 60000)) : 0;
    
    return {
      isRunning: this.isRunning,
      nextScheduledJob: scheduledJobs[0],
      queueSize: totalJobs,
      processingRate,
      averageWaitTime: this.calculateAverageWaitTime()
    };
  }

  private async processScheduledJobs(): Promise<void> {
    if (!this.isRunning) return;

    try {
      const dueJobs = await this.getDueJobs();
      
      if (dueJobs.length === 0) {
        return;
      }

      console.log(`Processing ${dueJobs.length} due jobs`);
      
      // Process jobs in batches to respect concurrency limits
      const batchSize = Math.min(
        this.config.maxConcurrentJobs - this.processingQueue.size,
        this.config.batchSize
      );
      
      const jobsToProcess = dueJobs.slice(0, batchSize);
      
      for (const job of jobsToProcess) {
        this.processingQueue.add(job.id);
        
        // Process job asynchronously
        this.processJob(job).finally(() => {
          this.processingQueue.delete(job.id);
        });
      }
      
    } catch (error) {
      console.error('Error processing scheduled jobs:', error);
    }
  }

  private async processJob(job: MetricsCollectionJob): Promise<void> {
    try {
      console.log(`Processing job ${job.id} for user ${job.userId}, post ${job.postId}`);
      
      // Update job status
      job.lastCollected = new Date();
      job.nextCollectionTime = this.calculateNextCollectionTime(job.priority);
      
      // Save updated job
      await this.saveJobToCache(job);
      
      this.stats.totalProcessed++;
      
    } catch (error) {
      console.error(`Job ${job.id} processing failed:`, error);
      
      // Handle retry logic
      job.retryCount++;
      
      if (job.retryCount >= job.maxRetries) {
        console.error(`Job ${job.id} exceeded max retries, deactivating`);
        job.isActive = false;
      } else {
        // Schedule retry with exponential backoff
        const retryDelay = Math.min(
          this.config.retryConfig.baseDelay * Math.pow(this.config.retryConfig.backoffFactor, job.retryCount),
          this.config.retryConfig.maxDelay
        );
        
        job.nextCollectionTime = new Date(Date.now() + retryDelay);
        console.log(`Job ${job.id} scheduled for retry in ${retryDelay}ms`);
      }
      
      await this.saveJobToCache(job);
      this.stats.totalFailed++;
    }
  }

  private calculateNextCollectionTime(priority: 'low' | 'medium' | 'high'): Date {
    let interval = this.config.collectionInterval;
    
    // Adjust interval based on priority
    switch (priority) {
      case 'high':
        interval = interval * 0.5; // More frequent for high priority
        break;
      case 'medium':
        interval = interval * 1; // Normal interval
        break;
      case 'low':
        interval = interval * 2; // Less frequent for low priority
        break;
    }
    
    return new Date(Date.now() + interval);
  }

  private getPriorityWeight(priority: 'low' | 'medium' | 'high'): number {
    switch (priority) {
      case 'high': return 1;
      case 'medium': return 2;
      case 'low': return 3;
      default: return 2;
    }
  }

  private estimateJobDuration(job: MetricsCollectionJob): number {
    // Basic estimation - could be enhanced with historical data
    return 5000; // 5 seconds
  }

  private calculateAverageWaitTime(): number {
    // Calculate based on queue size and processing rate
    const queueSize = this.jobQueue.size;
    const processingTime = Date.now() - this.stats.startTime.getTime();
    const processingRate = processingTime > 0 ? (this.stats.totalProcessed / (processingTime / 1000)) : 0;
    
    return processingRate > 0 ? (queueSize / processingRate) * 1000 : 0;
  }

  private generateJobId(userId: string, platform: string, postId: string, campaignId: string): string {
    return `${userId}:${platform}:${postId}:${campaignId}`;
  }

  private async loadJobsFromCache(): Promise<void> {
    try {
      const jobKeys = await this.cache.keys('metrics_job:*');
      
      for (const key of jobKeys) {
        const job = await this.cache.get<MetricsCollectionJob>(key);
        if (job) {
          this.jobQueue.set(job.id, job);
        }
      }
      
      console.log(`Loaded ${this.jobQueue.size} jobs from cache`);
    } catch (error) {
      console.error('Failed to load jobs from cache:', error);
    }
  }

  private async saveJobsToCache(): Promise<void> {
    try {
      for (const job of this.jobQueue.values()) {
        await this.saveJobToCache(job);
      }
    } catch (error) {
      console.error('Failed to save jobs to cache:', error);
    }
  }

  private async saveJobToCache(job: MetricsCollectionJob): Promise<void> {
    try {
      const cacheKey = `metrics_job:${job.id}`;
      await this.cache.set(cacheKey, job, { ttl: 24 * 60 * 60 }); // 24 hours
    } catch (error) {
      console.error(`Failed to save job ${job.id} to cache:`, error);
    }
  }

  private async removeJobFromCache(jobId: string): Promise<void> {
    try {
      const cacheKey = `metrics_job:${jobId}`;
      await this.cache.del(cacheKey);
    } catch (error) {
      console.error(`Failed to remove job ${jobId} from cache:`, error);
    }
  }
}