import { z } from 'zod';
import { calculateDailyPayout, PaymentCalculation, PayoutPeriod } from './payment';

// Types for payout engine
export interface PayoutEngineConfig {
  timezone: string;
  platformFeePercentage: number;
  minPayoutAmount: number;
  batchSize: number;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface PayoutJob {
  id: string;
  promoterId: string;
  campaignId: string;
  applicationId?: string;
  period: PayoutPeriod;
  ratePerView: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  calculation?: PaymentCalculation;
  error?: string;
  createdAt: Date;
  processedAt?: Date;
}

export interface PayoutBatch {
  id: string;
  date: string; // YYYY-MM-DD format
  jobs: PayoutJob[];
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
}

// Validation schemas
export const PayoutJobSchema = z.object({
  id: z.string().uuid(),
  promoterId: z.string().uuid(),
  campaignId: z.string().uuid(),
  applicationId: z.string().uuid().optional(),
  period: z.object({
    start: z.date(),
    end: z.date(),
    promoterId: z.string().uuid(),
    campaignId: z.string().uuid(),
  }),
  ratePerView: z.number().positive(),
  status: z.enum(['pending', 'processing', 'completed', 'failed']),
  calculation: z.any().optional(),
  error: z.string().optional(),
  createdAt: z.date(),
  processedAt: z.date().optional(),
});

/**
 * Daily Payout Calculation Engine
 * Requirements: 6.1, 6.2, 6.3 - Calculate daily payouts at 00:00 WIB
 */
export class PayoutEngine {
  private config: PayoutEngineConfig;
  private isProcessing: boolean = false;

  constructor(config: Partial<PayoutEngineConfig> = {}) {
    this.config = {
      timezone: 'Asia/Jakarta', // WIB timezone
      platformFeePercentage: 5,
      minPayoutAmount: 1000, // Minimum Rp 1,000
      batchSize: 100,
      logLevel: 'info',
      ...config,
    };
  }

