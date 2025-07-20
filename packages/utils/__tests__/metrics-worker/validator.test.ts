import { MetricsValidator } from '../../src/metrics-worker/validator';
import { ValidationRule } from '../../src/metrics-worker/types';

describe('MetricsValidator', () => {
  let validator: MetricsValidator;

  beforeEach(() => {
    validator = new MetricsValidator();
  });

  describe('validateMetrics', () => {
    it('should validate valid metrics successfully', async () => {
      const validMetrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5
        },
        timestamp: new Date(),
        isValid: true
      };

      const results = await validator.validateMetrics(validMetrics);
      
      const errorResults = results.filter(r => !r.passed && r.severity === 'error');
      expect(errorResults).toHaveLength(0);
    });

    it('should detect negative metrics as errors', async () => {
      const invalidMetrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: -100,
          likes: -10,
          comments: 5,
          shares: 2
        },
        timestamp: new Date(),
        isValid: true
      };

      const results = await validator.validateMetrics(invalidMetrics);
      
      const errorResults = results.filter(r => !r.passed && r.severity === 'error');
      expect(errorResults.length).toBeGreaterThan(0);
      
      const viewsError = errorResults.find(r => r.rule === 'non_negative_views');
      const likesError = errorResults.find(r => r.rule === 'non_negative_likes');
      
      expect(viewsError).toBeDefined();
      expect(likesError).toBeDefined();
    });

    it('should detect invalid platform as error', async () => {
      const invalidMetrics = {
        platform: 'youtube',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5
        },
        timestamp: new Date(),
        isValid: true
      };

      const results = await validator.validateMetrics(invalidMetrics);
      
      const platformError = results.find(r => r.rule === 'valid_platform' && !r.passed);
      expect(platformError).toBeDefined();
      expect(platformError?.severity).toBe('error');
    });

    it('should detect unreasonable engagement ratio as warning', async () => {
      const suspiciousMetrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 100,
          likes: 150, // More likes than views - suspicious
          comments: 10,
          shares: 5
        },
        timestamp: new Date(),
        isValid: true
      };

      const results = await validator.validateMetrics(suspiciousMetrics);
      
      const warningResults = results.filter(r => !r.passed && r.severity === 'warning');
      expect(warningResults.length).toBeGreaterThan(0);
      
      const likesWarning = warningResults.find(r => r.rule === 'likes_not_exceed_views');
      expect(likesWarning).toBeDefined();
    });

    it('should handle empty or missing fields', async () => {
      const incompleteMetrics = {
        platform: 'tiktok',
        postId: '',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5
        }
      };

      const results = await validator.validateMetrics(incompleteMetrics);
      
      const postIdError = results.find(r => r.rule === 'valid_post_id' && !r.passed);
      expect(postIdError).toBeDefined();
    });
  });

  describe('isValid', () => {
    it('should return true for valid metrics', async () => {
      const validMetrics = {
        platform: 'instagram',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5
        },
        timestamp: new Date(),
        isValid: true
      };

      const isValid = await validator.isValid(validMetrics);
      expect(isValid).toBe(true);
    });

    it('should return false for invalid metrics', async () => {
      const invalidMetrics = {
        platform: 'invalid_platform',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: -100,
          likes: 100,
          comments: 10,
          shares: 5
        }
      };

      const isValid = await validator.isValid(invalidMetrics);
      expect(isValid).toBe(false);
    });
  });

  describe('calculateQualityScore', () => {
    it('should return 100 for perfect validation', async () => {
      const validMetrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5
        }
      };

      const results = await validator.validateMetrics(validMetrics);
      const score = validator.calculateQualityScore(results);
      
      expect(score).toBe(100);
    });

    it('should penalize errors more than warnings', async () => {
      const results = [
        { rule: 'test_error', field: 'test', passed: false, value: null, severity: 'error' as const },
        { rule: 'test_warning', field: 'test', passed: false, value: null, severity: 'warning' as const }
      ];

      const score = validator.calculateQualityScore(results);
      
      expect(score).toBe(75); // 100 - 20 (error) - 5 (warning)
    });

    it('should not go below 0', async () => {
      const results = Array(10).fill({
        rule: 'test_error',
        field: 'test',
        passed: false,
        value: null,
        severity: 'error' as const
      });

      const score = validator.calculateQualityScore(results);
      
      expect(score).toBe(0);
    });
  });

  describe('detectAnomalies', () => {
    it('should detect view spikes as anomalies', () => {
      const currentMetrics = {
        metrics: {
          views: 5000,
          likes: 100,
          comments: 10,
          shares: 5
        }
      };

      const historicalData = [
        { metrics: { views: 1000, likes: 100, comments: 10, shares: 5 } },
        { metrics: { views: 900, likes: 90, comments: 9, shares: 4 } },
        { metrics: { views: 1100, likes: 110, comments: 11, shares: 6 } }
      ];

      const isAnomaly = validator.detectAnomalies(currentMetrics, historicalData);
      expect(isAnomaly).toBe(true);
    });

    it('should not detect normal variations as anomalies', () => {
      const currentMetrics = {
        metrics: {
          views: 1200,
          likes: 120,
          comments: 12,
          shares: 6
        }
      };

      const historicalData = [
        { metrics: { views: 1000, likes: 100, comments: 10, shares: 5 } },
        { metrics: { views: 900, likes: 90, comments: 9, shares: 4 } },
        { metrics: { views: 1100, likes: 110, comments: 11, shares: 6 } }
      ];

      const isAnomaly = validator.detectAnomalies(currentMetrics, historicalData);
      expect(isAnomaly).toBe(false);
    });

    it('should return false when no historical data is provided', () => {
      const currentMetrics = {
        metrics: {
          views: 5000,
          likes: 100,
          comments: 10,
          shares: 5
        }
      };

      const isAnomaly = validator.detectAnomalies(currentMetrics, []);
      expect(isAnomaly).toBe(false);
    });
  });

  describe('custom rules', () => {
    it('should allow adding custom validation rules', async () => {
      const customRule: ValidationRule = {
        name: 'custom_test',
        field: 'customField',
        validator: (value: any) => value === 'expected',
        errorMessage: 'Custom field must be "expected"',
        severity: 'error'
      };

      validator.addCustomRule(customRule);

      const metrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        customField: 'unexpected',
        metrics: {
          views: 1000,
          likes: 100,
          comments: 10,
          shares: 5
        }
      };

      const results = await validator.validateMetrics(metrics);
      const customResult = results.find(r => r.rule === 'custom_test');
      
      expect(customResult).toBeDefined();
      expect(customResult?.passed).toBe(false);
    });

    it('should allow removing rules', async () => {
      validator.removeRule('non_negative_views');

      const metrics = {
        platform: 'tiktok',
        postId: 'post123',
        userId: 'user123',
        campaignId: 'campaign123',
        metrics: {
          views: -100, // This should normally fail validation
          likes: 100,
          comments: 10,
          shares: 5
        }
      };

      const results = await validator.validateMetrics(metrics);
      const viewsResult = results.find(r => r.rule === 'non_negative_views');
      
      expect(viewsResult).toBeUndefined();
    });
  });
});