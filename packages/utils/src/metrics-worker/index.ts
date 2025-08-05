import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from '../social-media-api';
import {
  BackgroundServiceConfig,
  MetricsBackgroundService,
} from './background-service';
import { MetricsCollectionConfig, MetricsCollectionWorker } from './worker';
import { DataPipelineConfig, MetricsDataPipeline } from './data-pipeline';

// Main background service
export { MetricsBackgroundService } from './background-service';
export type { BackgroundServiceStatus } from './background-service';

// Core worker components
export { MetricsCollectionWorker } from './worker';
export { MetricsCollectionScheduler } from './scheduler';
export { MetricsCronScheduler } from './cron-scheduler';
export { MetricsDataPipeline } from './data-pipeline';

// Data processing components
export { MetricsValidator } from './validator';
export { MetricsNormalizer } from './normalizer';

// Types
export type {
  MetricsCollectionJob,
  MetricsCollectionResult,
  MetricsCollectionConfig,
  MetricsCollectionStatus,
  MetricsCollectionStats,
  CollectionSchedule,
  DataPipelineConfig,
  PipelineStage,
  ValidationRule,
  ValidationResult,
  NormalizationRule,
  ProcessedMetrics,
  WorkerStatus,
  SchedulerStatus,
  CronJobConfig,
  CronJobResult,
} from './types';

// Constants
export {
  DEFAULT_COLLECTION_CONFIG,
  COLLECTION_INTERVALS,
  VALIDATION_RULES,
  NORMALIZATION_RULES,
  JOB_PRIORITIES,
  WORKER_STATES,
  PIPELINE_STAGES,
  ERROR_TYPES,
} from './constants';

// Utility function to create a configured background service
export function createMetricsBackgroundService(
  cache: RedisCache,
  apiManager: SocialMediaAPIManager,
  config?: Partial<BackgroundServiceConfig>
): MetricsBackgroundService {
  return new MetricsBackgroundService(cache, apiManager, config);
}

// Utility function to create a standalone worker
export function createMetricsWorker(
  cache: RedisCache,
  apiManager: SocialMediaAPIManager,
  config?: Partial<MetricsCollectionConfig>
): MetricsCollectionWorker {
  return new MetricsCollectionWorker(cache, apiManager, config);
}

// Utility function to create a data pipeline
export function createDataPipeline(
  cache: RedisCache,
  config?: Partial<DataPipelineConfig>
): MetricsDataPipeline {
  return new MetricsDataPipeline(cache, config);
}
