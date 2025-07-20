import { MetricsCollectionConfig, ValidationRule, NormalizationRule } from './types';

export const DEFAULT_COLLECTION_CONFIG: MetricsCollectionConfig = {
  collectionInterval: 60 * 1000, // 1 minute
  batchSize: 10,
  maxConcurrentJobs: 5,
  retryConfig: {
    maxRetries: 3,
    baseDelay: 5000, // 5 seconds
    maxDelay: 60000, // 1 minute
    backoffFactor: 2
  },
  cacheConfig: {
    enabled: true,
    ttl: 60, // 1 minute
    keyPrefix: 'metrics_collection'
  },
  validationConfig: {
    enabled: true,
    rules: [] // Will be populated with VALIDATION_RULES
  },
  normalizationConfig: {
    enabled: true,
    rules: [] // Will be populated with NORMALIZATION_RULES
  }
};

export const COLLECTION_INTERVALS = {
  REAL_TIME: 60 * 1000, // 1 minute
  FREQUENT: 5 * 60 * 1000, // 5 minutes
  NORMAL: 15 * 60 * 1000, // 15 minutes
  SLOW: 60 * 60 * 1000, // 1 hour
} as const;

export const VALIDATION_RULES: ValidationRule[] = [
  {
    name: 'non_negative_views',
    field: 'metrics.views',
    validator: (value: number) => typeof value === 'number' && value >= 0,
    errorMessage: 'Views count must be a non-negative number',
    severity: 'error'
  },
  {
    name: 'non_negative_likes',
    field: 'metrics.likes',
    validator: (value: number) => typeof value === 'number' && value >= 0,
    errorMessage: 'Likes count must be a non-negative number',
    severity: 'error'
  },
  {
    name: 'non_negative_comments',
    field: 'metrics.comments',
    validator: (value: number) => typeof value === 'number' && value >= 0,
    errorMessage: 'Comments count must be a non-negative number',
    severity: 'error'
  },
  {
    name: 'non_negative_shares',
    field: 'metrics.shares',
    validator: (value: number) => typeof value === 'number' && value >= 0,
    errorMessage: 'Shares count must be a non-negative number',
    severity: 'error'
  },
  {
    name: 'valid_platform',
    field: 'platform',
    validator: (value: string) => ['tiktok', 'instagram'].includes(value),
    errorMessage: 'Platform must be either tiktok or instagram',
    severity: 'error'
  },
  {
    name: 'valid_post_id',
    field: 'postId',
    validator: (value: string) => typeof value === 'string' && value.length > 0,
    errorMessage: 'Post ID must be a non-empty string',
    severity: 'error'
  },
  {
    name: 'valid_user_id',
    field: 'userId',
    validator: (value: string) => typeof value === 'string' && value.length > 0,
    errorMessage: 'User ID must be a non-empty string',
    severity: 'error'
  },
  {
    name: 'valid_campaign_id',
    field: 'campaignId',
    validator: (value: string) => typeof value === 'string' && value.length > 0,
    errorMessage: 'Campaign ID must be a non-empty string',
    severity: 'error'
  },
  {
    name: 'reasonable_engagement_ratio',
    field: 'metrics',
    validator: (metrics: any) => {
      if (metrics.views === 0) return true;
      const engagementRate = (metrics.likes + metrics.comments) / metrics.views;
      return engagementRate <= 1; // Engagement rate shouldn't exceed 100%
    },
    errorMessage: 'Engagement rate seems unreasonably high',
    severity: 'warning'
  },
  {
    name: 'likes_not_exceed_views',
    field: 'metrics',
    validator: (metrics: any) => metrics.likes <= metrics.views,
    errorMessage: 'Likes count should not exceed views count',
    severity: 'warning'
  },
  {
    name: 'comments_reasonable',
    field: 'metrics',
    validator: (metrics: any) => {
      if (metrics.views === 0) return true;
      const commentRate = metrics.comments / metrics.views;
      return commentRate <= 0.1; // Comment rate shouldn't exceed 10%
    },
    errorMessage: 'Comment rate seems unusually high',
    severity: 'warning'
  }
];

export const NORMALIZATION_RULES: NormalizationRule[] = [
  {
    name: 'ensure_integer_metrics',
    field: 'metrics',
    normalizer: (metrics: any) => ({
      views: Math.floor(Number(metrics.views) || 0),
      likes: Math.floor(Number(metrics.likes) || 0),
      comments: Math.floor(Number(metrics.comments) || 0),
      shares: Math.floor(Number(metrics.shares) || 0)
    }),
    enabled: true
  },
  {
    name: 'trim_string_fields',
    field: 'postId',
    normalizer: (value: string) => String(value).trim(),
    enabled: true
  },
  {
    name: 'trim_user_id',
    field: 'userId',
    normalizer: (value: string) => String(value).trim(),
    enabled: true
  },
  {
    name: 'trim_campaign_id',
    field: 'campaignId',
    normalizer: (value: string) => String(value).trim(),
    enabled: true
  },
  {
    name: 'normalize_platform',
    field: 'platform',
    normalizer: (value: string) => String(value).toLowerCase().trim(),
    enabled: true
  },
  {
    name: 'ensure_timestamp',
    field: 'timestamp',
    normalizer: (value: any) => {
      if (value instanceof Date) return value;
      if (typeof value === 'string' || typeof value === 'number') {
        const date = new Date(value);
        return isNaN(date.getTime()) ? new Date() : date;
      }
      return new Date();
    },
    enabled: true
  },
  {
    name: 'cap_extreme_values',
    field: 'metrics',
    normalizer: (metrics: any) => {
      const MAX_REASONABLE_VALUE = 1000000000; // 1 billion
      return {
        views: Math.min(metrics.views, MAX_REASONABLE_VALUE),
        likes: Math.min(metrics.likes, MAX_REASONABLE_VALUE),
        comments: Math.min(metrics.comments, MAX_REASONABLE_VALUE),
        shares: Math.min(metrics.shares, MAX_REASONABLE_VALUE)
      };
    },
    enabled: true
  }
];

export const JOB_PRIORITIES = {
  HIGH: 'high' as const,
  MEDIUM: 'medium' as const,
  LOW: 'low' as const
};

export const WORKER_STATES = {
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPING: 'stopping',
  ERROR: 'error'
} as const;

export const PIPELINE_STAGES = {
  COLLECTION: 'collection',
  VALIDATION: 'validation',
  NORMALIZATION: 'normalization',
  CACHING: 'caching',
  STORAGE: 'storage'
} as const;

export const ERROR_TYPES = {
  RATE_LIMITED: 'RATE_LIMITED',
  API_ERROR: 'API_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PROCESSING_ERROR: 'PROCESSING_ERROR',
  STORAGE_ERROR: 'STORAGE_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR'
} as const;