import { RedisCache } from '@repo/cache';
import { ProcessedMetrics } from './metrics-collector';

// Data Pipeline Types
export interface PipelineStage<TInput, TOutput> {
  name: string;
  process: (input: TInput) => Promise<TOutput>;
  onError?: (error: Error, input: TInput) => Promise<TOutput | null>;
}

export interface PipelineResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  stageName?: string;
  processingTime: number;
}

export interface DataNormalizationRule {
  name: string;
  apply: (metrics: ProcessedMetrics) => ProcessedMetrics;
}

export interface DataAggregationRule {
  name: string;
  timeWindow: number; // in milliseconds
  aggregateFunction: (metrics: ProcessedMetrics[]) => ProcessedMetrics;
}

// Default normalization rules
export const DEFAULT_NORMALIZATION_RULES: DataNormalizationRule[] = [
  {
    name: 'ensure-non-negative',
    apply: metrics => ({
      ...metrics,
      viewCount: Math.max(0, metrics.viewCount),
      likeCount: Math.max(0, metrics.likeCount),
      commentCount: Math.max(0, metrics.commentCount),
      shareCount: Math.max(0, metrics.shareCount),
    }),
  },
  {
    name: 'round-numbers',
    apply: metrics => ({
      ...metrics,
      viewCount: Math.round(metrics.viewCount),
      likeCount: Math.round(metrics.likeCount),
      commentCount: Math.round(metrics.commentCount),
      shareCount: Math.round(metrics.shareCount),
    }),
  },
  {
    name: 'calculate-engagement-rate',
    apply: metrics => {
      const totalEngagement =
        metrics.likeCount + metrics.commentCount + metrics.shareCount;
      const engagementRate =
        metrics.viewCount > 0 ? totalEngagement / metrics.viewCount : 0;

      return {
        ...metrics,
        // Add engagement rate as a custom property
        ...((metrics as any).customMetrics ? {} : { customMetrics: {} }),
        customMetrics: {
          ...(metrics as any).customMetrics,
          engagementRate: Math.round(engagementRate * 10000) / 10000, // 4 decimal places
        },
      };
    },
  },
];

// Default aggregation rules
export const DEFAULT_AGGREGATION_RULES: DataAggregationRule[] = [
  {
    name: 'hourly-average',
    timeWindow: 60 * 60 * 1000, // 1 hour
    aggregateFunction: metrics => {
      if (metrics.length === 0) throw new Error('No metrics to aggregate');

      const latest = metrics[metrics.length - 1];
      const sum = metrics.reduce(
        (acc, m) => ({
          viewCount: acc.viewCount + m.viewCount,
          likeCount: acc.likeCount + m.likeCount,
          commentCount: acc.commentCount + m.commentCount,
          shareCount: acc.shareCount + m.shareCount,
        }),
        { viewCount: 0, likeCount: 0, commentCount: 0, shareCount: 0 }
      );

      return {
        ...latest,
        viewCount: Math.round(sum.viewCount / metrics.length),
        likeCount: Math.round(sum.likeCount / metrics.length),
        commentCount: Math.round(sum.commentCount / metrics.length),
        shareCount: Math.round(sum.shareCount / metrics.length),
        timestamp: new Date(),
      };
    },
  },
];

// Generic Data Pipeline
export class DataPipeline<TInput, TOutput> {
  private stages: PipelineStage<any, any>[] = [];
  private cache: RedisCache;

  constructor(cache: RedisCache) {
    this.cache = cache;
  }

  // Add a processing stage
  addStage<TStageInput, TStageOutput>(
    stage: PipelineStage<TStageInput, TStageOutput>
  ): DataPipeline<TInput, TStageOutput> {
    this.stages.push(stage);
    return this as any;
  }

  // Process data through all stages
  async process(input: TInput): Promise<PipelineResult<TOutput>> {
    const startTime = Date.now();
    let currentData: any = input;

    try {
      for (const stage of this.stages) {
        try {
          currentData = await stage.process(currentData);
        } catch (error) {
          if (stage.onError) {
            currentData = await stage.onError(error as Error, currentData);
            if (currentData === null) {
              return {
                success: false,
                error: `Stage ${stage.name} failed and could not recover: ${(error as Error).message}`,
                stageName: stage.name,
                processingTime: Date.now() - startTime,
              };
            }
          } else {
            return {
              success: false,
              error: `Stage ${stage.name} failed: ${(error as Error).message}`,
              stageName: stage.name,
              processingTime: Date.now() - startTime,
            };
          }
        }
      }

      return {
        success: true,
        data: currentData,
        processingTime: Date.now() - startTime,
      };
    } catch (error) {
      return {
        success: false,
        error: `Pipeline failed: ${(error as Error).message}`,
        processingTime: Date.now() - startTime,
      };
    }
  }

