/**
 * Daily Payout Integration Example
 *
 * This example demonstrates how to integrate the daily payout calculation engine
 * with a real database and external services.
 *
 * Requirements implemented:
 * - 6.1: Implementasi cron job untuk menghitung payout harian (00:00 WIB)
 * - 6.2: Setup legitimate views calculation dengan bot detection integration
 * - 6.3: Buat platform fee calculation dengan configurable rates
 * - 6.3: Implementasi payout validation dengan business rules
 */

import {
  createDailyPayoutCron,
  PayoutCronDependencies,
} from '../daily-payout-cron';
import { createPayoutEngine } from '../payout-engine';

// Example database models (would be replaced with actual database integration)
interface DatabasePromotion {
  id: string;
  promoterId: string;
  campaignId: string;
  applicationId?: string;
  ratePerView: number;
  status: 'active' | 'paused' | 'completed';
  createdAt: Date;
}

interface DatabaseViewRecord {
  id: string;
  promoterId: string;
  campaignId: string;
  platform: 'tiktok' | 'instagram';
  platformPostId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  botScore: number;
  isLegitimate: boolean;
  timestamp: Date;
}

interface DatabasePayoutBatch {
  id: string;
  date: string;
  totalJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalAmount: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startedAt: Date;
  completedAt?: Date;
  reportData: string;
}

interface DatabasePayout {
  id: string;
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
  createdAt: Date;
}

interface DatabasePlatformRevenue {
  id: string;
  periodStart: Date;
  periodEnd: Date;
  totalFees: number;
  createdAt: Date;
}

/**
 * Example implementation of database dependencies
 */
class DatabaseService {
  // Mock database connection
  private db: any = {};

  /**
   * Get all active promotions for payout calculation
   */
  async getActivePromotions(): Promise<
    Array<{
      promoterId: string;
      campaignId: string;
      applicationId?: string;
      ratePerView: number;
    }>
  > {
    // In a real implementation, this would query the database
    // SELECT p.promoter_id, p.campaign_id, p.application_id, c.rate_per_view
    // FROM promotions p
    // JOIN campaigns c ON p.campaign_id = c.id
    // WHERE p.status = 'active' AND c.status = 'active'

    console.log('📊 Fetching active promotions from database...');

    // Mock data for demonstration
    return [
      {
        promoterId: 'promoter-001',
        campaignId: 'campaign-001',
        applicationId: 'app-001',
        ratePerView: 1000, // Rp 1,000 per view
      },
      {
        promoterId: 'promoter-002',
        campaignId: 'campaign-001',
        applicationId: 'app-002',
        ratePerView: 1000,
      },
      {
        promoterId: 'promoter-003',
        campaignId: 'campaign-002',
        ratePerView: 1500, // Rp 1,500 per view
      },
    ];
  }

  /**
   * Get view records for a specific promoter/campaign in a period
   */
  async getViewRecords(
    promoterId: string,
    campaignId: string,
    period: { start: Date; end: Date; promoterId: string; campaignId: string }
  ): Promise<
    Array<{
      viewCount: number;
      isLegitimate: boolean;
      timestamp: Date;
    }>
  > {
    // In a real implementation, this would query the database
    // SELECT view_count, is_legitimate, timestamp
    // FROM view_records
    // WHERE promoter_id = ? AND campaign_id = ?
    //   AND timestamp >= ? AND timestamp <= ?
    // ORDER BY timestamp

    console.log(
      `📈 Fetching view records for ${promoterId}/${campaignId} from ${period.start.toISOString()} to ${period.end.toISOString()}`
    );

    // Mock data based on promoter ID
    if (promoterId === 'promoter-001') {
      return [
        {
          viewCount: 150,
          isLegitimate: true,
          timestamp: new Date(period.start.getTime() + 2 * 60 * 60 * 1000),
        },
        {
          viewCount: 200,
          isLegitimate: true,
          timestamp: new Date(period.start.getTime() + 6 * 60 * 60 * 1000),
        },
        {
          viewCount: 50,
          isLegitimate: false,
          timestamp: new Date(period.start.getTime() + 10 * 60 * 60 * 1000),
        }, // Bot views
        {
          viewCount: 100,
          isLegitimate: true,
          timestamp: new Date(period.start.getTime() + 14 * 60 * 60 * 1000),
        },
      ];
    } else if (promoterId === 'promoter-002') {
      return [
        {
          viewCount: 300,
          isLegitimate: true,
          timestamp: new Date(period.start.getTime() + 3 * 60 * 60 * 1000),
        },
        {
          viewCount: 100,
          isLegitimate: false,
          timestamp: new Date(period.start.getTime() + 8 * 60 * 60 * 1000),
        }, // Bot views
        {
          viewCount: 250,
          isLegitimate: true,
          timestamp: new Date(period.start.getTime() + 12 * 60 * 60 * 1000),
        },
      ];
    } else if (promoterId === 'promoter-003') {
      return [
        {
          viewCount: 400,
          isLegitimate: true,
          timestamp: new Date(period.start.getTime() + 4 * 60 * 60 * 1000),
        },
        {
          viewCount: 200,
          isLegitimate: true,
          timestamp: new Date(period.start.getTime() + 16 * 60 * 60 * 1000),
        },
      ];
    }

    return [];
  }

