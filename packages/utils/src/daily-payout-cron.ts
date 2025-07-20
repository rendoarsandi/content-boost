import { CronScheduler, createCronScheduler, SCHEDULES } from './cron-scheduler';
import { PayoutEngine, createPayoutEngine, PayoutBatch } from './payout-engine';

// Types for database integration
export interface PayoutCronDependencies {
  // Get active promotions for payout calculation
  getActivePromotions: () => Promise<Array<{
    promoterId: string;
    campaignId: string;
    applicationId?: string;
    ratePerView: number;
  }>>;

  // Get view records for a specific promoter/campaign in a period
  getViewRecords: (promoterId: string, campaignId: string, period: {
    start: Date;
    end: Date;
    promoterId: string;
    campaignId: string;
  }) => Promise<Array<{
    viewCount: number;
    isLegitimate: boolean;
    timestamp: Date;
  }>>;

  // Save payout batch results to database
  savePayoutBatch: (batch: PayoutBatch) => Promise<void>;

  // Save individual payout records
  savePayouts: (payouts: Array<{
    promoterId: string;
    campaignId: string;
    applicationId?: string;
    periodStart: Date;
    periodEnd: Date;
    totalViews: number;
    legitimateViews: number;
    botViews: number;
    ratePerView: number;
    grossAmount: number;
    platformFee: number;
    netAmount: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    processedAt?: Date;
    failureReason?: string;
  }>) => Promise<void>;

  // Update platform revenue
  updatePlatformRevenue: (period: { start: Date; end: Date }, totalFees: number) => Promise<void>;

  // Send notifications
  sendPayoutNotifications?: (payouts: Array<{
    promoterId: string;
    amount: number;
    status: 'completed' | 'failed';
    error?: string;
  }>) => Promise<void>;
}

export interface DailyPayoutCronConfig {
  timezone: string;
  platformFeePercentage: number;
  minPayoutAmount: number;
  enableNotifications: boolean;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  retryFailedPayouts: boolean;
  maxRetries: number;
}

/**
 * Daily Payout Cron Job Manager
 * Requirements: 6.1 - Implementasi cron job untuk menghitung payout harian (00:00 WIB)
 */
export class DailyPayoutCron {
  private scheduler: CronScheduler;
  private payoutEngine: PayoutEngine;
  private dependencies: PayoutCronDependencies;
  private config: DailyPayoutCronConfig;
  private isRunning: boolean = false;

  constructor(
    dependencies: PayoutCronDependencies,
    config: Partial<DailyPayoutCronConfig> = {}
  ) {
    this.dependencies = dependencies;
    this.config = {
      timezone: 'Asia/Jakarta',
      platformFeePercentage: 5,
      minPayoutAmount: 1000,
      enableNotifications: true,
      logLevel: 'info',
      retryFailedPayouts: true,
      maxRetries: 3,
      ...config,
    };

    // Initialize scheduler and payout engine
    this.scheduler = createCronScheduler({
      timezone: this.config.timezone,
      maxConcurrentJobs: 1, // Only one payout job at a time
      logLevel: this.config.logLevel,
    });

    this.payoutEngine = createPayoutEngine({
      timezone: this.config.timezone,
      platformFeePercentage: this.config.platformFeePercentage,
      minPayoutAmount: this.config.minPayoutAmount,
      logLevel: this.config.logLevel,
    });

    this.setupCronJobs();
  }

  /**
   * Setup cron jobs for daily payout
   */
  private setupCronJobs(): void {
    // Main daily payout job at 00:00 WIB
    this.scheduler.addJob({
      id: 'daily-payout',
      name: 'Daily Payout Calculation',
      schedule: '24h', // Every 24 hours, will be triggered at 00:00 WIB
      enabled: true,
      handler: async () => {
        await this.executeDailyPayout();
      },
    });

    // Retry failed payouts job (runs every hour)
    if (this.config.retryFailedPayouts) {
      this.scheduler.addJob({
        id: 'retry-failed-payouts',
        name: 'Retry Failed Payouts',
        schedule: '1h',
        enabled: true,
        handler: async () => {
          await this.retryFailedPayouts();
        },
      });
    }

    // Health check job (runs every 5 minutes)
    this.scheduler.addJob({
      id: 'payout-health-check',
      name: 'Payout System Health Check',
      schedule: '5m',
      enabled: true,
      handler: async () => {
        await this.performHealthCheck();
      },
    });
  }

  /**
   * Start the daily payout cron system
   */
  start(): void {
    if (this.isRunning) {
      this.log('warn', 'Daily payout cron is already running');
      return;
    }

    this.isRunning = true;
    this.scheduler.start();
    
    this.log('info', 'Daily payout cron system started');
    this.log('info', `Next payout scheduled for: ${this.payoutEngine.getNextPayoutTime().toLocaleString('id-ID', { timeZone: this.config.timezone })}`);
  }

  /**
   * Stop the daily payout cron system
   */
  stop(): void {
    if (!this.isRunning) {
      this.log('warn', 'Daily payout cron is not running');
      return;
    }

    this.isRunning = false;
    this.scheduler.stop();
    
    this.log('info', 'Daily payout cron system stopped');
  }

