import { RedisCache } from '@repo/cache';
import {
  DataPipeline,
  MetricsDataProcessor,
  createDataPipeline,
  createMetricsDataProcessor,
  DEFAULT_NORMALIZATION_RULES,
  DEFAULT_AGGREGATION_RULES,
} from '../src/data-pipeline';
import { ProcessedMetrics } from '../src/metrics-collector';

// Mock Redis cache
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  keys: jest.fn(),
  getKeyManager: jest.fn(() => ({
    custom: jest.fn((...parts: string[]) => parts.join(':')),
  })),
} as unknown as RedisCache;

describe('DataPipeline', () => {
  let pipeline: DataPipeline<string, string>;

  beforeEach(() => {
    jest.clearAllMocks();
    pipeline = createDataPipeline<string, string>(mockCache);
  });

  describe('addStage', () => {
    it('should add processing stages', () => {
      pipeline.addStage({
        name: 'uppercase',
        process: async (input: string) => input.toUpperCase(),
      });

      pipeline.addStage({
        name: 'add-prefix',
        process: async (input: string) => `PREFIX_${input}`,
      });

      expect(pipeline.getStageCount()).toBe(2);
    });
  });

  describe('process', () => {
    it('should process data through all stages', async () => {
      pipeline
        .addStage({
          name: 'uppercase',
          process: async (input: string) => input.toUpperCase(),
        })
        .addStage({
          name: 'add-prefix',
          process: async (input: string) => `PREFIX_${input}`,
        });

      const result = await pipeline.process('hello');

      expect(result.success).toBe(true);
      expect(result.data).toBe('PREFIX_HELLO');
      expect(result.processingTime).toBeGreaterThan(0);
    });

    it('should handle stage errors', async () => {
      pipeline.addStage({
        name: 'error-stage',
        process: async () => {
          throw new Error('Stage failed');
        },
      });

      const result = await pipeline.process('input');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Stage error-stage failed: Stage failed');
      expect(result.stageName).toBe('error-stage');
    });

    it('should handle stage errors with recovery', async () => {
      pipeline.addStage({
        name: 'error-stage',
        process: async () => {
          throw new Error('Stage failed');
        },
        onError: async (error, input) => {
          return `RECOVERED_${input}`;
        },
      });

      const result = await pipeline.process('input');

      expect(result.success).toBe(true);
      expect(result.data).toBe('RECOVERED_input');
    });

    it('should fail if error recovery returns null', async () => {
      pipeline.addStage({
        name: 'error-stage',
        process: async () => {
          throw new Error('Stage failed');
        },
        onError: async () => null,
      });

      const result = await pipeline.process('input');

      expect(result.success).toBe(false);
      expect(result.error).toContain('could not recover');
    });
  });

  describe('clear', () => {
    it('should clear all stages', () => {
      pipeline.addStage({
        name: 'test-stage',
        process: async (input: string) => input,
      });

      expect(pipeline.getStageCount()).toBe(1);
      
      pipeline.clear();
      expect(pipeline.getStageCount()).toBe(0);
    });
  });
});

