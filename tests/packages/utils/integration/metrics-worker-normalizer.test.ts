import { MetricsNormalizer } from '../../src/metrics-worker/normalizer';
import { NormalizationRule } from '../../src/metrics-worker/types';

describe('MetricsNormalizer', () => {
  let normalizer: MetricsNormalizer;

  beforeEach(() => {
    normalizer = new MetricsNormalizer();
  });

  describe('normalizeMetrics', () => {
    it('should normalize integer metrics', async () => {
      const metrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 1000.7,
          likes: 100.3,
          comments: 10.9,
          shares: 5.1,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      expect(result.normalizedMetrics.metrics.views).toBe(1000);
      expect(result.normalizedMetrics.metrics.likes).toBe(100);
      expect(result.normalizedMetrics.metrics.comments).toBe(10);
      expect(result.normalizedMetrics.metrics.shares).toBe(5);
      expect(result.appliedRules).toContain('ensure_integer_metrics');
    });

    it('should trim string fields', async () => {
      const metrics = {
        platform: '  tiktok  ',
        postId: '  post123  ',
        userId: '  user123  ',
        campaignId: '  campaign123  ',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      expect(result.normalizedMetrics.platform).toBe('tiktok');
      expect(result.normalizedMetrics.postId).toBe('post123');
      expect(result.normalizedMetrics.userId).toBe('user123');
      expect(result.normalizedMetrics.campaignId).toBe('campaign123');
      expect(result.appliedRules).toContain('normalize_platform');
      expect(result.appliedRules).toContain('trim_string_fields');
    });

    it('should normalize platform to lowercase', async () => {
      const metrics = {
        platform: 'TIKTOK',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      expect(result.normalizedMetrics.platform).toBe('tiktok');
      expect(result.appliedRules).toContain('normalize_platform');
    });

    it('should ensure valid timestamp', async () => {
      const metrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        timestamp: 'invalid-date',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      expect(result.normalizedMetrics.timestamp).toBeInstanceOf(Date);
      expect(result.appliedRules).toContain('ensure_timestamp');
    });

    it('should cap extreme values', async () => {
      const metrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 2000000000, // 2 billion - exceeds reasonable limit
          likes: 100,
          comments: 10,
          shares: 5,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      expect(result.normalizedMetrics.metrics.views).toBe(1000000000); // Capped at 1 billion
      expect(result.appliedRules).toContain('cap_extreme_values');
    });

    it('should not apply disabled rules', async () => {
      normalizer.disableRule('ensure_integer_metrics');

      const metrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 1000.7,
          likes: 100.3,
          comments: 10.9,
          shares: 5.1,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      expect(result.normalizedMetrics.metrics.views).toBe(1000.7); // Not normalized
      expect(result.appliedRules).not.toContain('ensure_integer_metrics');
    });

    it('should handle missing fields gracefully', async () => {
      const metrics = {
        platform: 'tiktok',
        // Missing postId, userId, campaignId
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      // Should not throw error and should process available fields
      expect(result.normalizedMetrics.platform).toBe('tiktok');
      expect(result.normalizedMetrics.metrics.views).toBe(1000);
    });
  });

  describe('normalizeMetricsBatch', () => {
    it('should normalize multiple metrics objects', async () => {
      const metricsList = [
        {
          platform: '  TIKTOK  ',
          metrics: { views: 1000.7, likes: 100.3, comments: 10.9, shares: 5.1 },
        },
        {
          platform: '  INSTAGRAM  ',
          metrics: {
            views: 2000.2,
            likes: 200.8,
            comments: 20.1,
            shares: 10.9,
          },
        },
      ];

      const results = await normalizer.normalizeMetricsBatch(metricsList);

      expect(results).toHaveLength(2);
      expect(results[0].normalizedMetrics.platform).toBe('tiktok');
      expect(results[1].normalizedMetrics.platform).toBe('instagram');
      expect(results[0].normalizedMetrics.metrics.views).toBe(1000);
      expect(results[1].normalizedMetrics.metrics.views).toBe(2000);
    });
  });

  describe('previewNormalization', () => {
    it('should show what changes would be made without applying them', async () => {
      const metrics = {
        platform: '  TIKTOK  ',
        postId: '  post123  ',
        metrics: {
          views: 1000.7,
          likes: 100.3,
          comments: 10.9,
          shares: 5.1,
        },
      };

      const preview = await normalizer.previewNormalization(metrics);

      expect(preview.original.platform).toBe('  TIKTOK  ');
      expect(preview.normalized.platform).toBe('tiktok');
      expect(preview.changes.length).toBeGreaterThan(0);

      const platformChange = preview.changes.find(c => c.field === 'platform');
      expect(platformChange).toBeDefined();
      expect(platformChange?.originalValue).toBe('  TIKTOK  ');
      expect(platformChange?.normalizedValue).toBe('tiktok');
    });
  });

  describe('custom rules', () => {
    it('should allow adding custom normalization rules', async () => {
      const customRule: NormalizationRule = {
        name: 'custom_uppercase',
        field: 'customField',
        normalizer: (value: any) => String(value).toUpperCase(),
        enabled: true,
      };

      normalizer.addCustomRule(customRule);

      const metrics = {
        platform: 'tiktok',
        customField: 'lowercase text',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      expect(result.normalizedMetrics.customField).toBe('LOWERCASE TEXT');
      expect(result.appliedRules).toContain('custom_uppercase');
    });

    it('should allow enabling and disabling rules', async () => {
      normalizer.disableRule('normalize_platform');

      const metrics = {
        platform: 'TIKTOK',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5,
        },
      };

      const result = await normalizer.normalizeMetrics(metrics);

      expect(result.normalizedMetrics.platform).toBe('TIKTOK'); // Not normalized
      expect(result.appliedRules).not.toContain('normalize_platform');

      // Re-enable and test
      normalizer.enableRule('normalize_platform');
      const result2 = await normalizer.normalizeMetrics(metrics);

      expect(result2.normalizedMetrics.platform).toBe('tiktok');
      expect(result2.appliedRules).toContain('normalize_platform');
    });
  });

  describe('built-in normalizers', () => {
    it('should provide utility normalizer functions', () => {
      expect(MetricsNormalizer.normalizers.trimString('  test  ')).toBe('test');
      expect(MetricsNormalizer.normalizers.toLowerCase('TEST')).toBe('test');
      expect(MetricsNormalizer.normalizers.toUpperCase('test')).toBe('TEST');
      expect(MetricsNormalizer.normalizers.ensureInteger(10.7)).toBe(10);
      expect(MetricsNormalizer.normalizers.ensurePositive(-5)).toBe(0);
      expect(MetricsNormalizer.normalizers.capValue(100)(150)).toBe(100);
      expect(MetricsNormalizer.normalizers.roundToDecimals(2)(10.567)).toBe(
        10.57
      );
      expect(MetricsNormalizer.normalizers.ensureArray('single')).toEqual([
        'single',
      ]);
      expect(
        MetricsNormalizer.normalizers.ensureArray(['already', 'array'])
      ).toEqual(['already', 'array']);
    });

    it('should handle date normalization', () => {
      const validDate = new Date('2023-01-01');
      const stringDate = '2023-01-01';
      const invalidDate = 'invalid';

      expect(MetricsNormalizer.normalizers.ensureDate(validDate)).toEqual(
        validDate
      );
      expect(MetricsNormalizer.normalizers.ensureDate(stringDate)).toEqual(
        new Date(stringDate)
      );
      expect(
        MetricsNormalizer.normalizers.ensureDate(invalidDate)
      ).toBeInstanceOf(Date);
    });

    it('should normalize URLs', () => {
      expect(MetricsNormalizer.normalizers.normalizeUrl('example.com')).toBe(
        'https://example.com'
      );
      expect(
        MetricsNormalizer.normalizers.normalizeUrl('http://example.com')
      ).toBe('http://example.com');
      expect(
        MetricsNormalizer.normalizers.normalizeUrl('https://example.com')
      ).toBe('https://example.com');
    });
  });
});
