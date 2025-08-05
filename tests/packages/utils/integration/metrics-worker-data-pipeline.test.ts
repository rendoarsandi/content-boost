import { MetricsDataPipeline } from '../../src/metrics-worker/data-pipeline';
import { MetricsValidator } from '../../src/metrics-worker/validator';
import { MetricsNormalizer } from '../../src/metrics-worker/normalizer';
import { RedisCache } from '@repo/cache';
import { SocialMediaMetrics } from '../../src/social-api/types';

// Mock dependencies
jest.mock('@repo/cache');
jest.mock('../../src/metrics-worker/validator');
jest.mock('../../src/metrics-worker/normalizer');

describe('MetricsDataPipeline', () => {
  let pipeline: MetricsDataPipeline;
  let mockCache: jest.Mocked<RedisCache>;
  let mockValidator: jest.Mocked<MetricsValidator>;
  let mockNormalizer: jest.Mocked<MetricsNormalizer>;

  beforeEach(() => {
    mockCache = {
      set: jest.fn(),
      get: jest.fn(),
      del: jest.fn(),
      deletePattern: jest.fn(),
    } as any;

    mockValidator = {
      validateMetrics: jest.fn(),
      calculateQualityScore: jest.fn(),
      detectAnomalies: jest.fn(),
    } as any;

    mockNormalizer = {
      normalizeMetrics: jest.fn(),
    } as any;

    pipeline = new MetricsDataPipeline(
      mockCache,
      undefined,
      mockValidator,
      mockNormalizer
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('processMetrics', () => {
    const mockRawMetrics: SocialMediaMetrics = {
      userId: 'user123',
      platform: 'tiktok',
      postId: 'post123',
      campaignId: 'campaign123',
      metrics: {
        views: 1000,
        likes: 100,
        comments: 10,
        shares: 5,
      },
      timestamp: new Date(),
      isValid: true,
    };

    beforeEach(() => {
      // Setup default mock responses
      mockValidator.validateMetrics.mockResolvedValue([
        {
          rule: 'test_rule',
          field: 'test_field',
          passed: true,
          value: 'test_value',
          severity: 'warning',
        },
      ]);

      mockValidator.calculateQualityScore.mockReturnValue(100);
      mockValidator.detectAnomalies.mockReturnValue(false);

      mockNormalizer.normalizeMetrics.mockResolvedValue({
        normalizedMetrics: mockRawMetrics,
        appliedRules: ['test_normalization'],
      });

      mockCache.set.mockResolvedValue();
    });

    it('should process metrics through all pipeline stages', async () => {
      const result = await pipeline.processMetrics(mockRawMetrics);

      expect(result).toBeDefined();
      expect(result.userId).toBe('user123');
      expect(result.processed).toBeDefined();
      expect(result.processed.validationResults).toBeDefined();
      expect(result.processed.normalizationApplied).toContain(
        'test_normalization'
      );
      expect(result.processed.qualityScore).toBe(100);
      expect(result.processed.anomalyDetected).toBe(false);
      expect(result.raw).toBeDefined();
      expect(result.raw.originalMetrics).toEqual(mockRawMetrics);
    });

    it('should include original API response in raw data', async () => {
      const originalApiResponse = { api_data: 'test' };

      const result = await pipeline.processMetrics(
        mockRawMetrics,
        originalApiResponse
      );

      expect(result.raw.apiResponse).toEqual(originalApiResponse);
    });

    it('should handle validation stage errors gracefully', async () => {
      mockValidator.validateMetrics.mockRejectedValue(
        new Error('Validation failed')
      );

      const result = await pipeline.processMetrics(mockRawMetrics);

      expect(result).toBeDefined();
      expect(result.processed.validationResults).toHaveLength(1);
      expect(result.processed.validationResults[0].passed).toBe(false);
      expect(result.processed.validationResults[0].message).toContain(
        'Pipeline processing failed'
      );
    });

    it('should handle normalization stage errors gracefully', async () => {
      mockNormalizer.normalizeMetrics.mockRejectedValue(
        new Error('Normalization failed')
      );

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await pipeline.processMetrics(mockRawMetrics);

      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should handle caching stage errors gracefully', async () => {
      mockCache.set.mockRejectedValue(new Error('Cache failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await pipeline.processMetrics(mockRawMetrics);

      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Caching stage error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should calculate processing time correctly', async () => {
      const result = await pipeline.processMetrics(mockRawMetrics);

      expect(
        result.raw.collectionMetadata.processingTime
      ).toBeGreaterThanOrEqual(0);
      expect(typeof result.raw.collectionMetadata.processingTime).toBe(
        'number'
      );
    });

    it('should set processing timestamp', async () => {
      const beforeProcessing = new Date();
      const result = await pipeline.processMetrics(mockRawMetrics);
      const afterProcessing = new Date();

      expect(result.processed.processingTimestamp).toBeInstanceOf(Date);
      expect(
        result.processed.processingTimestamp.getTime()
      ).toBeGreaterThanOrEqual(beforeProcessing.getTime());
      expect(
        result.processed.processingTimestamp.getTime()
      ).toBeLessThanOrEqual(afterProcessing.getTime());
    });
  });

  describe('processBatch', () => {
    const mockMetricsList: SocialMediaMetrics[] = [
      {
        userId: 'user1',
        platform: 'tiktok',
        postId: 'post1',
        campaignId: 'campaign1',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
      },
      {
        userId: 'user2',
        platform: 'instagram',
        postId: 'post2',
        campaignId: 'campaign2',
        metrics: { views: 2000, likes: 200, comments: 20, shares: 10 },
        timestamp: new Date(),
        isValid: true,
      },
    ];

    beforeEach(() => {
      mockValidator.validateMetrics.mockResolvedValue([]);
      mockValidator.calculateQualityScore.mockReturnValue(100);
      mockValidator.detectAnomalies.mockReturnValue(false);
      mockNormalizer.normalizeMetrics.mockResolvedValue({
        normalizedMetrics: mockMetricsList[0],
        appliedRules: [],
      });
      mockCache.set.mockResolvedValue();
    });

    it('should process batch sequentially by default', async () => {
      const results = await pipeline.processBatch(mockMetricsList);

      expect(results).toHaveLength(2);
      expect(results[0].userId).toBe('user1');
      expect(results[1].userId).toBe('user2');
    });

    it('should process batch in parallel when configured', async () => {
      pipeline.updateConfig({ parallelProcessing: true });

      const results = await pipeline.processBatch(mockMetricsList);

      expect(results).toHaveLength(2);
      expect(results[0].userId).toBe('user1');
      expect(results[1].userId).toBe('user2');
    });

    it('should handle batch with API responses', async () => {
      const apiResponses = [{ api1: 'data1' }, { api2: 'data2' }];

      const results = await pipeline.processBatch(
        mockMetricsList,
        apiResponses
      );

      expect(results).toHaveLength(2);
      expect(results[0].raw.apiResponse).toEqual(apiResponses[0]);
      expect(results[1].raw.apiResponse).toEqual(apiResponses[1]);
    });
  });

  describe('pipeline stage management', () => {
    it('should allow adding custom stages', async () => {
      const customStage = {
        name: 'custom_stage',
        processor: jest.fn().mockResolvedValue({ custom: 'processed' }),
        enabled: true,
        order: 10,
      };

      pipeline.addStage(customStage);

      const stages = pipeline.getStages();
      const addedStage = stages.find(s => s.name === 'custom_stage');

      expect(addedStage).toBeDefined();
      expect(addedStage?.enabled).toBe(true);
    });

    it('should allow removing stages', () => {
      pipeline.removeStage('validation');

      const stages = pipeline.getStages();
      const validationStage = stages.find(s => s.name === 'validation');

      expect(validationStage).toBeUndefined();
    });

    it('should allow enabling and disabling stages', () => {
      pipeline.disableStage('normalization');

      let stages = pipeline.getStages();
      let normalizationStage = stages.find(s => s.name === 'normalization');
      expect(normalizationStage?.enabled).toBe(false);

      pipeline.enableStage('normalization');

      stages = pipeline.getStages();
      normalizationStage = stages.find(s => s.name === 'normalization');
      expect(normalizationStage?.enabled).toBe(true);
    });

    it('should execute stages in correct order', async () => {
      const executionOrder: string[] = [];

      const stage1 = {
        name: 'stage1',
        processor: jest.fn().mockImplementation(async data => {
          executionOrder.push('stage1');
          return data;
        }),
        enabled: true,
        order: 1,
      };

      const stage2 = {
        name: 'stage2',
        processor: jest.fn().mockImplementation(async data => {
          executionOrder.push('stage2');
          return data;
        }),
        enabled: true,
        order: 2,
      };

      pipeline.addStage(stage2); // Add in reverse order
      pipeline.addStage(stage1);

      const mockMetrics: SocialMediaMetrics = {
        userId: 'user123',
        platform: 'tiktok',
        postId: 'post123',
        campaignId: 'campaign123',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
      };

      await pipeline.processMetrics(mockMetrics);

      expect(executionOrder).toEqual(['stage1', 'stage2']);
    });

    it('should skip disabled stages', async () => {
      const disabledStage = {
        name: 'disabled_stage',
        processor: jest.fn(),
        enabled: false,
        order: 1,
      };

      pipeline.addStage(disabledStage);

      const mockMetrics: SocialMediaMetrics = {
        userId: 'user123',
        platform: 'tiktok',
        postId: 'post123',
        campaignId: 'campaign123',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
      };

      await pipeline.processMetrics(mockMetrics);

      expect(disabledStage.processor).not.toHaveBeenCalled();
    });
  });

  describe('caching operations', () => {
    it('should cache processed metrics', async () => {
      const mockMetrics: SocialMediaMetrics = {
        userId: 'user123',
        platform: 'tiktok',
        postId: 'post123',
        campaignId: 'campaign123',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
      };

      mockValidator.validateMetrics.mockResolvedValue([]);
      mockValidator.calculateQualityScore.mockReturnValue(100);
      mockValidator.detectAnomalies.mockReturnValue(false);
      mockNormalizer.normalizeMetrics.mockResolvedValue({
        normalizedMetrics: mockMetrics,
        appliedRules: [],
      });

      await pipeline.processMetrics(mockMetrics);

      expect(mockCache.set).toHaveBeenCalledWith(
        'processed_metrics:user123:campaign123:post123',
        expect.any(Object),
        { ttl: 300 }
      );
    });

    it('should retrieve cached metrics', async () => {
      const cachedMetrics = { userId: 'user123', cached: true };
      mockCache.get.mockResolvedValue(cachedMetrics);

      const result = await pipeline.getCachedMetrics(
        'user123',
        'campaign123',
        'post123'
      );

      expect(result).toEqual(cachedMetrics);
      expect(mockCache.get).toHaveBeenCalledWith(
        'processed_metrics:user123:campaign123:post123'
      );
    });

    it('should return null when cache retrieval fails', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache error'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await pipeline.getCachedMetrics(
        'user123',
        'campaign123',
        'post123'
      );

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        'Cache retrieval error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });

    it('should clear cache with pattern', async () => {
      await pipeline.clearCache('user123', 'campaign123');

      expect(mockCache.deletePattern).toHaveBeenCalledWith(
        'processed_metrics:user123:campaign123:*'
      );
    });

    it('should clear all cache when no parameters provided', async () => {
      await pipeline.clearCache();

      expect(mockCache.deletePattern).toHaveBeenCalledWith(
        'processed_metrics:*'
      );
    });

    it('should handle cache clearing errors', async () => {
      mockCache.deletePattern.mockRejectedValue(new Error('Delete failed'));

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      await pipeline.clearCache();

      expect(consoleSpy).toHaveBeenCalledWith(
        'Cache clearing error:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = {
        parallelProcessing: true,
        errorHandling: 'stop' as const,
      };

      pipeline.updateConfig(newConfig);
      const config = pipeline.getConfig();

      expect(config.parallelProcessing).toBe(true);
      expect(config.errorHandling).toBe('stop');
    });

    it('should return current configuration', () => {
      const config = pipeline.getConfig();

      expect(config).toBeDefined();
      expect(config.stages).toBeDefined();
      expect(config.parallelProcessing).toBeDefined();
      expect(config.errorHandling).toBeDefined();
    });
  });

  describe('error handling strategies', () => {
    beforeEach(() => {
      mockValidator.validateMetrics.mockResolvedValue([]);
      mockValidator.calculateQualityScore.mockReturnValue(100);
      mockValidator.detectAnomalies.mockReturnValue(false);
      mockNormalizer.normalizeMetrics.mockRejectedValue(
        new Error('Stage failed')
      );
    });

    it('should continue processing on error when configured to continue', async () => {
      pipeline.updateConfig({ errorHandling: 'continue' });

      const mockMetrics: SocialMediaMetrics = {
        userId: 'user123',
        platform: 'tiktok',
        postId: 'post123',
        campaignId: 'campaign123',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
      };

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      const result = await pipeline.processMetrics(mockMetrics);

      expect(result).toBeDefined();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it('should stop processing on error when configured to stop', async () => {
      pipeline.updateConfig({ errorHandling: 'stop' });

      const mockMetrics: SocialMediaMetrics = {
        userId: 'user123',
        platform: 'tiktok',
        postId: 'post123',
        campaignId: 'campaign123',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
      };

      const result = await pipeline.processMetrics(mockMetrics);

      expect(result.processed.validationResults[0].passed).toBe(false);
      expect(result.processed.validationResults[0].message).toContain(
        'Pipeline processing failed'
      );
    });

    it('should retry on error when configured to retry', async () => {
      pipeline.updateConfig({ errorHandling: 'retry' });

      // Mock to fail first time, succeed second time
      let callCount = 0;
      mockNormalizer.normalizeMetrics.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          throw new Error('First attempt failed');
        }
        return Promise.resolve({
          normalizedMetrics: {
            userId: 'user123',
            platform: 'tiktok',
            postId: 'post123',
            campaignId: 'campaign123',
            metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
            timestamp: new Date(),
            isValid: true,
          },
          appliedRules: [],
        });
      });

      const mockMetrics: SocialMediaMetrics = {
        userId: 'user123',
        platform: 'tiktok',
        postId: 'post123',
        campaignId: 'campaign123',
        metrics: { views: 1000, likes: 100, comments: 10, shares: 5 },
        timestamp: new Date(),
        isValid: true,
      };

      const result = await pipeline.processMetrics(mockMetrics);

      expect(result).toBeDefined();
      expect(callCount).toBe(2); // Should have retried
    });
  });
});