  /**
   * Save payout batch results to database
   */
  async savePayoutBatch(batch: any): Promise<void> {
    console.log(`💾 Saving payout batch ${batch.id} to database...`);

    // In a real implementation, this would insert into the database
    // INSERT INTO payout_batches (id, date, total_jobs, completed_jobs, failed_jobs, total_amount, status, started_at, completed_at, report_data)
    // VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)

    const dbBatch: DatabasePayoutBatch = {
      id: batch.id,
      date: batch.date,
      totalJobs: batch.totalJobs,
      completedJobs: batch.completedJobs,
      failedJobs: batch.failedJobs,
      totalAmount: batch.totalAmount,
      status: batch.status,
      startedAt: batch.startedAt,
      completedAt: batch.completedAt,
      reportData: JSON.stringify(batch),
    };

    console.log(
      `✅ Payout batch saved: ${batch.completedJobs}/${batch.totalJobs} jobs completed, total amount: Rp${batch.totalAmount.toLocaleString('id-ID')}`
    );
  }

  /**
   * Save individual payout records
   */
  async savePayouts(
    payouts: Array<{
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
    }>
  ): Promise<void> {
    console.log(`💰 Saving ${payouts.length} individual payout records...`);

    // In a real implementation, this would batch insert into the database
    // INSERT INTO payouts (promoter_id, campaign_id, application_id, period_start, period_end, ...)
    // VALUES (?, ?, ?, ?, ?, ...), (?, ?, ?, ?, ?, ...), ...

    for (const payout of payouts) {
      const dbPayout: DatabasePayout = {
        id: `payout-${payout.promoterId}-${payout.campaignId}-${Date.now()}`,
        ...payout,
        createdAt: new Date(),
      };

      if (payout.status === 'completed') {
        console.log(
          `  ✅ ${payout.promoterId}: Rp${payout.netAmount.toLocaleString('id-ID')} (${payout.legitimateViews} legitimate views)`
        );
      } else {
        console.log(
          `  ❌ ${payout.promoterId}: Failed - ${payout.failureReason}`
        );
      }
    }
  }

  /**
   * Update platform revenue
   */
  async updatePlatformRevenue(
    period: { start: Date; end: Date },
    totalFees: number
  ): Promise<void> {
    console.log(
      `🏦 Updating platform revenue: Rp${totalFees.toLocaleString('id-ID')} for period ${period.start.toISOString()} to ${period.end.toISOString()}`
    );

    // In a real implementation, this would update or insert platform revenue
    // INSERT INTO platform_revenue (period_start, period_end, total_fees, created_at)
    // VALUES (?, ?, ?, ?)
    // ON DUPLICATE KEY UPDATE total_fees = total_fees + VALUES(total_fees)

    const dbRevenue: DatabasePlatformRevenue = {
      id: `revenue-${period.start.toISOString().split('T')[0]}`,
      periodStart: period.start,
      periodEnd: period.end,
      totalFees,
      createdAt: new Date(),
    };

    console.log(`✅ Platform revenue updated successfully`);
  }

