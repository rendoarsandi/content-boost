import { SocialMediaMetrics, SocialPlatform } from '../social-media-api';

export interface MetricsCollectionJob {
  id: string;
  userId: string;
  platform: SocialPlatform;
  postId: string;
  campaignId: string;
  trackingStartTime: Date;
  lastCollected?: Date;
  isActive: boolean;
  priority: 'low' | 'medium' | 'high';
  retryCount: number;
  maxRetries: number;
  nextCollectionTime: Date;
}

export interface MetricsCollectionResult {
  jobId: string;
  success: boolean;
  metrics?: ProcessedMetrics;
  error?: string;
  collectedAt: Date;
  processingTime: number;
  rateLimited: boolean;
  retryAfter?: number;
}

export interface MetricsCollectionConfig {
  collectionInterval: number; // in milliseconds
  batchSize: number;
  maxConcurrentJobs: number;
  retryConfig: {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffFactor: number;
  };
  cacheConfig: {
    enabled: boolean;
    ttl: number;
    keyPrefix: string;
  };
  validationConfig: {
    enabled: boolean;
    rules: ValidationRule[];
  };
  normalizationConfig: {
    enabled: boolean;
    rules: NormalizationRule[];
  };
}

export interface MetricsCollectionStatus {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  rateLimitedJobs: number;
  averageProcessingTime: number;
  lastCollectionTime?: Date;
  nextCollectionTime?: Date;
}

export interface CollectionSchedule {
  jobId: string;
  scheduledTime: Date;
  priority: 'low' | 'medium' | 'high';
  estimatedDuration: number;
}

export interface DataPipelineConfig {
  stages: PipelineStage[];
  parallelProcessing: boolean;
  errorHandling: 'stop' | 'continue' | 'retry';
  outputFormat: 'raw' | 'normalized' | 'aggregated';
}

export interface PipelineStage {
  name: string;
  processor: (data: any) => Promise<any>;
  enabled: boolean;
  order: number;
}

export interface ValidationRule {
  name: string;
  field: string;
  validator: (value: any) => boolean;
  errorMessage: string;
  severity: 'warning' | 'error';
}

export interface NormalizationRule {
  name: string;
  field: string;
  normalizer: (value: any) => any;
  enabled: boolean;
}

export interface ProcessedMetrics extends SocialMediaMetrics {
  processed: {
    validationResults: ValidationResult[];
    normalizationApplied: string[];
    qualityScore: number;
    anomalyDetected: boolean;
    processingTimestamp: Date;
  };
  raw: {
    originalMetrics: any;
    apiResponse: any;
    collectionMetadata: {
      collectionTime: Date;
      processingTime: number;
      retryCount: number;
    };
  };
}

export interface ValidationResult {
  rule: string;
  field: string;
  passed: boolean;
  value: any;
  message?: string;
  severity: 'info' | 'warning' | 'error';
}

export interface MetricsCollectionStats {
  period: {
    start: Date;
    end: Date;
  };
  collections: {
    total: number;
    successful: number;
    failed: number;
    rateLimited: number;
  };
  performance: {
    averageProcessingTime: number;
    minProcessingTime: number;
    maxProcessingTime: number;
    totalProcessingTime: number;
  };
  platforms: Record<SocialPlatform, {
    collections: number;
    successRate: number;
    averageProcessingTime: number;
  }>;
  errors: Array<{
    error: string;
    count: number;
    lastOccurrence: Date;
  }>;
}

export interface WorkerStatus {
  isRunning: boolean;
  startTime?: Date;
  lastActivity?: Date;
  processedJobs: number;
  failedJobs: number;
  currentLoad: number;
  maxLoad: number;
}

export interface SchedulerStatus {
  isRunning: boolean;
  nextScheduledJob?: CollectionSchedule;
  queueSize: number;
  processingRate: number; // jobs per minute
  averageWaitTime: number;
}

export interface CronJobConfig {
  name: string;
  schedule: string; // Cron expression
  enabled: boolean;
  description?: string;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  errorCount: number;
}

export interface CronJobResult {
  jobName: string;
  success: boolean;
  startTime: Date;
  endTime: Date;
  duration: number;
  error?: string;
  metricsProcessed?: number;
}