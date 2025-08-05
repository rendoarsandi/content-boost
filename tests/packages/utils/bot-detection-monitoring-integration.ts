import { BotDetectionService, BotAnalysis } from '../bot-detection';
import { BotDetectionMonitoringSystem } from '../bot-detection-monitoring-system';

/**
 * Complete Bot Detection Monitoring Integration Example
 *
 * This example demonstrates how to integrate the bot detection system
 * with the comprehensive monitoring and alerting system.
 *
 * Requirements covered:
 * - 5.5: Warning system untuk suspicious activity
 * - 5.6: Notification system untuk promoters dan admins
 * - 5.7: Logging dan audit trail untuk bot detection decisions
 * - 10.3: Summary files di reports/bot-detection/
 * - 10.4: Audit trail logging di logs/bot-detection/
 */

interface ViewRecord {
  id: string;
  promoterId: string;
  campaignId: string;
  platform: 'tiktok' | 'instagram';
  platformPostId: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  timestamp: Date;
}

/**
 * Complete Bot Detection and Monitoring Pipeline
 */
export class BotDetectionPipeline {
  private botDetectionService: BotDetectionService;
  private monitoringSystem: BotDetectionMonitoringSystem;

  constructor() {
    // Initialize bot detection service with custom configuration
    this.botDetectionService = new BotDetectionService({
      thresholds: {
        viewLikeRatio: 10,
        viewCommentRatio: 100,
        spikePercentage: 500,
        spikeTimeWindow: 5 * 60 * 1000, // 5 minutes
      },
      confidence: {
        ban: 90,
        warning: 50,
        monitor: 20,
      },
    });

    // Initialize comprehensive monitoring system
    this.monitoringSystem = new BotDetectionMonitoringSystem({
      monitoring: {
        enabled: true,
        realTimeAlerts: true,
        batchProcessing: true,
        alertThresholds: {
          criticalBotScore: 90,
          warningBotScore: 50,
          monitorBotScore: 20,
          alertFrequencyLimit: 10,
        },
      },
      logging: {
        logPath: 'logs/bot-detection/',
        auditTrail: true,
        retention: 90,
        compression: true,
        logLevels: ['info', 'warn', 'error'],
      },
      reporting: {
        enabled: true,
        reportPath: 'reports/bot-detection/',
        formats: ['json', 'html'],
        scheduling: {
          daily: true,
          weekly: true,
          monthly: true,
          realTime: false,
        },
      },
      notifications: {
        channels: {
          email: true,
          dashboard: true,
          webhook: true,
          sms: false,
        },
        recipients: {
          admins: ['admin@platform.com', 'security@platform.com'],
          promoters: true,
          creators: true,
        },
      },
    });
  }

  /**
   * Process view records through complete bot detection and monitoring pipeline
   */
  async processViewRecords(
    promoterId: string,
    campaignId: string,
    viewRecords: ViewRecord[]
  ): Promise<{
    analysis: BotAnalysis;
    actionTaken: boolean;
    alertsGenerated: number;
    notificationsSent: number;
  }> {
    console.log(
      `🔍 Processing ${viewRecords.length} view records for promoter ${promoterId}, campaign ${campaignId}`
    );

    try {
      // Step 1: Analyze views for bot detection
      const analysis = await this.botDetectionService.analyzeViews(
        promoterId,
        campaignId,
        viewRecords
      );

      console.log(`📊 Bot Analysis Results:`);
      console.log(`   Bot Score: ${analysis.botScore}%`);
      console.log(`   Action: ${analysis.action.toUpperCase()}`);
      console.log(`   Reason: ${analysis.reason}`);
      console.log(`   Metrics:`, {
        totalViews: analysis.metrics.totalViews,
        viewLikeRatio: analysis.metrics.viewLikeRatio.toFixed(2),
        viewCommentRatio: analysis.metrics.viewCommentRatio.toFixed(2),
        spikeDetected: analysis.metrics.spikeDetected,
      });

      // Step 2: Process through monitoring system
      await this.monitoringSystem.processAnalysis(
        promoterId,
        campaignId,
        analysis
      );

      // Step 3: Get system status for reporting
      const systemStatus = this.monitoringSystem.getSystemStatus();

      console.log(`🚨 Monitoring Results:`);
      console.log(`   System Health: ${systemStatus.monitoring.systemHealth}`);
      console.log(`   Recent Alerts: ${systemStatus.monitoring.recentAlerts}`);
      console.log(
        `   Unacknowledged Alerts: ${systemStatus.alerts.unacknowledged}`
      );

      return {
        analysis,
        actionTaken: analysis.action !== 'none',
        alertsGenerated: systemStatus.alerts.total,
        notificationsSent: systemStatus.monitoring.recentAlerts,
      };
    } catch (error) {
      console.error(`❌ Error processing view records:`, error);
      throw error;
    }
  }

