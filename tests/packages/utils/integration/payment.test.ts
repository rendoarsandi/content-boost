import {
  calculatePayout,
  calculateDailyPayout,
  formatCurrency,
  formatCurrencyDetailed,
  calculateRetryDelay,
  validatePaymentAmount,
  calculatePlatformRevenue,
  generatePayoutSummary,
  PaymentCalculation,
  PayoutPeriod,
} from '../src/payment';

describe('Payment Utilities', () => {
  describe('calculatePayout', () => {
    it('should calculate payout correctly with default platform fee', () => {
      const result = calculatePayout(1000, 800, 1000); // 1000 total, 800 legitimate, 1000 per view

      expect(result.totalViews).toBe(1000);
      expect(result.legitimateViews).toBe(800);
      expect(result.botViews).toBe(200);
      expect(result.ratePerView).toBe(1000);
      expect(result.grossAmount).toBe(800000); // 800 * 1000
      expect(result.platformFeePercentage).toBe(5);
      expect(result.platformFee).toBe(40000); // 5% of 800000
      expect(result.netAmount).toBe(760000); // 800000 - 40000
      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should calculate payout with custom platform fee', () => {
      const result = calculatePayout(1000, 800, 1000, 10); // 10% platform fee

      expect(result.platformFeePercentage).toBe(10);
      expect(result.platformFee).toBe(80000); // 10% of 800000
      expect(result.netAmount).toBe(720000); // 800000 - 80000
    });

    it('should handle zero legitimate views', () => {
      const result = calculatePayout(1000, 0, 1000);

      expect(result.legitimateViews).toBe(0);
      expect(result.botViews).toBe(1000);
      expect(result.grossAmount).toBe(0);
      expect(result.platformFee).toBe(0);
      expect(result.netAmount).toBe(0);
    });

    it('should throw error for negative values', () => {
      expect(() => calculatePayout(-100, 50, 1000)).toThrow(
        'Views and rate must be non-negative numbers'
      );
      expect(() => calculatePayout(100, -50, 1000)).toThrow(
        'Views and rate must be non-negative numbers'
      );
      expect(() => calculatePayout(100, 50, -1000)).toThrow(
        'Views and rate must be non-negative numbers'
      );
    });

    it('should throw error when legitimate views exceed total views', () => {
      expect(() => calculatePayout(100, 150, 1000)).toThrow(
        'Legitimate views cannot exceed total views'
      );
    });

    it('should throw error for invalid platform fee percentage', () => {
      expect(() => calculatePayout(100, 50, 1000, -5)).toThrow(
        'Platform fee percentage must be between 0 and 100'
      );
      expect(() => calculatePayout(100, 50, 1000, 105)).toThrow(
        'Platform fee percentage must be between 0 and 100'
      );
    });
  });

  describe('calculateDailyPayout', () => {
    const payoutPeriod: PayoutPeriod = {
      start: new Date('2024-01-01T00:00:00Z'),
      end: new Date('2024-01-01T23:59:59Z'),
      promoterId: 'promoter-123',
      campaignId: 'campaign-456',
    };

    it('should calculate daily payout from view records', () => {
      const viewRecords = [
        {
          viewCount: 100,
          isLegitimate: true,
          timestamp: new Date('2024-01-01T10:00:00Z'),
        },
        {
          viewCount: 200,
          isLegitimate: true,
          timestamp: new Date('2024-01-01T15:00:00Z'),
        },
        {
          viewCount: 50,
          isLegitimate: false, // Bot views
          timestamp: new Date('2024-01-01T20:00:00Z'),
        },
        {
          viewCount: 75,
          isLegitimate: true,
          timestamp: new Date('2023-12-31T22:00:00Z'), // Outside period
        },
      ];

      const result = calculateDailyPayout(payoutPeriod, viewRecords, 1000);

      expect(result.totalViews).toBe(350); // 100 + 200 + 50 (within period)
      expect(result.legitimateViews).toBe(300); // 100 + 200 (legitimate within period)
      expect(result.botViews).toBe(50);
      expect(result.grossAmount).toBe(300000); // 300 * 1000
    });

    it('should handle empty view records', () => {
      const result = calculateDailyPayout(payoutPeriod, [], 1000);

      expect(result.totalViews).toBe(0);
      expect(result.legitimateViews).toBe(0);
      expect(result.grossAmount).toBe(0);
      expect(result.netAmount).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    it('should format Indonesian Rupiah correctly', () => {
      expect(formatCurrency(1000000)).toBe('Rp1.000.000');
      expect(formatCurrency(500)).toBe('Rp500');
      expect(formatCurrency(0)).toBe('Rp0');
    });

    it('should format other currencies', () => {
      expect(formatCurrency(1000, 'USD')).toContain('1.000');
    });
  });

  describe('formatCurrencyDetailed', () => {
    it('should format with decimal places', () => {
      expect(formatCurrencyDetailed(1000000.5)).toBe('Rp1.000.000,50');
      expect(formatCurrencyDetailed(500.25)).toBe('Rp500,25');
    });
  });

  describe('calculateRetryDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      expect(calculateRetryDelay(1)).toBe(1000); // Base delay
      expect(calculateRetryDelay(2)).toBe(2000); // 1000 * 2^1
      expect(calculateRetryDelay(3)).toBe(4000); // 1000 * 2^2
    });

    it('should respect maximum delay', () => {
      const config = {
        maxRetries: 5,
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        backoffMultiplier: 2,
      };

      expect(calculateRetryDelay(5, config)).toBe(5000); // Capped at maxDelayMs
    });

    it('should throw error for attempts exceeding max retries', () => {
      expect(() => calculateRetryDelay(4)).toThrow(
        'Attempt number 4 exceeds max retries 3'
      );
    });
  });

  describe('validatePaymentAmount', () => {
    it('should validate payment amounts correctly', () => {
      expect(validatePaymentAmount(5000)).toBe(true);
      expect(validatePaymentAmount(1000)).toBe(true); // Minimum
      expect(validatePaymentAmount(999)).toBe(false); // Below minimum
      expect(validatePaymentAmount(0)).toBe(false);
      expect(validatePaymentAmount(-100)).toBe(false);
    });

    it('should use custom minimum amount', () => {
      expect(validatePaymentAmount(500, 100)).toBe(true);
      expect(validatePaymentAmount(50, 100)).toBe(false);
    });
  });

  describe('calculatePlatformRevenue', () => {
    it('should calculate platform revenue from multiple payouts', () => {
      const payouts: PaymentCalculation[] = [
        {
          totalViews: 1000,
          legitimateViews: 800,
          botViews: 200,
          ratePerView: 1000,
          grossAmount: 800000,
          platformFeePercentage: 5,
          platformFee: 40000,
          netAmount: 760000,
          calculatedAt: new Date(),
        },
        {
          totalViews: 500,
          legitimateViews: 400,
          botViews: 100,
          ratePerView: 1500,
          grossAmount: 600000,
          platformFeePercentage: 5,
          platformFee: 30000,
          netAmount: 570000,
          calculatedAt: new Date(),
        },
      ];

      const period = {
        start: new Date('2024-01-01'),
        end: new Date('2024-01-31'),
      };

      const result = calculatePlatformRevenue(payouts, period);

      expect(result.totalGrossAmount).toBe(1400000);
      expect(result.totalPlatformFees).toBe(70000);
      expect(result.totalNetPayouts).toBe(1330000);
      expect(result.payoutCount).toBe(2);
      expect(result.period).toEqual(period);
    });
  });

  describe('generatePayoutSummary', () => {
    it('should generate readable payout summary', () => {
      const calculation: PaymentCalculation = {
        totalViews: 1000,
        legitimateViews: 800,
        botViews: 200,
        ratePerView: 1000,
        grossAmount: 800000,
        platformFeePercentage: 5,
        platformFee: 40000,
        netAmount: 760000,
        calculatedAt: new Date(),
      };

      const summary = generatePayoutSummary(calculation);

      expect(summary).toContain('Total Views: 1.000');
      expect(summary).toContain('Legitimate Views: 800 (80.0%)');
      expect(summary).toContain('Bot Views: 200');
      expect(summary).toContain('Rate per View: Rp1.000');
      expect(summary).toContain('Gross Amount: Rp800.000');
      expect(summary).toContain('Platform Fee (5%): Rp40.000');
      expect(summary).toContain('Net Payout: Rp760.000');
    });

    it('should handle zero total views', () => {
      const calculation: PaymentCalculation = {
        totalViews: 0,
        legitimateViews: 0,
        botViews: 0,
        ratePerView: 1000,
        grossAmount: 0,
        platformFeePercentage: 5,
        platformFee: 0,
        netAmount: 0,
        calculatedAt: new Date(),
      };

      const summary = generatePayoutSummary(calculation);

      expect(summary).toContain('Legitimate Views: 0 (0.0%)');
    });
  });
});
