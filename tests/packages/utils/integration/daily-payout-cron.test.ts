import {
  DailyPayoutCron,
  createDailyPayoutCron,
  PayoutCronDependencies,
} from '@repo/utils/daily-payout-cron';
import { PayoutBatch } from '@repo/utils/payout-engine';

describe('DailyPayoutCron', () => {
  let dailyPayoutCron: DailyPayoutCron;
  let mockDependencies: PayoutCronDependencies;

  beforeEach(() => {
    mockDependencies = {
      getActivePromotions: jest.fn(),
      getViewRecords: jest.fn(),
      savePayoutBatch: jest.fn(),
      savePayouts: jest.fn(),
      updatePlatformRevenue: jest.fn(),
      sendPayoutNotifications: jest.fn(),
    };

    dailyPayoutCron = createDailyPayoutCron(mockDependencies, {
      timezone: 'Asia/Jakarta',
      platformFeePercentage: 5,
      minPayoutAmount: 1000,
      enableNotifications: false, // Disable for tests
      logLevel: 'error', // Suppress logs during tests
      retryFailedPayouts: false, // Disable for tests
    });
  });

  afterEach(() => {
    dailyPayoutCron.stop();
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with default configuration', () => {
      // Act
      const cron = createDailyPayoutCron(mockDependencies);
      const status = cron.getStatus();

      // Assert
      expect(status.config.timezone).toBe('Asia/Jakarta');
      expect(status.config.platformFeePercentage).toBe(5);
      expect(status.config.minPayoutAmount).toBe(1000);
      expect(status.config.enableNotifications).toBe(true);
      expect(status.scheduler.totalJobs).toBeGreaterThan(0);
    });

    it('should initialize with custom configuration', () => {
      // Act
      const cron = createDailyPayoutCron(mockDependencies, {
        timezone: 'UTC',
        platformFeePercentage: 10,
        minPayoutAmount: 5000,
        enableNotifications: false,
      });
      const status = cron.getStatus();

      // Assert
      expect(status.config.timezone).toBe('UTC');
      expect(status.config.platformFeePercentage).toBe(10);
      expect(status.config.minPayoutAmount).toBe(5000);
      expect(status.config.enableNotifications).toBe(false);
    });
  });

  describe('start and stop', () => {
    it('should start and stop the cron system', () => {
      // Act
      dailyPayoutCron.start();
      let status = dailyPayoutCron.getStatus();
      expect(status.isRunning).toBe(true);

      dailyPayoutCron.stop();
      status = dailyPayoutCron.getStatus();
      expect(status.isRunning).toBe(false);
    });

    it('should handle multiple start calls gracefully', () => {
      // Act
      dailyPayoutCron.start();
      dailyPayoutCron.start(); // Should not throw

      // Assert
      const status = dailyPayoutCron.getStatus();
      expect(status.isRunning).toBe(true);
    });

    it('should handle multiple stop calls gracefully', () => {
      // Act
      dailyPayoutCron.start();
      dailyPayoutCron.stop();
      dailyPayoutCron.stop(); // Should not throw

      // Assert
      const status = dailyPayoutCron.getStatus();
      expect(status.isRunning).toBe(false);
    });
  });

  describe('executeManualPayout', () => {
    it('should execute manual payout successfully', async () => {
      // Arrange
      const testDate = new Date('2024-01-15T00:00:00Z');

      (mockDependencies.getActivePromotions as jest.Mock).mockResolvedValue([
        {
          promoterId: 'promoter-1',
          campaignId: 'campaign-1',
          ratePerView: 1000,
        },
      ]);

      (mockDependencies.getViewRecords as jest.Mock).mockResolvedValue([
        {
          viewCount: 100,
          isLegitimate: true,
          timestamp: new Date('2024-01-14T10:00:00Z'),
        },
        {
          viewCount: 50,
          isLegitimate: true,
          timestamp: new Date('2024-01-14T15:00:00Z'),
        },
      ]);

      (mockDependencies.savePayoutBatch as jest.Mock).mockResolvedValue(
        undefined
      );

      // Act
      const batch = await dailyPayoutCron.executeManualPayout(testDate);

      // Assert
      expect(batch).toBeDefined();
      expect(batch.totalJobs).toBe(1);
      expect(batch.completedJobs).toBe(1);
      expect(batch.status).toBe('completed');

      // Verify dependencies were called
      expect(mockDependencies.getActivePromotions).toHaveBeenCalledTimes(1);
      expect(mockDependencies.getViewRecords).toHaveBeenCalledTimes(1);
      expect(mockDependencies.savePayoutBatch).toHaveBeenCalledWith(batch);
    });

    it('should handle errors during manual payout', async () => {
      // Arrange
      (mockDependencies.getActivePromotions as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      // Act & Assert
      await expect(dailyPayoutCron.executeManualPayout()).rejects.toThrow(
        'Database connection failed'
      );
    });
  });

  describe('getStatus', () => {
    it('should return comprehensive status information', () => {
      // Act
      const status = dailyPayoutCron.getStatus();

      // Assert
      expect(status).toHaveProperty('isRunning');
      expect(status).toHaveProperty('scheduler');
      expect(status).toHaveProperty('payoutEngine');
      expect(status).toHaveProperty('config');

      expect(status.scheduler).toHaveProperty('totalJobs');
      expect(status.scheduler).toHaveProperty('enabledJobs');
      expect(status.scheduler).toHaveProperty('runningJobs');

      expect(status.payoutEngine).toHaveProperty('isProcessing');
      expect(status.payoutEngine).toHaveProperty('nextPayoutTime');

      expect(status.config).toHaveProperty('timezone');
      expect(status.config).toHaveProperty('platformFeePercentage');
    });
  });

  describe('updateConfig', () => {
    it('should update configuration successfully', () => {
      // Arrange
      const newConfig = {
        platformFeePercentage: 10,
        minPayoutAmount: 5000,
        enableNotifications: true,
      };

      // Act
      dailyPayoutCron.updateConfig(newConfig);
      const status = dailyPayoutCron.getStatus();

      // Assert
      expect(status.config.platformFeePercentage).toBe(10);
      expect(status.config.minPayoutAmount).toBe(5000);
      expect(status.config.enableNotifications).toBe(true);
      expect(status.config.timezone).toBe('Asia/Jakarta'); // Should preserve existing values
    });
  });

  describe('integration with dependencies', () => {
    it('should call all required dependencies during payout execution', async () => {
      // Arrange
      const testDate = new Date('2024-01-15T00:00:00Z');

      (mockDependencies.getActivePromotions as jest.Mock).mockResolvedValue([
        {
          promoterId: 'promoter-1',
          campaignId: 'campaign-1',
          applicationId: 'app-1',
          ratePerView: 1000,
        },
        {
          promoterId: 'promoter-2',
          campaignId: 'campaign-2',
          ratePerView: 1500,
        },
      ]);

      (mockDependencies.getViewRecords as jest.Mock).mockImplementation(
        (promoterId: string) => {
          if (promoterId === 'promoter-1') {
            return Promise.resolve([
              {
                viewCount: 100,
                isLegitimate: true,
                timestamp: new Date('2024-01-14T10:00:00Z'),
              },
            ]);
          } else {
            return Promise.resolve([
              {
                viewCount: 200,
                isLegitimate: true,
                timestamp: new Date('2024-01-14T12:00:00Z'),
              },
            ]);
          }
        }
      );

      (mockDependencies.savePayoutBatch as jest.Mock).mockResolvedValue(
        undefined
      );
      (mockDependencies.savePayouts as jest.Mock).mockResolvedValue(undefined);
      (mockDependencies.updatePlatformRevenue as jest.Mock).mockResolvedValue(
        undefined
      );

      // Act
      const batch = await dailyPayoutCron.executeManualPayout(testDate);

      // Assert
      expect(mockDependencies.getActivePromotions).toHaveBeenCalledTimes(1);
      expect(mockDependencies.getViewRecords).toHaveBeenCalledTimes(2);
      expect(mockDependencies.savePayoutBatch).toHaveBeenCalledWith(batch);

      // Check savePayouts was called with correct data
      expect(mockDependencies.savePayouts).toHaveBeenCalledTimes(1);
      const savedPayouts = (mockDependencies.savePayouts as jest.Mock).mock
        .calls[0][0];
      expect(savedPayouts).toHaveLength(2);
      expect(savedPayouts[0]).toMatchObject({
        promoterId: 'promoter-1',
        campaignId: 'campaign-1',
        applicationId: 'app-1',
        status: 'completed',
      });
      expect(savedPayouts[1]).toMatchObject({
        promoterId: 'promoter-2',
        campaignId: 'campaign-2',
        status: 'completed',
      });

      // Check platform revenue was updated
      expect(mockDependencies.updatePlatformRevenue).toHaveBeenCalledTimes(1);
      const [period, totalFees] = (
        mockDependencies.updatePlatformRevenue as jest.Mock
      ).mock.calls[0];
      expect(period).toHaveProperty('start');
      expect(period).toHaveProperty('end');
      expect(totalFees).toBeGreaterThan(0);
    });

    it('should handle partial failures gracefully', async () => {
      // Arrange
      const testDate = new Date('2024-01-15T00:00:00Z');

      (mockDependencies.getActivePromotions as jest.Mock).mockResolvedValue([
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

      // First promoter succeeds, second fails
      (mockDependencies.getViewRecords as jest.Mock).mockImplementation(
        (promoterId: string) => {
          if (promoterId === 'promoter-1') {
            return Promise.resolve([
              {
                viewCount: 100,
                isLegitimate: true,
                timestamp: new Date('2024-01-14T10:00:00Z'),
              },
            ]);
          } else {
            return Promise.reject(new Error('Database timeout'));
          }
        }
      );

      (mockDependencies.savePayoutBatch as jest.Mock).mockResolvedValue(
        undefined
      );
      (mockDependencies.savePayouts as jest.Mock).mockResolvedValue(undefined);
      (mockDependencies.updatePlatformRevenue as jest.Mock).mockResolvedValue(
        undefined
      );

      // Act
      const batch = await dailyPayoutCron.executeManualPayout(testDate);

      // Assert
      expect(batch.totalJobs).toBe(2);
      expect(batch.completedJobs).toBe(1);
      expect(batch.failedJobs).toBe(1);
      expect(batch.status).toBe('failed');

      // Check that both successful and failed payouts were saved
      const savedPayouts = (mockDependencies.savePayouts as jest.Mock).mock
        .calls[0][0];
      expect(savedPayouts).toHaveLength(2);

      const successfulPayout = savedPayouts.find(
        (p: any) => p.status === 'completed'
      );
      const failedPayout = savedPayouts.find((p: any) => p.status === 'failed');

      expect(successfulPayout).toBeDefined();
      expect(successfulPayout.promoterId).toBe('promoter-1');

      expect(failedPayout).toBeDefined();
      expect(failedPayout.promoterId).toBe('promoter-2');
      expect(failedPayout.failureReason).toContain('Database timeout');
    });
  });
});

describe('createDailyPayoutCron', () => {
  it('should create daily payout cron with dependencies', () => {
    // Arrange
    const mockDependencies: PayoutCronDependencies = {
      getActivePromotions: jest.fn(),
      getViewRecords: jest.fn(),
      savePayoutBatch: jest.fn(),
      savePayouts: jest.fn(),
      updatePlatformRevenue: jest.fn(),
    };

    // Act
    const cron = createDailyPayoutCron(mockDependencies);

    // Assert
    expect(cron).toBeInstanceOf(DailyPayoutCron);
    const status = cron.getStatus();
    expect(status.config.timezone).toBe('Asia/Jakarta');
  });

  it('should create daily payout cron with custom config', () => {
    // Arrange
    const mockDependencies: PayoutCronDependencies = {
      getActivePromotions: jest.fn(),
      getViewRecords: jest.fn(),
      savePayoutBatch: jest.fn(),
      savePayouts: jest.fn(),
      updatePlatformRevenue: jest.fn(),
    };

    const config = {
      timezone: 'UTC',
      platformFeePercentage: 10,
      enableNotifications: false,
    };

    // Act
    const cron = createDailyPayoutCron(mockDependencies, config);

    // Assert
    const status = cron.getStatus();
    expect(status.config.timezone).toBe('UTC');
    expect(status.config.platformFeePercentage).toBe(10);
    expect(status.config.enableNotifications).toBe(false);
  });
});