  /**
   * Generate comprehensive reports
   */
  async generateReports(): Promise<{
    dailySummary: any;
    systemStatus: any;
  }> {
    console.log(`📋 Generating comprehensive reports...`);

    try {
      // Generate daily summary
      const dailySummary = await this.monitoringSystem.generateDailySummary();

      // Get current system status
      const systemStatus = this.monitoringSystem.getSystemStatus();

      console.log(`📊 Daily Summary Generated:`);
      console.log(`   Total Analyses: ${dailySummary.totalAnalyses}`);
      console.log(
        `   Bot Detections: ${JSON.stringify(dailySummary.botDetections)}`
      );
      console.log(
        `   Average Bot Score: ${dailySummary.averageBotScore.toFixed(2)}%`
      );

      return {
        dailySummary,
        systemStatus,
      };
    } catch (error) {
      console.error(`❌ Error generating reports:`, error);
      throw error;
    }
  }

  /**
   * Demonstrate alert management
   */
  async manageAlerts(): Promise<void> {
    console.log(`🔧 Managing system alerts...`);

    const systemStatus = this.monitoringSystem.getSystemStatus();

    console.log(`📈 Current Alert Status:`);
    console.log(`   Total Alerts: ${systemStatus.alerts.total}`);
    console.log(`   Unacknowledged: ${systemStatus.alerts.unacknowledged}`);
    console.log(`   By Type:`, systemStatus.alerts.byType);
    console.log(`   By Severity:`, systemStatus.alerts.bySeverity);
  }
}

/**
 * Example usage and demonstration
 */