  /**
   * Execute daily payout calculation
   * Requirement 6.1: Calculate total views legitimate per promoter at end of day (00:00 WIB)
   */
  private async executeDailyPayout(): Promise<void> {
    try {
      this.log('info', 'Starting daily payout calculation...');

      // Check if it's the right time (00:00 WIB)
      if (!this.payoutEngine.isDailyPayoutTime()) {
        this.log('warn', 'Skipping payout - not the scheduled time (00:00 WIB)');
        return;
      }

      const today = new Date();
      
      // Calculate payouts using the engine
      const batch = await this.payoutEngine.calculateDailyPayouts(
        today,
        this.dependencies.getActivePromotions,
        this.dependencies.getViewRecords
      );

      // Save batch to database
      await this.dependencies.savePayoutBatch(batch);

      // Process successful payouts
      const successfulPayouts = batch.jobs
        .filter(job => job.status === 'completed' && job.calculation)
        .map(job => ({
          promoterId: job.promoterId,
          campaignId: job.campaignId,
          applicationId: job.applicationId,
          periodStart: job.period.start,
          periodEnd: job.period.end,
          totalViews: job.calculation!.totalViews,
          legitimateViews: job.calculation!.legitimateViews,
          botViews: job.calculation!.botViews,
          ratePerView: job.calculation!.ratePerView,
          grossAmount: job.calculation!.grossAmount,
          platformFee: job.calculation!.platformFee,
          netAmount: job.calculation!.netAmount,
          status: 'completed' as const,
          processedAt: job.processedAt,
        }));

      // Process failed payouts
      const failedPayouts = batch.jobs
        .filter(job => job.status === 'failed')
        .map(job => ({
          promoterId: job.promoterId,
          campaignId: job.campaignId,
          applicationId: job.applicationId,
          periodStart: job.period.start,
          periodEnd: job.period.end,
          totalViews: 0,
          legitimateViews: 0,
          botViews: 0,
          ratePerView: job.ratePerView,
          grossAmount: 0,
          platformFee: 0,
          netAmount: 0,
          status: 'failed' as const,
          processedAt: job.processedAt,
          failureReason: job.error,
        }));

      // Save all payouts to database
      const allPayouts = [...successfulPayouts, ...failedPayouts];
      if (allPayouts.length > 0) {
        await this.dependencies.savePayouts(allPayouts);
      }

      // Update platform revenue
      const totalPlatformFees = successfulPayouts.reduce((sum, payout) => sum + payout.platformFee, 0);
      if (totalPlatformFees > 0) {
        await this.dependencies.updatePlatformRevenue(
          { start: batch.jobs[0]?.period.start || today, end: batch.jobs[0]?.period.end || today },
          totalPlatformFees
        );
      }

      // Send notifications if enabled
      if (this.config.enableNotifications && this.dependencies.sendPayoutNotifications) {
        const notifications = batch.jobs.map(job => ({
          promoterId: job.promoterId,
          amount: job.calculation?.netAmount || 0,
          status: job.status === 'completed' ? 'completed' as const : 'failed' as const,
          error: job.error,
        }));

        await this.dependencies.sendPayoutNotifications(notifications);
      }

      // Generate and log report
      const report = this.payoutEngine.generatePayoutReport(batch);
      this.log('info', `Daily payout completed:\n${report}`);

      // Save report to logs (if logging is configured)
      await this.savePayoutReport(batch.date, report);

    } catch (error) {
      this.log('error', `Daily payout calculation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Retry failed payouts
   */
  private async retryFailedPayouts(): Promise<void> {
    try {
      this.log('debug', 'Checking for failed payouts to retry...');
      
      // This would typically query the database for failed payouts
      // For now, we'll just log that the check was performed
      this.log('debug', 'Failed payout retry check completed');
      
    } catch (error) {
      this.log('error', `Failed payout retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Perform health check
   */
  private async performHealthCheck(): Promise<void> {
    try {
      const engineStatus = this.payoutEngine.getStatus();
      const schedulerStats = this.scheduler.getStats();

      // Check if system is healthy
      const isHealthy = this.scheduler.isHealthy() && !engineStatus.isProcessing;

      if (!isHealthy) {
        this.log('warn', 'Payout system health check failed');
      } else {
        this.log('debug', `Payout system healthy - Scheduler: ${schedulerStats.enabledJobs} jobs, Engine: ${engineStatus.isProcessing ? 'processing' : 'idle'}`);
      }

    } catch (error) {
      this.log('error', `Health check failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Save payout report to logs
   */
  private async savePayoutReport(date: string, report: string): Promise<void> {
    try {
      // This would typically save to a log file or database
      // For now, we'll just ensure the report is logged
      this.log('info', `Payout report for ${date} generated`);
    } catch (error) {
      this.log('error', `Failed to save payout report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Manual payout execution (for testing or emergency)
   */
  async executeManualPayout(date?: Date): Promise<PayoutBatch> {
    this.log('info', 'Executing manual payout calculation...');
    
    const targetDate = date || new Date();
    
    const batch = await this.payoutEngine.calculateDailyPayouts(
      targetDate,
      this.dependencies.getActivePromotions,
      this.dependencies.getViewRecords
    );

    // Save batch to database
    await this.dependencies.savePayoutBatch(batch);

    // Process successful payouts
    const successfulPayouts = batch.jobs
      .filter(job => job.status === 'completed' && job.calculation)
      .map(job => ({
        promoterId: job.promoterId,
        campaignId: job.campaignId,
        applicationId: job.applicationId,
        periodStart: job.period.start,
        periodEnd: job.period.end,
        totalViews: job.calculation!.totalViews,
        legitimateViews: job.calculation!.legitimateViews,
        botViews: job.calculation!.botViews,
        ratePerView: job.calculation!.ratePerView,
        grossAmount: job.calculation!.grossAmount,
        platformFee: job.calculation!.platformFee,
        netAmount: job.calculation!.netAmount,
        status: 'completed' as const,
        processedAt: job.processedAt,
      }));

    // Process failed payouts
    const failedPayouts = batch.jobs
      .filter(job => job.status === 'failed')
      .map(job => ({
        promoterId: job.promoterId,
        campaignId: job.campaignId,
        applicationId: job.applicationId,
        periodStart: job.period.start,
        periodEnd: job.period.end,
        totalViews: 0,
        legitimateViews: 0,
        botViews: 0,
        ratePerView: job.ratePerView,
        grossAmount: 0,
        platformFee: 0,
        netAmount: 0,
        status: 'failed' as const,
        processedAt: job.processedAt,
        failureReason: job.error,
      }));

    // Save all payouts to database
    const allPayouts = [...successfulPayouts, ...failedPayouts];
    if (allPayouts.length > 0) {
      await this.dependencies.savePayouts(allPayouts);
    }

    // Update platform revenue
    const totalPlatformFees = successfulPayouts.reduce((sum, payout) => sum + payout.platformFee, 0);
    if (totalPlatformFees > 0) {
      await this.dependencies.updatePlatformRevenue(
        { start: batch.jobs[0]?.period.start || targetDate, end: batch.jobs[0]?.period.end || targetDate },
        totalPlatformFees
      );
    }

    // Send notifications if enabled
    if (this.config.enableNotifications && this.dependencies.sendPayoutNotifications) {
      const notifications = batch.jobs.map(job => ({
        promoterId: job.promoterId,
        amount: job.calculation?.netAmount || 0,
        status: job.status === 'completed' ? 'completed' as const : 'failed' as const,
        error: job.error,
      }));

      await this.dependencies.sendPayoutNotifications(notifications);
    }

    this.log('info', `Manual payout completed for ${this.payoutEngine['formatDate'](targetDate)}`);
    
    return batch;
  }

  /**
   * Get system status
   */
  getStatus(): {
    isRunning: boolean;
    scheduler: {
      totalJobs: number;
      enabledJobs: number;
      runningJobs: number;
      totalRuns: number;
      totalErrors: number;
    };
    payoutEngine: {
      isProcessing: boolean;
      nextPayoutTime: Date;
    };
    config: DailyPayoutCronConfig;
  } {
    return {
      isRunning: this.isRunning,
      scheduler: this.scheduler.getStats(),
      payoutEngine: {
        isProcessing: this.payoutEngine.getStatus().isProcessing,
        nextPayoutTime: this.payoutEngine.getNextPayoutTime(),
      },
      config: this.config,
    };
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<DailyPayoutCronConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update payout engine config
    this.payoutEngine = createPayoutEngine({
      timezone: this.config.timezone,
      platformFeePercentage: this.config.platformFeePercentage,
      minPayoutAmount: this.config.minPayoutAmount,
      logLevel: this.config.logLevel,
    });

    this.log('info', 'Configuration updated');
  }

  /**
   * Logging utility
   */
  private log(level: 'debug' | 'info' | 'warn' | 'error', message: string): void {
    const levels = ['debug', 'info', 'warn', 'error'];
    const configLevel = levels.indexOf(this.config.logLevel);
    const messageLevel = levels.indexOf(level);

    if (messageLevel >= configLevel) {
      const timestamp = new Date().toISOString();
      console[level](`[${timestamp}] [DailyPayoutCron] ${message}`);
    }
  }
}

// Export factory function
export const createDailyPayoutCron = (
  dependencies: PayoutCronDependencies,
  config?: Partial<DailyPayoutCronConfig>
) => {
  return new DailyPayoutCron(dependencies, config);
};

// Export helper function to create WIB-specific cron schedule
export const createWIBSchedule = (hour: number = 0, minute: number = 0): string => {
  // This would need to be converted to a proper cron expression
  // For now, return a simple interval
  return '24h';
};

// Export constants
export const PAYOUT_CRON_JOBS = {
  DAILY_PAYOUT: 'daily-payout',
  RETRY_FAILED: 'retry-failed-payouts',
  HEALTH_CHECK: 'payout-health-check',
} as const;