  /**
   * Send payout notifications
   */
  async sendPayoutNotifications(
    notifications: Array<{
      promoterId: string;
      amount: number;
      status: 'completed' | 'failed';
      error?: string;
    }>
  ): Promise<void> {
    console.log(`📧 Sending ${notifications.length} payout notifications...`);

    for (const notification of notifications) {
      if (notification.status === 'completed') {
        console.log(
          `  📨 Notification sent to ${notification.promoterId}: Payout of Rp${notification.amount.toLocaleString('id-ID')} completed`
        );
        // In a real implementation, this would send email/SMS/push notification
        // await emailService.send({
        //   to: await getUserEmail(notification.promoterId),
        //   subject: 'Daily Payout Completed',
        //   template: 'payout-success',
        //   data: { amount: notification.amount }
        // });
      } else {
        console.log(
          `  📨 Notification sent to ${notification.promoterId}: Payout failed - ${notification.error}`
        );
        // await emailService.send({
        //   to: await getUserEmail(notification.promoterId),
        //   subject: 'Daily Payout Failed',
        //   template: 'payout-failed',
        //   data: { error: notification.error }
        // });
      }
    }
  }
}

/**
 * Example usage of the daily payout system
 */
export async function demonstrateDailyPayoutSystem(): Promise<void> {
  console.log('🚀 Starting Daily Payout System Demonstration');
  console.log('='.repeat(50));

  // Initialize database service
  const dbService = new DatabaseService();

  // Create dependencies object
  const dependencies: PayoutCronDependencies = {
    getActivePromotions: () => dbService.getActivePromotions(),
    getViewRecords: (promoterId, campaignId, period) =>
      dbService.getViewRecords(promoterId, campaignId, period),
    savePayoutBatch: batch => dbService.savePayoutBatch(batch),
    savePayouts: payouts => dbService.savePayouts(payouts),
    updatePlatformRevenue: (period, totalFees) =>
      dbService.updatePlatformRevenue(period, totalFees),
    sendPayoutNotifications: notifications =>
      dbService.sendPayoutNotifications(notifications),
  };

  // Create daily payout cron with configuration
  const dailyPayoutCron = createDailyPayoutCron(dependencies, {
    timezone: 'Asia/Jakarta',
    platformFeePercentage: 5, // 5% platform fee
    minPayoutAmount: 1000, // Minimum Rp 1,000
    enableNotifications: true,
    logLevel: 'info',
    retryFailedPayouts: true,
    maxRetries: 3,
  });

  console.log('\n📋 System Configuration:');
  const status = dailyPayoutCron.getStatus();
  console.log(`  Timezone: ${status.config.timezone}`);
  console.log(`  Platform Fee: ${status.config.platformFeePercentage}%`);
  console.log(
    `  Minimum Payout: Rp${status.config.minPayoutAmount.toLocaleString('id-ID')}`
  );
  console.log(
    `  Notifications: ${status.config.enableNotifications ? 'Enabled' : 'Disabled'}`
  );
  console.log(`  Scheduled Jobs: ${status.scheduler.totalJobs}`);
  console.log(
    `  Next Payout Time: ${status.payoutEngine.nextPayoutTime.toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}`
  );

  console.log(
    '\n⏰ Executing Manual Payout (simulating daily 00:00 WIB execution)...'
  );
  console.log('-'.repeat(50));

  try {
    // Execute manual payout for demonstration
    const testDate = new Date(); // In production, this would be triggered at 00:00 WIB
    const batch = await dailyPayoutCron.executeManualPayout(testDate);

    console.log('\n📊 Payout Execution Results:');
    console.log(`  Batch ID: ${batch.id}`);
    console.log(`  Date: ${batch.date}`);
    console.log(`  Status: ${batch.status.toUpperCase()}`);
    console.log(`  Total Jobs: ${batch.totalJobs}`);
    console.log(`  Completed: ${batch.completedJobs}`);
    console.log(`  Failed: ${batch.failedJobs}`);
    console.log(
      `  Success Rate: ${batch.totalJobs > 0 ? ((batch.completedJobs / batch.totalJobs) * 100).toFixed(1) : '0.0'}%`
    );
    console.log(
      `  Total Payout Amount: Rp${batch.totalAmount.toLocaleString('id-ID')}`
    );
    console.log(
      `  Processing Time: ${batch.completedAt && batch.startedAt ? Math.round((batch.completedAt.getTime() - batch.startedAt.getTime()) / 1000) : 0}s`
    );

    console.log('\n💼 Individual Job Results:');
    batch.jobs.forEach((job, index) => {
      console.log(`  Job ${index + 1}: ${job.promoterId}/${job.campaignId}`);
      console.log(`    Status: ${job.status.toUpperCase()}`);
      if (job.calculation) {
        console.log(
          `    Total Views: ${job.calculation.totalViews.toLocaleString('id-ID')}`
        );
        console.log(
          `    Legitimate Views: ${job.calculation.legitimateViews.toLocaleString('id-ID')} (${job.calculation.totalViews > 0 ? ((job.calculation.legitimateViews / job.calculation.totalViews) * 100).toFixed(1) : '0.0'}%)`
        );
        console.log(
          `    Bot Views: ${job.calculation.botViews.toLocaleString('id-ID')}`
        );
        console.log(
          `    Gross Amount: Rp${job.calculation.grossAmount.toLocaleString('id-ID')}`
        );
        console.log(
          `    Platform Fee: Rp${job.calculation.platformFee.toLocaleString('id-ID')}`
        );
        console.log(
          `    Net Payout: Rp${job.calculation.netAmount.toLocaleString('id-ID')}`
        );
      } else if (job.error) {
        console.log(`    Error: ${job.error}`);
      }
      console.log('');
    });

    // Demonstrate payout engine validation
    console.log('🔍 Business Rules Validation:');
    batch.jobs.forEach((job, index) => {
      if (job.calculation) {
        const payoutEngine = createPayoutEngine();
        const validation = payoutEngine.validatePayoutRules(job.calculation);

        console.log(`  Job ${index + 1} Validation:`);
        console.log(`    Valid: ${validation.isValid ? '✅' : '❌'}`);
        if (validation.errors.length > 0) {
          console.log(`    Errors: ${validation.errors.join(', ')}`);
        }
        if (validation.warnings.length > 0) {
          console.log(`    Warnings: ${validation.warnings.join(', ')}`);
        }
      }
    });

    // Generate and display comprehensive report
    console.log('\n📄 Comprehensive Payout Report:');
    console.log('-'.repeat(50));
    const payoutEngine = createPayoutEngine();
    const report = payoutEngine.generatePayoutReport(batch);
    console.log(report);
  } catch (error) {
    console.error(
      '\n❌ Payout execution failed:',
      error instanceof Error ? error.message : 'Unknown error'
    );
  }

  console.log('\n🏁 Daily Payout System Demonstration Complete');
  console.log('='.repeat(50));
}

/**
 * Example of starting the cron system for production
 */
export function startProductionPayoutSystem(
  dependencies: PayoutCronDependencies
): void {
  console.log('🚀 Starting Production Daily Payout System...');

  // Create daily payout cron with production configuration
  const dailyPayoutCron = createDailyPayoutCron(dependencies, {
    timezone: 'Asia/Jakarta',
    platformFeePercentage: 5,
    minPayoutAmount: 1000,
    enableNotifications: true,
    logLevel: 'info',
    retryFailedPayouts: true,
    maxRetries: 3,
  });

  // Start the cron system
  dailyPayoutCron.start();

  console.log('✅ Daily payout cron system started successfully');
  console.log('⏰ Next payout will be executed at 00:00 WIB');

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down daily payout system...');
    dailyPayoutCron.stop();
    console.log('✅ Daily payout system stopped gracefully');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down daily payout system...');
    dailyPayoutCron.stop();
    console.log('✅ Daily payout system stopped gracefully');
    process.exit(0);
  });
}

// Export for use in other modules
export { DatabaseService };

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateDailyPayoutSystem().catch(console.error);
}
