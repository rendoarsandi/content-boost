import { PayoutEngine, createPayoutEngine, PayoutBatch, PayoutJob } from '../src/payout-engine';
import { PaymentCalculation } from '../src/payment';

describe('PayoutEngine', () => {
  let payoutEngine: PayoutEngine;
  let mockGetActivePromotions: jest.Mock;
  let mockGetViewRecords: jest.Mock;

  beforeEach(() => {
    payoutEngine = createPayoutEngine({
      timezone: 'Asia/Jakarta',
      platformFeePercentage: 5,
      minPayoutAmount: 1000,
      batchSize: 2,
      logLevel: 'error', // Suppress logs during tests
    });

    mockGetActivePromotions = jest.fn();
    mockGetViewRecords = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDailyPayouts', () => {
    it('should calculate payouts for active promotions', async () => {
      // Arrange
      const testDate = new Date('2024-01-15T00:00:00Z');
      
      mockGetActivePromotions.mockResolvedValue([
        {
          promoterId: 'promoter-1',
          campaignId: 'campaign-1',
          ratePerView: 1000,
        },
        {
          promoterId: 'promoter-2',
          campaignId: 'campaign-2',
          ratePerView: 1500,
        },
      ]);

      mockGetViewRecords.mockImplementation((promoterId: string) => {
        if (promoterId === 'promoter-1') {
          return Promise.resolve([
            { viewCount: 100, isLegitimate: true, timestamp: new Date('2024-01-14T10:00:00Z') },
            { viewCount: 50, isLegitimate: true, timestamp: new Date('2024-01-14T15:00:00Z') },
            { viewCount: 25, isLegitimate: false, timestamp: new Date('2024-01-14T20:00:00Z') }, // Bot views
          ]);
        } else {
          return Promise.resolve([
            { viewCount: 200, isLegitimate: true, timestamp: new Date('2024-01-14T12:00:00Z') },
            { viewCount: 100, isLegitimate: false, timestamp: new Date('2024-01-14T18:00:00Z') }, // Bot views
          ]);
        }
      });

      // Act
      const batch = await payoutEngine.calculateDailyPayouts(
        testDate,
        mockGetActivePromotions,
        mockGetViewRecords
      );

      // Assert
      expect(batch).toBeDefined();
      expect(batch.totalJobs).toBe(2);
      expect(batch.completedJobs).toBe(2);
      expect(batch.failedJobs).toBe(0);
      expect(batch.status).toBe('completed');

      // Check first promoter calculation
      const job1 = batch.jobs.find(j => j.promoterId === 'promoter-1');
      expect(job1).toBeDefined();
      expect(job1!.status).toBe('completed');
      expect(job1!.calculation).toBeDefined();
      expect(job1!.calculation!.legitimateViews).toBe(150); // 100 + 50
      expect(job1!.calculation!.totalViews).toBe(175); // 100 + 50 + 25
      expect(job1!.calculation!.grossAmount).toBe(150000); // 150 * 1000
      expect(job1!.calculation!.platformFee).toBe(7500); // 5% of 150000
      expect(job1!.calculation!.netAmount).toBe(142500); // 150000 - 7500

      // Check second promoter calculation
      const job2 = batch.jobs.find(j => j.promoterId === 'promoter-2');
      expect(job2).toBeDefined();
      expect(job2!.status).toBe('completed');
      expect(job2!.calculation).toBeDefined();
      expect(job2!.calculation!.legitimateViews).toBe(200);
      expect(job2!.calculation!.totalViews).toBe(300); // 200 + 100
      expect(job2!.calculation!.grossAmount).toBe(300000); // 200 * 1500
      expect(job2!.calculation!.platformFee).toBe(15000); // 5% of 300000
      expect(job2!.calculation!.netAmount).toBe(285000); // 300000 - 15000

      // Check batch totals
      expect(batch.totalAmount).toBe(427500); // 142500 + 285000
    });

    it('should handle minimum payout threshold', async () => {
      // Arrange
      const testDate = new Date('2024-01-15T00:00:00Z');
      
      mockGetActivePromotions.mockResolvedValue([
        {
          promoterId: 'promoter-1',
          campaignId: 'campaign-1',
          ratePerView: 100, // Low rate
        },
      ]);

      mockGetViewRecords.mockResolvedValue([
        { viewCount: 5, isLegitimate: true, timestamp: new Date('2024-01-14T10:00:00Z') },
      ]);

      // Act
      const batch = await payoutEngine.calculateDailyPayouts(
        testDate,
        mockGetActivePromotions,
        mockGetViewRecords
      );

      // Assert
      const job = batch.jobs[0];
      expect(job.calculation!.grossAmount).toBe(500); // 5 * 100
      expect(job.calculation!.netAmount).toBe(0); // Below minimum threshold
      expect(job.calculation!.platformFee).toBe(0); // No fee for zero payout
    });

    it('should handle errors gracefully', async () => {
      // Arrange
      const testDate = new Date('2024-01-15T00:00:00Z');
      
      mockGetActivePromotions.mockResolvedValue([
        {
          promoterId: 'promoter-1',
          campaignId: 'campaign-1',
          ratePerView: 1000,
        },
      ]);

      mockGetViewRecords.mockRejectedValue(new Error('Database connection failed'));

      // Act
      const batch = await payoutEngine.calculateDailyPayouts(
        testDate,
        mockGetActivePromotions,
        mockGetViewRecords
      );

      // Assert
      expect(batch.totalJobs).toBe(1);
      expect(batch.completedJobs).toBe(0);
      expect(batch.failedJobs).toBe(1);
      expect(batch.status).toBe('failed');
      expect(batch.jobs[0].status).toBe('failed');
      expect(batch.jobs[0].error).toContain('Database connection failed');
    });

    it('should prevent concurrent processing', async () => {
      // Arrange
      const testDate = new Date('2024-01-15T00:00:00Z');
      mockGetActivePromotions.mockResolvedValue([]);

      // Start first calculation
      const promise1 = payoutEngine.calculateDailyPayouts(
        testDate,
        mockGetActivePromotions,
        mockGetViewRecords
      );

      // Try to start second calculation immediately
      const promise2 = payoutEngine.calculateDailyPayouts(
        testDate,
        mockGetActivePromotions,
        mockGetViewRecords
      );

      // Act & Assert
      await expect(promise2).rejects.toThrow('Payout calculation is already in progress');
      await promise1; // Wait for first to complete
    });
  });

  describe('isDailyPayoutTime', () => {
    it('should return true at 00:00 WIB', () => {
      // Create a date that represents 00:00 WIB (17:00 UTC previous day)
      const wibMidnight = new Date('2024-01-15T17:00:00Z'); // This is 00:00 WIB on Jan 16
      
      // Mock the timezone conversion
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('1/16/2024, 12:00:00 AM');
      
      const result = payoutEngine.isDailyPayoutTime(wibMidnight);
      expect(result).toBe(true);
    });

    it('should return false at other times', () => {
      const notMidnight = new Date('2024-01-15T18:30:00Z'); // 01:30 WIB
      
      jest.spyOn(Date.prototype, 'toLocaleString').mockReturnValue('1/16/2024, 1:30:00 AM');
      
      const result = payoutEngine.isDailyPayoutTime(notMidnight);
      expect(result).toBe(false);
    });
  });

  describe('validatePayoutRules', () => {
    it('should validate correct payout calculation', () => {
      // Arrange
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

      // Act
      const validation = payoutEngine.validatePayoutRules(calculation);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect validation errors', () => {
      // Arrange - Invalid calculation with legitimate views > total views
      const calculation: PaymentCalculation = {
        totalViews: 800,
        legitimateViews: 1000, // Invalid: more than total
        botViews: 200,
        ratePerView: 1000,
        grossAmount: 800000,
        platformFeePercentage: 5,
        platformFee: 40000,
        netAmount: 760000,
        calculatedAt: new Date(),
      };

      // Act
      const validation = payoutEngine.validatePayoutRules(calculation);

      // Assert
      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('Legitimate views cannot exceed total views');
    });

    it('should detect high bot percentage warning', () => {
      // Arrange - High bot percentage
      const calculation: PaymentCalculation = {
        totalViews: 1000,
        legitimateViews: 300,
        botViews: 700, // 70% bots
        ratePerView: 1000,
        grossAmount: 300000,
        platformFeePercentage: 5,
        platformFee: 15000,
        netAmount: 285000,
        calculatedAt: new Date(),
      };

      // Act
      const validation = payoutEngine.validatePayoutRules(calculation);

      // Assert
      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('High bot percentage detected: 70.0%');
    });
  });

  describe('generatePayoutReport', () => {
    it('should generate comprehensive payout report', () => {
      // Arrange
      const batch: PayoutBatch = {
        id: 'test-batch-123',
        date: '2024-01-15',
        jobs: [
          {
            id: 'job-1',
            promoterId: 'promoter-1',
            campaignId: 'campaign-1',
            period: {
              start: new Date('2024-01-14T00:00:00Z'),
              end: new Date('2024-01-14T23:59:59Z'),
              promoterId: 'promoter-1',
              campaignId: 'campaign-1',
            },
            ratePerView: 1000,
            status: 'completed',
            calculation: {
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
            createdAt: new Date(),
            processedAt: new Date(),
          },
        ],
        totalJobs: 1,
        completedJobs: 1,
        failedJobs: 0,
        totalAmount: 760000,
        status: 'completed',
        startedAt: new Date('2024-01-15T00:00:00Z'),
        completedAt: new Date('2024-01-15T00:01:00Z'),
      };

      // Act
      const report = payoutEngine.generatePayoutReport(batch);

      // Assert
      expect(report).toContain('Daily Payout Report - 2024-01-15');
      expect(report).toContain('Batch ID: test-batch-123');
      expect(report).toContain('Status: COMPLETED');
      expect(report).toContain('Total Jobs: 1');
      expect(report).toContain('Completed: 1');
      expect(report).toContain('Failed: 0');
      expect(report).toContain('Success Rate: 100.0%');
      expect(report).toContain('Total Payout Amount: Rp760.000');
      expect(report).toContain('Duration: 60s');
    });

    it('should include failed jobs in report', () => {
      // Arrange
      const batch: PayoutBatch = {
        id: 'test-batch-456',
        date: '2024-01-15',
        jobs: [
          {
            id: 'job-1',
            promoterId: 'promoter-1',
            campaignId: 'campaign-1',
            period: {
              start: new Date('2024-01-14T00:00:00Z'),
              end: new Date('2024-01-14T23:59:59Z'),
              promoterId: 'promoter-1',
              campaignId: 'campaign-1',
            },
            ratePerView: 1000,
            status: 'failed',
            error: 'Database timeout',
            createdAt: new Date(),
            processedAt: new Date(),
          },
        ],
        totalJobs: 1,
        completedJobs: 0,
        failedJobs: 1,
        totalAmount: 0,
        status: 'failed',
        startedAt: new Date('2024-01-15T00:00:00Z'),
        completedAt: new Date('2024-01-15T00:01:00Z'),
      };

      // Act
      const report = payoutEngine.generatePayoutReport(batch);

      // Assert
      expect(report).toContain('Failed Jobs:');
      expect(report).toContain('promoter-1/campaign-1: Database timeout');
    });
  });

  describe('getStatus', () => {
    it('should return current engine status', () => {
      // Act
      const status = payoutEngine.getStatus();

      // Assert
      expect(status).toHaveProperty('isProcessing', false);
      expect(status).toHaveProperty('config');
      expect(status).toHaveProperty('nextPayoutTime');
      expect(status.config.timezone).toBe('Asia/Jakarta');
      expect(status.config.platformFeePercentage).toBe(5);
      expect(status.nextPayoutTime).toBeInstanceOf(Date);
    });
  });
});

describe('createPayoutEngine', () => {
  it('should create payout engine with default config', () => {
    // Act
    const engine = createPayoutEngine();

    // Assert
    expect(engine).toBeInstanceOf(PayoutEngine);
    const status = engine.getStatus();
    expect(status.config.timezone).toBe('Asia/Jakarta');
    expect(status.config.platformFeePercentage).toBe(5);
  });

  it('should create payout engine with custom config', () => {
    // Act
    const engine = createPayoutEngine({
      timezone: 'UTC',
      platformFeePercentage: 10,
      minPayoutAmount: 5000,
    });

    // Assert
    const status = engine.getStatus();
    expect(status.config.timezone).toBe('UTC');
    expect(status.config.platformFeePercentage).toBe(10);
    expect(status.config.minPayoutAmount).toBe(5000);
  });
});