export async function demonstrateBotDetectionMonitoring(): Promise<void> {
  console.log(`🚀 Starting Bot Detection Monitoring Integration Demo\n`);

  const pipeline = new BotDetectionPipeline();

  // Example 1: Normal activity (should not trigger alerts)
  console.log(`\n=== Example 1: Normal Activity ===`);
  const normalViewRecords: ViewRecord[] = [
    {
      id: '1',
      promoterId: 'promoter_normal',
      campaignId: 'campaign_001',
      platform: 'tiktok',
      platformPostId: 'post_001',
      viewCount: 100,
      likeCount: 15,
      commentCount: 3,
      shareCount: 2,
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
    },
    {
      id: '2',
      promoterId: 'promoter_normal',
      campaignId: 'campaign_001',
      platform: 'tiktok',
      platformPostId: 'post_001',
      viewCount: 150,
      likeCount: 22,
      commentCount: 5,
      shareCount: 3,
      timestamp: new Date(Date.now() - 3 * 60 * 1000),
    },
  ];

  await pipeline.processViewRecords(
    'promoter_normal',
    'campaign_001',
    normalViewRecords
  );

  // Example 2: Suspicious activity (should trigger warning)
  console.log(`\n=== Example 2: Suspicious Activity ===`);
  const suspiciousViewRecords: ViewRecord[] = [
    {
      id: '3',
      promoterId: 'promoter_suspicious',
      campaignId: 'campaign_002',
      platform: 'instagram',
      platformPostId: 'post_002',
      viewCount: 500,
      likeCount: 10,
      commentCount: 1,
      shareCount: 0,
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
    },
    {
      id: '4',
      promoterId: 'promoter_suspicious',
      campaignId: 'campaign_002',
      platform: 'instagram',
      platformPostId: 'post_002',
      viewCount: 800,
      likeCount: 15,
      commentCount: 1,
      shareCount: 0,
      timestamp: new Date(Date.now() - 6 * 60 * 1000),
    },
  ];

  await pipeline.processViewRecords(
    'promoter_suspicious',
    'campaign_002',
    suspiciousViewRecords
  );

  // Example 3: Bot activity (should trigger ban)
  console.log(`\n=== Example 3: Bot Activity ===`);
  const botViewRecords: ViewRecord[] = [
    {
      id: '5',
      promoterId: 'promoter_bot',
      campaignId: 'campaign_003',
      platform: 'tiktok',
      platformPostId: 'post_003',
      viewCount: 1000,
      likeCount: 5,
      commentCount: 0,
      shareCount: 0,
      timestamp: new Date(Date.now() - 10 * 60 * 1000),
    },
    {
      id: '6',
      promoterId: 'promoter_bot',
      campaignId: 'campaign_003',
      platform: 'tiktok',
      platformPostId: 'post_003',
      viewCount: 7000, // Massive spike
      likeCount: 8,
      commentCount: 0,
      shareCount: 0,
      timestamp: new Date(Date.now() - 8 * 60 * 1000),
    },
  ];

  await pipeline.processViewRecords(
    'promoter_bot',
    'campaign_003',
    botViewRecords
  );

  // Example 4: Generate reports
  console.log(`\n=== Example 4: Generate Reports ===`);
  await pipeline.generateReports();

  // Example 5: Alert management
  console.log(`\n=== Example 5: Alert Management ===`);
  await pipeline.manageAlerts();

  console.log(`\n✅ Bot Detection Monitoring Integration Demo Complete!`);
  console.log(`\n📁 Check the following directories for generated files:`);
  console.log(`   📋 Reports: reports/bot-detection/`);
  console.log(`   📝 Logs: logs/bot-detection/`);
  console.log(`\n🔍 Files generated include:`);
  console.log(`   • analysis-YYYY-MM-DD.log - Bot analysis audit trail`);
  console.log(`   • alerts-YYYY-MM-DD.log - System alerts log`);
  console.log(`   • notifications-YYYY-MM-DD.log - Notification delivery log`);
  console.log(`   • metrics-YYYY-MM-DD.log - System performance metrics`);
  console.log(`   • daily-summary-YYYY-MM-DD.json - Daily summary report`);
  console.log(`   • daily-summary-YYYY-MM-DD.html - Daily summary HTML report`);
}

/**
 * Batch processing example for high-volume scenarios
 */
export async function demonstrateBatchProcessing(): Promise<void> {
  console.log(`\n🔄 Demonstrating Batch Processing for High Volume...`);

  const pipeline = new BotDetectionPipeline();
  const batchSize = 10;
  const totalRecords = 100;

  // Simulate processing large batches of view records
  for (let batch = 0; batch < totalRecords / batchSize; batch++) {
    const batchRecords: ViewRecord[] = [];

    for (let i = 0; i < batchSize; i++) {
      const recordId = batch * batchSize + i;
      batchRecords.push({
        id: `batch_${recordId}`,
        promoterId: `promoter_${recordId % 5}`, // 5 different promoters
        campaignId: `campaign_${recordId % 3}`, // 3 different campaigns
        platform: recordId % 2 === 0 ? 'tiktok' : 'instagram',
        platformPostId: `post_${recordId}`,
        viewCount: Math.floor(Math.random() * 1000) + 100,
        likeCount: Math.floor(Math.random() * 50) + 5,
        commentCount: Math.floor(Math.random() * 10) + 1,
        shareCount: Math.floor(Math.random() * 5),
        timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000), // Random time within last hour
      });
    }

    // Process batch
    console.log(
      `📦 Processing batch ${batch + 1}/${totalRecords / batchSize} (${batchSize} records)`
    );

    for (const record of batchRecords) {
      await pipeline.processViewRecords(record.promoterId, record.campaignId, [
        record,
      ]);
    }
  }

  // Generate final reports
  console.log(`\n📊 Generating final batch processing reports...`);
  const reports = await pipeline.generateReports();

  console.log(`✅ Batch processing complete!`);
  console.log(`   Processed: ${totalRecords} records`);
  console.log(`   Total Analyses: ${reports.dailySummary.totalAnalyses}`);
  console.log(
    `   System Health: ${reports.systemStatus.monitoring.systemHealth}`
  );
}

// BotDetectionPipeline is already exported above

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateBotDetectionMonitoring()
    .then(() => demonstrateBatchProcessing())
    .catch(console.error);
}
