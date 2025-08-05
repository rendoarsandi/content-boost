import {
  calculateOptimalRate,
  analyzeCampaignBudget,
  projectViewsAndEarnings,
  calculateBreakEven,
  analyzeCompetitiveRates,
  validateRateAndBudget,
  DEFAULT_RATE_CONFIG,
} from '../src/rate-calculation';

describe('Rate Calculation Utilities', () => {
  describe('calculateOptimalRate', () => {
    it('should calculate optimal rate within constraints', () => {
      const result = calculateOptimalRate(1000000, 1000, 5); // 1M budget, 1000 target views, 5% platform fee

      expect(result.ratePerView).toBeGreaterThanOrEqual(
        DEFAULT_RATE_CONFIG.minRatePerView
      );
      expect(result.ratePerView).toBeLessThanOrEqual(
        DEFAULT_RATE_CONFIG.maxRatePerView
      );
      expect(result.adjustedTargetViews).toBeGreaterThan(0);
      expect(result.budgetUtilization).toBeGreaterThan(0);
      expect(result.budgetUtilization).toBeLessThanOrEqual(100);
    });

    it('should adjust rate when too low', () => {
      const result = calculateOptimalRate(100000, 10000, 5); // Low budget, high target views

      expect(result.ratePerView).toBe(DEFAULT_RATE_CONFIG.minRatePerView);
      expect(result.isOptimal).toBe(false);
      expect(result.reason).toContain('adjusted to minimum');
    });

    it('should adjust rate when too high', () => {
      const result = calculateOptimalRate(100000000, 100, 5); // High budget, low target views

      expect(result.ratePerView).toBe(DEFAULT_RATE_CONFIG.maxRatePerView);
      expect(result.isOptimal).toBe(false);
      expect(result.reason).toContain('adjusted to maximum');
    });

    it('should throw error for invalid inputs', () => {
      expect(() => calculateOptimalRate(1000, 1000)).toThrow(
        'Budget must be at least'
      );
      expect(() => calculateOptimalRate(1000000, 0)).toThrow(
        'Target views must be positive'
      );
    });
  });

  describe('analyzeCampaignBudget', () => {
    it('should analyze viable campaign budget', () => {
      const result = analyzeCampaignBudget(1000000, 1000, 5);

      expect(result.isViable).toBe(true);
      expect(result.estimatedViews).toBeGreaterThan(0);
      expect(result.estimatedPlatformFee).toBeGreaterThan(0);
      expect(result.budgetUtilization).toBeGreaterThan(0);
    });

    it('should identify non-viable campaign', () => {
      const result = analyzeCampaignBudget(5000, 1000, 5); // Very low budget

      expect(result.isViable).toBe(false);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should provide recommendations', () => {
      const result = analyzeCampaignBudget(1000000, 100, 5); // Low rate

      expect(
        result.recommendations.some(rec => rec.includes('increasing rate'))
      ).toBe(true);
    });
  });

  describe('projectViewsAndEarnings', () => {
    it('should project earnings for different periods', () => {
      const result = projectViewsAndEarnings(1000, 1000, 0.85, 5);

      expect(result.daily.estimatedViews).toBe(1000);
      expect(result.weekly.estimatedViews).toBe(7000);
      expect(result.monthly.estimatedViews).toBe(30000);

      expect(result.daily.legitimacyRate).toBe(85);
      expect(result.daily.projectedPayout).toBeGreaterThan(0);
      expect(result.daily.projectedPlatformFee).toBeGreaterThan(0);
    });

    it('should handle zero views', () => {
      const result = projectViewsAndEarnings(0, 1000, 0.85, 5);

      expect(result.daily.estimatedViews).toBe(0);
      expect(result.daily.projectedPayout).toBe(0);
    });
  });

  describe('calculateBreakEven', () => {
    it('should calculate break-even point', () => {
      const result = calculateBreakEven(1000000, 1000, 5, 0.85);

      expect(result.requiredTotalViews).toBeGreaterThan(0);
      expect(result.requiredLegitimateViews).toBeGreaterThan(0);
      expect(result.breakEvenDays).toBeGreaterThan(0);
      expect(typeof result.isAchievable).toBe('boolean');
    });

    it('should identify achievable campaigns', () => {
      const result = calculateBreakEven(100000, 1000, 5, 0.85); // Reasonable budget

      expect(result.isAchievable).toBe(true);
      expect(result.breakEvenDays).toBeLessThanOrEqual(30);
    });
  });

  describe('analyzeCompetitiveRates', () => {
    it('should analyze competitive rates', () => {
      const marketRates = [500, 750, 1000, 1250, 1500];
      const result = analyzeCompetitiveRates(1000, marketRates, 1000000);

      expect(result.currentRate).toBe(1000);
      expect(result.marketAverage).toBe(1000);
      expect(result.marketMedian).toBe(1000);
      expect(result.percentile).toBe(40); // 2 out of 5 rates are lower than 1000
      expect(result.competitiveness).toBe('average');
      expect(result.recommendation).toBeDefined();
    });

    it('should handle empty market data', () => {
      const result = analyzeCompetitiveRates(1000, [], 1000000);

      expect(result.competitiveness).toBe('average');
      expect(result.recommendation).toContain('No market data');
    });

    it('should identify low rates', () => {
      const marketRates = [1000, 1500, 2000, 2500, 3000];
      const result = analyzeCompetitiveRates(500, marketRates, 1000000);

      expect(result.competitiveness).toBe('low');
      expect(result.suggestedRate).toBeDefined();
      expect(result.recommendation).toContain('increasing');
    });
  });

  describe('validateRateAndBudget', () => {
    it('should validate correct rate and budget', () => {
      const result = validateRateAndBudget(1000, 1000000);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should identify invalid rate', () => {
      const result = validateRateAndBudget(50, 1000000); // Below minimum

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('below minimum'))).toBe(
        true
      );
    });

    it('should identify invalid budget', () => {
      const result = validateRateAndBudget(1000, 5000); // Below minimum

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('below minimum'))).toBe(
        true
      );
    });

    it('should provide warnings', () => {
      const result = validateRateAndBudget(200, 50000000); // Low rate, high budget

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