  // Get pipeline stage count
  getStageCount(): number {
    return this.stages.length;
  }

  // Clear all stages
  clear(): void {
    this.stages = [];
  }
}

// Metrics Data Processor
export class MetricsDataProcessor {
  private cache: RedisCache;
  private normalizationRules: DataNormalizationRule[];
  private aggregationRules: DataAggregationRule[];

  constructor(
    cache: RedisCache,
    normalizationRules: DataNormalizationRule[] = DEFAULT_NORMALIZATION_RULES,
    aggregationRules: DataAggregationRule[] = DEFAULT_AGGREGATION_RULES
  ) {
    this.cache = cache;
    this.normalizationRules = normalizationRules;
    this.aggregationRules = aggregationRules;
  }

  // Create a processing pipeline for metrics
  createMetricsPipeline(): DataPipeline<ProcessedMetrics, ProcessedMetrics> {
    const pipeline = new DataPipeline<ProcessedMetrics, ProcessedMetrics>(
      this.cache
    );

    // Stage 1: Data Validation
    pipeline.addStage({
      name: 'validation',
      process: async (metrics: ProcessedMetrics) => {
        // Basic validation
        if (!metrics.promoterId || !metrics.campaignId || !metrics.postId) {
          throw new Error('Missing required identifiers');
        }

        if (
          !metrics.platform ||
          !['tiktok', 'instagram'].includes(metrics.platform)
        ) {
          throw new Error('Invalid platform');
        }

        if (!metrics.timestamp || isNaN(metrics.timestamp.getTime())) {
          throw new Error('Invalid timestamp');
        }

        return metrics;
      },
      onError: async (error, metrics) => {
        console.error(
          `Validation failed for metrics: ${error.message}`,
          metrics
        );
        return null; // Reject invalid metrics
      },
    });

    // Stage 2: Data Normalization
    pipeline.addStage({
      name: 'normalization',
      process: async (metrics: ProcessedMetrics) => {
        let normalizedMetrics = { ...metrics };

        for (const rule of this.normalizationRules) {
          try {
            normalizedMetrics = rule.apply(normalizedMetrics);
          } catch (error) {
            console.warn(`Normalization rule ${rule.name} failed:`, error);
          }
        }

        return normalizedMetrics;
      },
    });

    // Stage 3: Duplicate Detection
    pipeline.addStage({
      name: 'duplicate-detection',
      process: async (metrics: ProcessedMetrics) => {
        const duplicateKey = this.getDuplicateKey(metrics);
        const existing = await this.cache.get(duplicateKey);

        if (existing) {
          // Check if this is a duplicate based on timestamp and values
          const existingMetrics = existing as ProcessedMetrics;
          const timeDiff = Math.abs(
            metrics.timestamp.getTime() - existingMetrics.timestamp.getTime()
          );

          if (
            timeDiff < 30000 && // Within 30 seconds
            metrics.viewCount === existingMetrics.viewCount &&
            metrics.likeCount === existingMetrics.likeCount
          ) {
            throw new Error('Duplicate metrics detected');
          }
        }

        // Store for duplicate detection (short TTL)
        await this.cache.set(duplicateKey, metrics, { ttl: 300 }); // 5 minutes
        return metrics;
      },
      onError: async (error, metrics) => {
        if (error.message.includes('Duplicate')) {
          console.log(
            `Skipping duplicate metrics for ${metrics.platform}:${metrics.postId}`
          );
          return null; // Skip duplicates
        }
        throw error; // Re-throw other errors
      },
    });

    // Stage 4: Enrichment
    pipeline.addStage({
      name: 'enrichment',
      process: async (metrics: ProcessedMetrics) => {
        // Add computed fields
        const enrichedMetrics = {
          ...metrics,
          processedAt: new Date(),
          customMetrics: {
            ...(metrics as any).customMetrics,
            totalEngagement:
              metrics.likeCount + metrics.commentCount + metrics.shareCount,
            viewsPerHour: this.calculateViewsPerHour(metrics),
          },
        };

        return enrichedMetrics;
      },
    });

    // Stage 5: Quality Scoring
    pipeline.addStage({
      name: 'quality-scoring',
      process: async (metrics: ProcessedMetrics) => {
        const qualityScore = this.calculateQualityScore(metrics);

        return {
          ...metrics,
          customMetrics: {
            ...(metrics as any).customMetrics,
            qualityScore,
          },
        };
      },
    });

    return pipeline;
  }

  // Process metrics through the pipeline
  async processMetrics(
    metrics: ProcessedMetrics
  ): Promise<PipelineResult<ProcessedMetrics>> {
    const pipeline = this.createMetricsPipeline();
    return await pipeline.process(metrics);
  }

