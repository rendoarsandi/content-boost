import { RedisCache } from '@repo/cache';
import { SocialMediaMetrics } from '../social-media-api';
import { MetricsValidator } from './validator';
import { MetricsNormalizer } from './normalizer';
import { 
  DataPipelineConfig, 
  PipelineStage, 
  ProcessedMetrics, 
  ValidationResult 
} from './types';
import { PIPELINE_STAGES } from './constants';

export type { 
  DataPipelineConfig, 
  PipelineStage, 
  ProcessedMetrics, 
  ValidationResult 
};

export class MetricsDataPipeline {
  private cache: RedisCache;
  private validator: MetricsValidator;
  private normalizer: MetricsNormalizer;
  private config: DataPipelineConfig;
  private stages: Map<string, PipelineStage>;

  constructor(
    cache: RedisCache,
    config?: Partial<DataPipelineConfig>,
    validator?: MetricsValidator,
    normalizer?: MetricsNormalizer
  ) {
    this.cache = cache;
    this.validator = validator || new MetricsValidator();
    this.normalizer = normalizer || new MetricsNormalizer();
    this.config = this.createDefaultConfig(config);
    this.stages = new Map();
    
    this.initializeDefaultStages();
  }

  async processMetrics(
    rawMetrics: SocialMediaMetrics,
    originalApiResponse?: any
  ): Promise<ProcessedMetrics> {
    const startTime = Date.now();
    let currentData = { ...rawMetrics };
    
    try {
      // Execute pipeline stages in order
      const sortedStages = Array.from(this.stages.values())
        .filter(stage => stage.enabled)
        .sort((a, b) => a.order - b.order);

      for (const stage of sortedStages) {
        try {
          currentData = await stage.processor(currentData);
        } catch (error) {
          console.error(`Pipeline stage '${stage.name}' failed:`, error);
          
          if (this.config.errorHandling === 'stop') {
            throw error;
          } else if (this.config.errorHandling === 'retry') {
            // Simple retry logic - could be enhanced
            try {
              currentData = await stage.processor(currentData);
            } catch (retryError) {
              console.error(`Pipeline stage '${stage.name}' failed on retry:`, retryError);
              // After a failed retry, we always stop to prevent infinite loops or bad data
              throw retryError;
            }
          }
          // If errorHandling is 'continue', we just log and continue
        }
      }

      // Create processed metrics object
      const processedMetrics: ProcessedMetrics = {
        ...currentData,
        processed: {
          validationResults: [], // Will be populated by validation stage
          normalizationApplied: [], // Will be populated by normalization stage
          qualityScore: 0, // Will be calculated by validation stage
          anomalyDetected: false, // Will be determined by validation stage
          processingTimestamp: new Date()
        },
        raw: {
          originalMetrics: rawMetrics,
          apiResponse: originalApiResponse || {},
          collectionMetadata: {
            collectionTime: new Date(),
            processingTime: Date.now() - startTime,
            retryCount: 0
          }
        }
      };

      return processedMetrics;

    } catch (error) {
      console.error('Pipeline processing failed:', error);
      
      // Return a basic processed metrics object with error information
      return {
        ...rawMetrics,
        processed: {
          validationResults: [{
            rule: 'pipeline_error',
            field: 'processing',
            passed: false,
            value: null,
            message: `Pipeline processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            severity: 'error'
          }],
          normalizationApplied: [],
          qualityScore: 0,
          anomalyDetected: false,
          processingTimestamp: new Date()
        },
        raw: {
          originalMetrics: rawMetrics,
          apiResponse: originalApiResponse || {},
          collectionMetadata: {
            collectionTime: new Date(),
            processingTime: Date.now() - startTime,
            retryCount: 0
          }
        }
      };
    }
  }

  async processBatch(
    metricsList: SocialMediaMetrics[],
    originalApiResponses?: any[]
  ): Promise<ProcessedMetrics[]> {
    if (this.config.parallelProcessing) {
      return Promise.all(
        metricsList.map((metrics, index) => 
          this.processMetrics(metrics, originalApiResponses?.[index])
        )
      );
    } else {
      const results: ProcessedMetrics[] = [];
      for (let i = 0; i < metricsList.length; i++) {
        const result = await this.processMetrics(
          metricsList[i], 
          originalApiResponses?.[i]
        );
        results.push(result);
      }
      return results;
    }
  }

  addStage(stage: PipelineStage): void {
    this.stages.set(stage.name, stage);
  }

  removeStage(stageName: string): void {
    this.stages.delete(stageName);
  }

  enableStage(stageName: string): void {
    const stage = this.stages.get(stageName);
    if (stage) {
      stage.enabled = true;
    }
  }

  disableStage(stageName: string): void {
    const stage = this.stages.get(stageName);
    if (stage) {
      stage.enabled = false;
    }
  }

  getStages(): PipelineStage[] {
    return Array.from(this.stages.values());
  }

  updateConfig(newConfig: Partial<DataPipelineConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): DataPipelineConfig {
    return { ...this.config };
  }

  private createDefaultConfig(config?: Partial<DataPipelineConfig>): DataPipelineConfig {
    return {
      stages: [],
      parallelProcessing: false,
      errorHandling: 'continue',
      outputFormat: 'normalized',
      ...config
    };
  }

  private initializeDefaultStages(): void {
    // Validation stage
    this.addStage({
      name: PIPELINE_STAGES.VALIDATION,
      processor: async (data: any) => {
        const validationResults = await this.validator.validateMetrics(data);
        const qualityScore = this.validator.calculateQualityScore(validationResults);
        const anomalyDetected = this.validator.detectAnomalies(data);
        
        if (data.processed) {
          data.processed.validationResults = validationResults;
          data.processed.qualityScore = qualityScore;
          data.processed.anomalyDetected = anomalyDetected;
        }
        
        return data;
      },
      enabled: true,
      order: 1
    });

    // Normalization stage
    this.addStage({
      name: PIPELINE_STAGES.NORMALIZATION,
      processor: async (data: any) => {
        const { normalizedMetrics, appliedRules } = await this.normalizer.normalizeMetrics(data);
        
        if (data.processed) {
          data.processed.normalizationApplied = appliedRules;
        }
        
        return { ...normalizedMetrics, processed: data.processed, raw: data.raw };
      },
      enabled: true,
      order: 2
    });

    // Caching stage
    this.addStage({
      name: PIPELINE_STAGES.CACHING,
      processor: async (data: any) => {
        try {
          const cacheKey = `processed_metrics:${data.userId}:${data.campaignId}:${data.postId}`;
          await this.cache.set(cacheKey, data, { ttl: 300 }); // 5 minutes cache
        } catch (error) {
          console.error('Caching stage error:', error);
          // Don't fail the pipeline if caching fails
        }
        
        return data;
      },
      enabled: true,
      order: 3
    });
  }

  // Utility methods for common pipeline operations
  async getCachedMetrics(userId: string, campaignId: string, postId: string): Promise<ProcessedMetrics | null> {
    try {
      const cacheKey = `processed_metrics:${userId}:${campaignId}:${postId}`;
      return await this.cache.get<ProcessedMetrics>(cacheKey);
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  async clearCache(userId?: string, campaignId?: string): Promise<void> {
    try {
      let pattern = 'processed_metrics:';
      if (userId) pattern += `${userId}:`;
      if (campaignId) pattern += `${campaignId}:`;
      pattern += '*';
      
      await this.cache.deletePattern(pattern);
    } catch (error) {
      console.error('Cache clearing error:', error);
    }
  }

  // Performance monitoring
  async getProcessingStats(): Promise<{
    totalProcessed: number;
    averageProcessingTime: number;
    errorRate: number;
    cacheHitRate: number;
  }> {
    // This would typically be implemented with proper metrics collection
    // For now, return placeholder values
    return {
      totalProcessed: 0,
      averageProcessingTime: 0,
      errorRate: 0,
      cacheHitRate: 0
    };
  }
}