describe('MetricsDataProcessor', () => {
  let processor: MetricsDataProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = createMetricsDataProcessor(mockCache);
  });

  describe('processMetrics', () => {
    it('should process valid metrics successfully', async () => {
      const metrics: ProcessedMetrics = {
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok',
        postId: 'video789',
        viewCount: 1000,
        likeCount: 100,
        commentCount: 10,
        shareCount: 5,
        timestamp: new Date(),
        isValid: true,
        validationErrors: [],
      };

      // Mock cache operations
      (mockCache.get as jest.Mock).mockResolvedValue(null); // No duplicate
      (mockCache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await processor.processMetrics(metrics);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.customMetrics).toBeDefined();
      expect(result.data?.customMetrics.engagementRate).toBeDefined();
      expect(result.data?.customMetrics.totalEngagement).toBe(115); // 100 + 10 + 5
    });

    it('should reject metrics with missing identifiers', async () => {
      const invalidMetrics = {
        promoterId: '',
        campaignId: 'campaign456',
        platform: 'tiktok',
        postId: 'video789',
        viewCount: 1000,
        likeCount: 100,
        commentCount: 10,
        shareCount: 5,
        timestamp: new Date(),
        isValid: true,
        validationErrors: [],
      } as ProcessedMetrics;

      const result = await processor.processMetrics(invalidMetrics);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required identifiers');
      expect(result.stageName).toBe('validation');
    });

    it('should reject metrics with invalid platform', async () => {
      const invalidMetrics = {
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'facebook' as any,
        postId: 'video789',
        viewCount: 1000,
        likeCount: 100,
        commentCount: 10,
        shareCount: 5,
        timestamp: new Date(),
        isValid: true,
        validationErrors: [],
      } as ProcessedMetrics;

      const result = await processor.processMetrics(invalidMetrics);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid platform');
    });

    it('should normalize negative values', async () => {
      const metrics: ProcessedMetrics = {
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok',
        postId: 'video789',
        viewCount: -100, // Negative value
        likeCount: 50,
        commentCount: -5, // Negative value
        shareCount: 2,
        timestamp: new Date(),
        isValid: true,
        validationErrors: [],
      };

      (mockCache.get as jest.Mock).mockResolvedValue(null);
      (mockCache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await processor.processMetrics(metrics);

      expect(result.success).toBe(true);
      expect(result.data?.viewCount).toBe(0); // Normalized to 0
      expect(result.data?.commentCount).toBe(0); // Normalized to 0
      expect(result.data?.likeCount).toBe(50); // Unchanged
    });

    it('should detect and skip duplicates', async () => {
      const metrics: ProcessedMetrics = {
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok',
        postId: 'video789',
        viewCount: 1000,
        likeCount: 100,
        commentCount: 10,
        shareCount: 5,
        timestamp: new Date(),
        isValid: true,
        validationErrors: [],
      };

      // Mock existing duplicate
      (mockCache.get as jest.Mock).mockResolvedValue({
        ...metrics,
        timestamp: new Date(Date.now() - 10000), // 10 seconds ago
      });

      const result = await processor.processMetrics(metrics);

      expect(result.success).toBe(false);
      expect(result.error).toContain('could not recover');
      expect(result.stageName).toBe('duplicate-detection');
    });

    it('should calculate quality score', async () => {
      const highQualityMetrics: ProcessedMetrics = {
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok',
        postId: 'video789',
        viewCount: 1000,
        likeCount: 50, // Good engagement
        commentCount: 10,
        shareCount: 5,
        timestamp: new Date(),
        isValid: true,
        validationErrors: [],
      };

      (mockCache.get as jest.Mock).mockResolvedValue(null);
      (mockCache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await processor.processMetrics(highQualityMetrics);

      expect(result.success).toBe(true);
      expect(result.data?.customMetrics.qualityScore).toBeGreaterThan(90);
    });
  });

  describe('batchProcessMetrics', () => {
    it('should process multiple metrics', async () => {
      const metricsList: ProcessedMetrics[] = [
        {
          promoterId: 'user123',
          campaignId: 'campaign456',
          platform: 'tiktok',
          postId: 'video1',
          viewCount: 1000,
          likeCount: 100,
          commentCount: 10,
          shareCount: 5,
          timestamp: new Date(),
          isValid: true,
          validationErrors: [],
        },
        {
          promoterId: 'user123',
          campaignId: 'campaign456',
          platform: 'tiktok',
          postId: 'video2',
          viewCount: 2000,
          likeCount: 200,
          commentCount: 20,
          shareCount: 10,
          timestamp: new Date(),
          isValid: true,
          validationErrors: [],
        },
      ];

      (mockCache.get as jest.Mock).mockResolvedValue(null);
      (mockCache.set as jest.Mock).mockResolvedValue(undefined);

      const results = await processor.batchProcessMetrics(metricsList);

      expect(results).toHaveLength(2);
      expect(results[0].success).toBe(true);
      expect(results[1].success).toBe(true);
    });
  });

  describe('aggregateMetrics', () => {
    it('should aggregate metrics over time window', async () => {
      const now = Date.now();
      const mockKeys = [
        `metrics:user123:campaign456:video789:history_${now - 120000}`,
        `metrics:user123:campaign456:video789:history_${now - 60000}`,
        `metrics:user123:campaign456:video789:history_${now - 30000}`,
      ];

      const mockMetrics = [
        {
          viewCount: 100,
          likeCount: 10,
          commentCount: 5,
          shareCount: 2,
          timestamp: new Date(now - 120000),
        },
        {
          viewCount: 150,
          likeCount: 15,
          commentCount: 7,
          shareCount: 3,
          timestamp: new Date(now - 60000),
        },
        {
          viewCount: 200,
          likeCount: 20,
          commentCount: 10,
          shareCount: 4,
          timestamp: new Date(now - 30000),
        },
      ];

      (mockCache.keys as jest.Mock).mockResolvedValue(mockKeys);
      (mockCache.get as jest.Mock)
        .mockResolvedValueOnce(mockMetrics[0])
        .mockResolvedValueOnce(mockMetrics[1])
        .mockResolvedValueOnce(mockMetrics[2]);

      const aggregated = await processor.aggregateMetrics(
        'user123',
        'campaign456',
        'video789',
        180000 // 3 minutes
      );

      expect(aggregated).toHaveLength(1); // One aggregation rule
      expect(aggregated[0].viewCount).toBe(150); // Average: (100 + 150 + 200) / 3
      expect(aggregated[0].customMetrics.aggregationRule).toBe('hourly-average');
      expect(aggregated[0].customMetrics.aggregatedCount).toBe(3);
    });
  });

  describe('normalization rules', () => {
    it('should ensure non-negative values', () => {
      const rule = DEFAULT_NORMALIZATION_RULES.find(r => r.name === 'ensure-non-negative')!;
      
      const metrics = {
        viewCount: -100,
        likeCount: 50,
        commentCount: -10,
        shareCount: 5,
      } as ProcessedMetrics;

      const normalized = rule.apply(metrics);
      
      expect(normalized.viewCount).toBe(0);
      expect(normalized.likeCount).toBe(50);
      expect(normalized.commentCount).toBe(0);
      expect(normalized.shareCount).toBe(5);
    });

    it('should round numbers', () => {
      const rule = DEFAULT_NORMALIZATION_RULES.find(r => r.name === 'round-numbers')!;
      
      const metrics = {
        viewCount: 100.7,
        likeCount: 50.3,
        commentCount: 10.9,
        shareCount: 5.1,
      } as ProcessedMetrics;

      const normalized = rule.apply(metrics);
      
      expect(normalized.viewCount).toBe(101);
      expect(normalized.likeCount).toBe(50);
      expect(normalized.commentCount).toBe(11);
      expect(normalized.shareCount).toBe(5);
    });

    it('should calculate engagement rate', () => {
      const rule = DEFAULT_NORMALIZATION_RULES.find(r => r.name === 'calculate-engagement-rate')!;
      
      const metrics = {
        viewCount: 1000,
        likeCount: 50,
        commentCount: 10,
        shareCount: 5,
      } as ProcessedMetrics;

      const normalized = rule.apply(metrics);
      
      expect(normalized.customMetrics.engagementRate).toBe(0.065); // (50 + 10 + 5) / 1000
    });
  });

  describe('aggregation rules', () => {
    it('should calculate hourly average', () => {
      const rule = DEFAULT_AGGREGATION_RULES.find(r => r.name === 'hourly-average')!;
      
      const metrics = [
        {
          viewCount: 100,
          likeCount: 10,
          commentCount: 5,
          shareCount: 2,
          timestamp: new Date(),
        },
        {
          viewCount: 200,
          likeCount: 20,
          commentCount: 10,
          shareCount: 4,
          timestamp: new Date(),
        },
      ] as ProcessedMetrics[];

      const aggregated = rule.aggregateFunction(metrics);
      
      expect(aggregated.viewCount).toBe(150); // (100 + 200) / 2
      expect(aggregated.likeCount).toBe(15); // (10 + 20) / 2
      expect(aggregated.commentCount).toBe(8); // (5 + 10) / 2 rounded
      expect(aggregated.shareCount).toBe(3); // (2 + 4) / 2
    });

    it('should throw error for empty metrics array', () => {
      const rule = DEFAULT_AGGREGATION_RULES.find(r => r.name === 'hourly-average')!;
      
      expect(() => rule.aggregateFunction([])).toThrow('No metrics to aggregate');
    });
  });

  describe('addNormalizationRule', () => {
    it('should add custom normalization rule', async () => {
      processor.addNormalizationRule({
        name: 'custom-rule',
        apply: (metrics) => ({
          ...metrics,
          viewCount: metrics.viewCount * 2,
        }),
      });

      const metrics: ProcessedMetrics = {
        promoterId: 'user123',
        campaignId: 'campaign456',
        platform: 'tiktok',
        postId: 'video789',
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date(),
        isValid: true,
        validationErrors: [],
      };

      (mockCache.get as jest.Mock).mockResolvedValue(null);
      (mockCache.set as jest.Mock).mockResolvedValue(undefined);

      const result = await processor.processMetrics(metrics);

      expect(result.success).toBe(true);
      expect(result.data?.viewCount).toBe(200); // Doubled by custom rule
    });
  });

  describe('addAggregationRule', () => {
    it('should add custom aggregation rule', async () => {
      processor.addAggregationRule({
        name: 'custom-aggregation',
        timeWindow: 60000,
        aggregateFunction: (metrics) => ({
          ...metrics[0],
          viewCount: Math.max(...metrics.map(m => m.viewCount)),
        }),
      });

      const now = Date.now();
      const mockKeys = [`metrics:user123:campaign456:video789:history_${now - 30000}`];
      const mockMetrics = [{
        viewCount: 100,
        likeCount: 10,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date(now - 30000),
      }];

      (mockCache.keys as jest.Mock).mockResolvedValue(mockKeys);
      (mockCache.get as jest.Mock).mockResolvedValue(mockMetrics[0]);

      const aggregated = await processor.aggregateMetrics(
        'user123',
        'campaign456',
        'video789',
        60000
      );

      expect(aggregated).toHaveLength(2); // Default + custom rule
      expect(aggregated.some(a => a.customMetrics.aggregationRule === 'custom-aggregation')).toBe(true);
    });
  });
});