  // Batch process multiple metrics
  async batchProcessMetrics(
    metricsList: ProcessedMetrics[]
  ): Promise<PipelineResult<ProcessedMetrics>[]> {
    const pipeline = this.createMetricsPipeline();

    return await Promise.all(
      metricsList.map(metrics => pipeline.process(metrics))
    );
  }

  // Aggregate metrics over time window
  async aggregateMetrics(
    promoterId: string,
    campaignId: string,
    postId: string,
    timeWindow: number
  ): Promise<ProcessedMetrics[]> {
    const endTime = Date.now();
    const startTime = endTime - timeWindow;

    // Get metrics from cache within time window
    const pattern = this.cache
      .getKeyManager()
      .custom('metrics', promoterId, campaignId, postId, 'history_*');
    const keys = await this.cache.keys(pattern);

    const metricsInWindow: ProcessedMetrics[] = [];

    for (const key of keys) {
      const timestamp = parseInt(key.split('_').pop() || '0');
      if (timestamp >= startTime && timestamp <= endTime) {
        const metrics = await this.cache.get<ProcessedMetrics>(key);
        if (metrics) {
          metricsInWindow.push(metrics);
        }
      }
    }

    // Apply aggregation rules
    const aggregatedResults: ProcessedMetrics[] = [];

    for (const rule of this.aggregationRules) {
      if (metricsInWindow.length > 0) {
        try {
          const aggregated = rule.aggregateFunction(metricsInWindow);
          aggregatedResults.push({
            ...aggregated,
            customMetrics: {
              ...(aggregated as any).customMetrics,
              aggregationRule: rule.name,
              aggregatedCount: metricsInWindow.length,
            },
          });
        } catch (error) {
          console.error(`Aggregation rule ${rule.name} failed:`, error);
        }
      }
    }

    return aggregatedResults;
  }

  // Calculate quality score based on various factors
  private calculateQualityScore(metrics: ProcessedMetrics): number {
    let score = 100; // Start with perfect score

    // Penalize for validation errors
    if (metrics.validationErrors.length > 0) {
      score -= metrics.validationErrors.length * 10;
    }

    // Penalize for suspicious engagement patterns
    if (metrics.viewCount > 0) {
      const engagementRate =
        (metrics.likeCount + metrics.commentCount) / metrics.viewCount;

      if (engagementRate < 0.001) {
        // Very low engagement
        score -= 20;
      } else if (engagementRate > 0.1) {
        // Suspiciously high engagement
        score -= 15;
      }
    }

    // Penalize for large deltas (potential bot activity)
    if (metrics.deltaMetrics) {
      const viewsDelta = metrics.deltaMetrics.viewsDelta;
      if (viewsDelta > 10000) {
        // Large view spike
        score -= 25;
      }
    }

    // Bonus for consistent data
    if (metrics.isValid && metrics.validationErrors.length === 0) {
      score += 5;
    }

    return Math.max(0, Math.min(100, score));
  }

  // Calculate views per hour based on deltas
  private calculateViewsPerHour(metrics: ProcessedMetrics): number {
    if (!metrics.deltaMetrics || !metrics.previousMetrics) {
      return 0;
    }

    const timeDiff =
      metrics.timestamp.getTime() - metrics.previousMetrics.timestamp.getTime();
    const hoursDiff = timeDiff / (1000 * 60 * 60);

    if (hoursDiff > 0) {
      return Math.round(metrics.deltaMetrics.viewsDelta / hoursDiff);
    }

    return 0;
  }

  // Generate duplicate detection key
  private getDuplicateKey(metrics: ProcessedMetrics): string {
    return this.cache
      .getKeyManager()
      .custom(
        'duplicate-check',
        metrics.promoterId,
        metrics.campaignId,
        metrics.postId
      );
  }

  // Add custom normalization rule
  addNormalizationRule(rule: DataNormalizationRule): void {
    this.normalizationRules.push(rule);
  }

  // Add custom aggregation rule
  addAggregationRule(rule: DataAggregationRule): void {
    this.aggregationRules.push(rule);
  }

  // Get processing statistics
  async getProcessingStats(): Promise<{
    totalProcessed: number;
    successRate: number;
    averageProcessingTime: number;
    commonErrors: string[];
  }> {
    // This would typically be stored in cache or database
    // For now, return mock data
    return {
      totalProcessed: 0,
      successRate: 0.95,
      averageProcessingTime: 150, // ms
      commonErrors: ['Validation failed', 'Duplicate detected'],
    };
  }
}

// Export factory functions
export const createDataPipeline = <TInput, TOutput>(cache: RedisCache) => {
  return new DataPipeline<TInput, TOutput>(cache);
};

export const createMetricsDataProcessor = (
  cache: RedisCache,
  normalizationRules?: DataNormalizationRule[],
  aggregationRules?: DataAggregationRule[]
) => {
  return new MetricsDataProcessor(cache, normalizationRules, aggregationRules);
};