  /**
   * Calculate daily payouts for all active promoters
   * Requirement 6.1: Calculate total views legitimate per promoter at end of day (00:00 WIB)
   */
  async calculateDailyPayouts(
    date: Date,
    getActivePromotions: () => Promise<Array<{
      promoterId: string;
      campaignId: string;
      applicationId?: string;
      ratePerView: number;
    }>>,
    getViewRecords: (promoterId: string, campaignId: string, period: PayoutPeriod) => Promise<Array<{
      viewCount: number;
      isLegitimate: boolean;
      timestamp: Date;
    }>>
  ): Promise<PayoutBatch> {
    if (this.isProcessing) {
      throw new Error('Payout calculation is already in progress');
    }

    this.isProcessing = true;
    const batchId = `payout-${this.formatDate(date)}-${Date.now()}`;
    
    try {
      this.log('info', `Starting daily payout calculation for ${this.formatDate(date)}`);

      // Get the payout period (previous day 00:00 to 23:59:59 WIB)
      const period = this.getPayoutPeriod(date);
      
      // Get all active promotions
      const activePromotions = await getActivePromotions();
      this.log('info', `Found ${activePromotions.length} active promotions`);

      // Create payout jobs
      const jobs: PayoutJob[] = activePromotions.map(promotion => ({
        id: `job-${promotion.promoterId}-${promotion.campaignId}-${Date.now()}`,
        promoterId: promotion.promoterId,
        campaignId: promotion.campaignId,
        applicationId: promotion.applicationId,
        period: {
          ...period,
          promoterId: promotion.promoterId,
          campaignId: promotion.campaignId,
        },
        ratePerView: promotion.ratePerView,
        status: 'pending' as const,
        createdAt: new Date(),
      }));

      // Create batch
      const batch: PayoutBatch = {
        id: batchId,
        date: this.formatDate(date),
        jobs,
        totalJobs: jobs.length,
        completedJobs: 0,
        failedJobs: 0,
        totalAmount: 0,
        status: 'processing',
        startedAt: new Date(),
      };

      // Process jobs in batches
      await this.processPayoutJobs(batch, getViewRecords);

      // Finalize batch
      batch.status = batch.failedJobs === 0 ? 'completed' : 'failed';
      batch.completedAt = new Date();

      this.log('info', `Completed daily payout calculation: ${batch.completedJobs}/${batch.totalJobs} successful, total amount: Rp${batch.totalAmount.toLocaleString('id-ID')}`);

      return batch;

    } catch (error) {
      this.log('error', `Failed to calculate daily payouts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Process payout jobs in batches
   */
  private async processPayoutJobs(
    batch: PayoutBatch,
    getViewRecords: (promoterId: string, campaignId: string, period: PayoutPeriod) => Promise<Array<{
      viewCount: number;
      isLegitimate: boolean;
      timestamp: Date;
    }>>
  ): Promise<void> {
    const { jobs, batchSize } = { ...batch, batchSize: this.config.batchSize };

    for (let i = 0; i < jobs.length; i += batchSize) {
      const batchJobs = jobs.slice(i, i + batchSize);
      
      this.log('info', `Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(jobs.length / batchSize)} (${batchJobs.length} jobs)`);

      // Process jobs in parallel within batch
      const promises = batchJobs.map(job => this.processPayoutJob(job, getViewRecords));
      const results = await Promise.allSettled(promises);

      // Update batch statistics
      results.forEach((result, index) => {
        const job = batchJobs[index];
        
        if (result.status === 'fulfilled') {
          job.status = 'completed';
          job.calculation = result.value;
          job.processedAt = new Date();
          
          batch.completedJobs++;
          batch.totalAmount += result.value.netAmount;
          
          this.log('debug', `Job completed: ${job.promoterId}/${job.campaignId} - Rp${result.value.netAmount.toLocaleString('id-ID')}`);
        } else {
          job.status = 'failed';
          job.error = result.reason instanceof Error ? result.reason.message : 'Unknown error';
          job.processedAt = new Date();
          
          batch.failedJobs++;
          
          this.log('error', `Job failed: ${job.promoterId}/${job.campaignId} - ${job.error}`);
        }
      });

      // Small delay between batches to avoid overwhelming the system
      if (i + batchSize < jobs.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Process a single payout job
   */
  private async processPayoutJob(
    job: PayoutJob,
    getViewRecords: (promoterId: string, campaignId: string, period: PayoutPeriod) => Promise<Array<{
      viewCount: number;
      isLegitimate: boolean;
      timestamp: Date;
    }>>
  ): Promise<PaymentCalculation> {
    job.status = 'processing';

    try {
      // Get view records for the period
      const viewRecords = await getViewRecords(job.promoterId, job.campaignId, job.period);
      
      // Calculate payout
      const calculation = calculateDailyPayout(
        job.period,
        viewRecords,
        job.ratePerView,
        this.config.platformFeePercentage
      );

      // Validate minimum payout amount
      if (calculation.netAmount < this.config.minPayoutAmount) {
        this.log('debug', `Payout below minimum threshold: ${job.promoterId}/${job.campaignId} - Rp${calculation.netAmount.toLocaleString('id-ID')} < Rp${this.config.minPayoutAmount.toLocaleString('id-ID')}`);
        
        // Still return the calculation but with zero net amount
        return {
          ...calculation,
          netAmount: 0,
          platformFee: 0,
        };
      }

      return calculation;

    } catch (error) {
      this.log('error', `Failed to process payout job ${job.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  /**
   * Get payout period for a given date (previous day 00:00 to 23:59:59 WIB)
   */
  private getPayoutPeriod(date: Date): Omit<PayoutPeriod, 'promoterId' | 'campaignId'> {
    // Calculate previous day in WIB timezone
    const wibDate = new Date(date.toLocaleString('en-US', { timeZone: this.config.timezone }));
    const previousDay = new Date(wibDate);
    previousDay.setDate(previousDay.getDate() - 1);

    // Set to start of day (00:00:00)
    const start = new Date(previousDay);
    start.setHours(0, 0, 0, 0);

    // Set to end of day (23:59:59.999)
    const end = new Date(previousDay);
    end.setHours(23, 59, 59, 999);

    return { start, end };
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Check if it's time to run daily payout (00:00 WIB)
   */
  isDailyPayoutTime(date: Date = new Date()): boolean {
    const wibTime = new Date(date.toLocaleString('en-US', { timeZone: this.config.timezone }));
    const hour = wibTime.getHours();
    const minute = wibTime.getMinutes();
    
    // Check if it's exactly 00:00 WIB (with 1-minute tolerance)
    return hour === 0 && minute === 0;
  }

  /**
   * Get next daily payout time (00:00 WIB tomorrow)
   */
  getNextPayoutTime(date: Date = new Date()): Date {
    const wibTime = new Date(date.toLocaleString('en-US', { timeZone: this.config.timezone }));
    const nextPayout = new Date(wibTime);
    
    // Set to next day 00:00
    nextPayout.setDate(nextPayout.getDate() + 1);
    nextPayout.setHours(0, 0, 0, 0);
    
    // Convert back to local timezone
    return new Date(nextPayout.toLocaleString('en-US', { timeZone: 'UTC' }));
  }

  /**
   * Validate payout business rules
   * Requirement 6.3: Implementasi payout validation dengan business rules
   */
  validatePayoutRules(calculation: PaymentCalculation): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Rule 1: Legitimate views cannot exceed total views
    if (calculation.legitimateViews > calculation.totalViews) {
      errors.push('Legitimate views cannot exceed total views');
    }

    // Rule 2: Bot views should equal total - legitimate
    const expectedBotViews = calculation.totalViews - calculation.legitimateViews;
    if (calculation.botViews !== expectedBotViews) {
      errors.push(`Bot views mismatch: expected ${expectedBotViews}, got ${calculation.botViews}`);
    }

    // Rule 3: Gross amount should equal legitimate views * rate
    const expectedGrossAmount = calculation.legitimateViews * calculation.ratePerView;
    if (Math.abs(calculation.grossAmount - expectedGrossAmount) > 0.01) {
      errors.push(`Gross amount mismatch: expected ${expectedGrossAmount}, got ${calculation.grossAmount}`);
    }

    // Rule 4: Platform fee should be percentage of gross amount
    const expectedPlatformFee = calculation.grossAmount * (calculation.platformFeePercentage / 100);
    if (Math.abs(calculation.platformFee - expectedPlatformFee) > 0.01) {
      errors.push(`Platform fee mismatch: expected ${expectedPlatformFee}, got ${calculation.platformFee}`);
    }

    // Rule 5: Net amount should equal gross - platform fee
    const expectedNetAmount = calculation.grossAmount - calculation.platformFee;
    if (Math.abs(calculation.netAmount - expectedNetAmount) > 0.01) {
      errors.push(`Net amount mismatch: expected ${expectedNetAmount}, got ${calculation.netAmount}`);
    }

    // Rule 6: Minimum payout amount
    if (calculation.netAmount > 0 && calculation.netAmount < this.config.minPayoutAmount) {
      warnings.push(`Payout below minimum threshold: Rp${calculation.netAmount.toLocaleString('id-ID')} < Rp${this.config.minPayoutAmount.toLocaleString('id-ID')}`);
    }

    // Rule 7: High bot percentage warning
    const botPercentage = calculation.totalViews > 0 ? (calculation.botViews / calculation.totalViews) * 100 : 0;
    if (botPercentage > 50) {
      warnings.push(`High bot percentage detected: ${botPercentage.toFixed(1)}%`);
    }

    // Rule 8: Zero views warning
    if (calculation.totalViews === 0) {
      warnings.push('No views recorded for this period');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Generate payout summary report
   */
  generatePayoutReport(batch: PayoutBatch): string {
    const successRate = batch.totalJobs > 0 ? (batch.completedJobs / batch.totalJobs * 100).toFixed(1) : '0.0';
    const avgPayout = batch.completedJobs > 0 ? (batch.totalAmount / batch.completedJobs) : 0;

    const lines = [
      `Daily Payout Report - ${batch.date}`,
      `=====================================`,
      `Batch ID: ${batch.id}`,
      `Status: ${batch.status.toUpperCase()}`,
      ``,
      `Summary:`,
      `- Total Jobs: ${batch.totalJobs.toLocaleString('id-ID')}`,
      `- Completed: ${batch.completedJobs.toLocaleString('id-ID')}`,
      `- Failed: ${batch.failedJobs.toLocaleString('id-ID')}`,
      `- Success Rate: ${successRate}%`,
      ``,
      `Financial:`,
      `- Total Payout Amount: Rp${batch.totalAmount.toLocaleString('id-ID')}`,
      `- Average Payout: Rp${avgPayout.toLocaleString('id-ID')}`,
      `- Platform Fee (${this.config.platformFeePercentage}%): Rp${(batch.totalAmount * this.config.platformFeePercentage / (100 - this.config.platformFeePercentage)).toLocaleString('id-ID')}`,
      ``,
      `Timing:`,
      `- Started: ${batch.startedAt?.toLocaleString('id-ID', { timeZone: this.config.timezone })}`,
      `- Completed: ${batch.completedAt?.toLocaleString('id-ID', { timeZone: this.config.timezone })}`,
      `- Duration: ${batch.completedAt && batch.startedAt ? Math.round((batch.completedAt.getTime() - batch.startedAt.getTime()) / 1000) : 0}s`,
    ];

    // Add failed jobs details if any
    if (batch.failedJobs > 0) {
      lines.push('', 'Failed Jobs:');
      batch.jobs
        .filter(job => job.status === 'failed')
        .slice(0, 10) // Show first 10 failed jobs
        .forEach(job => {
          lines.push(`- ${job.promoterId}/${job.campaignId}: ${job.error}`);
        });
      
      if (batch.failedJobs > 10) {
        lines.push(`... and ${batch.failedJobs - 10} more failed jobs`);
      }
    }

    return lines.join('\n');
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
      console[level](`[${timestamp}] [PayoutEngine] ${message}`);
    }
  }

  /**
   * Get engine status
   */
  getStatus(): {
    isProcessing: boolean;
    config: PayoutEngineConfig;
    nextPayoutTime: Date;
  } {
    return {
      isProcessing: this.isProcessing,
      config: this.config,
      nextPayoutTime: this.getNextPayoutTime(),
    };
  }
}

// Export factory function
export const createPayoutEngine = (config?: Partial<PayoutEngineConfig>) => {
  return new PayoutEngine(config);
};

// Export constants
export const PAYOUT_SCHEDULES = {
  DAILY_WIB: '0 0 * * *', // Every day at 00:00 WIB
  HOURLY: '0 * * * *',    // Every hour for testing
  EVERY_5_MIN: '*/5 * * * *', // Every 5 minutes for testing
} as const;