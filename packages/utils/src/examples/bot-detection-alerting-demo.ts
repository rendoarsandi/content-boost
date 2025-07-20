import { BotDetectionService } from '../bot-detection';
import { BotDetectionAlerting } from '../bot-detection-alerting';

/**
 * Bot Detection Alerting System Demo
 * 
 * This example demonstrates the complete bot detection monitoring and alerting system
 * that implements the requirements for task 8.2:
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
 * Complete Bot Detection with Alerting Pipeline
 */
export class BotDetectionAlertingPipeline {
  private botDetectionService: BotDetectionService;
  private alertingSystem: BotDetectionAlerting;

  constructor() {
    // Initialize bot detection service
    this.botDetectionService = new BotDetectionService({
      thresholds: {
        viewLikeRatio: 10,
        viewCommentRatio: 100,
        spikePercentage: 500,
        spikeTimeWindow: 5 * 60 * 1000 // 5 minutes
      },
      confidence: {
        ban: 90,
        warning: 50,
        monitor: 20
      }
    });

    // Initialize alerting system
    this.alertingSystem = new BotDetectionAlerting({
      enabled: true,
      logPath: 'logs/bot-detection/',
      reportPath: 'reports/bot-detection/',
      thresholds: {
        critical: 90,
        warning: 50,
        monitor: 20
      },
      notifications: {
        email: true,
        dashboard: true,
        webhook: true
      }
    });
  }

  /**
   * Process view records through complete pipeline
   */
  async processViewRecords(
    promoterId: string,
    campaignId: string,
    viewRecords: ViewRecord[]
  ): Promise<{
    analysis: any;
    alertGenerated: boolean;
    actionTaken: string;
  }> {
    console.log(`🔍 Processing ${viewRecords.length} view records for promoter ${promoterId}, campaign ${campaignId}`);

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

      // Step 2: Process through alerting system
      await this.alertingSystem.processAnalysis(promoterId, campaignId, analysis);

      return {
        analysis,
        alertGenerated: analysis.botScore >= 20, // Monitor threshold
        actionTaken: analysis.action
      };

    } catch (error) {
      console.error(`❌ Error processing view records:`, error);
      throw error;
    }
  }

  /**
   * Generate daily summary report
   */
  async generateDailySummary(): Promise<any> {
    console.log(`📋 Generating daily summary report...`);
    
    const summary = await this.alertingSystem.generateDailySummary();
    
    console.log(`📊 Daily Summary:`);
    console.log(`   Total Analyses: ${summary.totalAnalyses}`);
    console.log(`   Bot Detections: ${JSON.stringify(summary.botDetections)}`);
    console.log(`   Average Bot Score: ${summary.averageBotScore.toFixed(2)}%`);
    console.log(`   Alerts: ${JSON.stringify(summary.alerts)}`);

    return summary;
  }

  /**
   * Get system statistics
   */
  getSystemStats(): any {
    return this.alertingSystem.getStats();
  }
}

/**
 * Demonstration function
 */
export async function demonstrateBotDetectionAlerting(): Promise<void> {
  console.log(`🚀 Starting Bot Detection Alerting System Demo\n`);

  const pipeline = new BotDetectionAlertingPipeline();

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
      timestamp: new Date(Date.now() - 5 * 60 * 1000)
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
      timestamp: new Date(Date.now() - 3 * 60 * 1000)
    }
  ];

  const result1 = await pipeline.processViewRecords('promoter_normal', 'campaign_001', normalViewRecords);
  console.log(`Result: Alert Generated = ${result1.alertGenerated}, Action = ${result1.actionTaken}`);

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
      timestamp: new Date(Date.now() - 8 * 60 * 1000)
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
      timestamp: new Date(Date.now() - 6 * 60 * 1000)
    }
  ];

  const result2 = await pipeline.processViewRecords('promoter_suspicious', 'campaign_002', suspiciousViewRecords);
  console.log(`Result: Alert Generated = ${result2.alertGenerated}, Action = ${result2.actionTaken}`);

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
      timestamp: new Date(Date.now() - 10 * 60 * 1000)
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
      timestamp: new Date(Date.now() - 8 * 60 * 1000)
    }
  ];

  const result3 = await pipeline.processViewRecords('promoter_bot', 'campaign_003', botViewRecords);
  console.log(`Result: Alert Generated = ${result3.alertGenerated}, Action = ${result3.actionTaken}`);

  // Example 4: Generate daily summary
  console.log(`\n=== Example 4: Daily Summary Report ===`);
  await pipeline.generateDailySummary();

  // Example 5: System statistics
  console.log(`\n=== Example 5: System Statistics ===`);
  const stats = pipeline.getSystemStats();
  console.log(`📈 System Stats:`);
  console.log(`   Total Notifications: ${stats.totalNotifications}`);
  console.log(`   By Type:`, stats.notificationsByType);
  console.log(`   By Severity:`, stats.notificationsBySeverity);
  console.log(`   Recent Activity: ${stats.recentActivity}`);

  console.log(`\n✅ Bot Detection Alerting Demo Complete!`);
  console.log(`\n📁 Check the following directories for generated files:`);
  console.log(`   📋 Reports: reports/bot-detection/`);
  console.log(`   📝 Logs: logs/bot-detection/`);
  console.log(`\n🔍 Files generated include:`);
  console.log(`   • analysis-YYYY-MM-DD.log - Bot analysis audit trail`);
  console.log(`   • notifications-YYYY-MM-DD.log - Notification delivery log`);
  console.log(`   • channel-email-YYYY-MM-DD.log - Email channel activity`);
  console.log(`   • channel-dashboard-YYYY-MM-DD.log - Dashboard channel activity`);
  console.log(`   • daily-summary-YYYY-MM-DD.json - Daily summary report (JSON)`);
  console.log(`   • daily-summary-YYYY-MM-DD.html - Daily summary report (HTML)`);
}

/**
 * Batch processing example
 */
export async function demonstrateBatchAlerting(): Promise<void> {
  console.log(`\n🔄 Demonstrating Batch Alerting Processing...`);

  const pipeline = new BotDetectionAlertingPipeline();
  const batchSize = 5;
  const totalRecords = 25;

  // Simulate processing large batches
  for (let batch = 0; batch < totalRecords / batchSize; batch++) {
    const batchRecords: ViewRecord[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      const recordId = batch * batchSize + i;
      const botScore = Math.random() * 100; // Random bot score for demo
      
      batchRecords.push({
        id: `batch_${recordId}`,
        promoterId: `promoter_${recordId % 3}`, // 3 different promoters
        campaignId: `campaign_${recordId % 2}`, // 2 different campaigns
        platform: recordId % 2 === 0 ? 'tiktok' : 'instagram',
        platformPostId: `post_${recordId}`,
        viewCount: Math.floor(Math.random() * 2000) + 100,
        likeCount: Math.floor(Math.random() * (botScore > 70 ? 10 : 100)) + 5, // Lower likes for higher bot scores
        commentCount: Math.floor(Math.random() * (botScore > 70 ? 2 : 20)) + 1, // Lower comments for higher bot scores
        shareCount: Math.floor(Math.random() * 5),
        timestamp: new Date(Date.now() - Math.random() * 60 * 60 * 1000) // Random time within last hour
      });
    }

    console.log(`📦 Processing batch ${batch + 1}/${totalRecords / batchSize} (${batchSize} records)`);
    
    for (const record of batchRecords) {
      await pipeline.processViewRecords(record.promoterId, record.campaignId, [record]);
    }
  }

  // Generate final summary
  console.log(`\n📊 Generating final batch processing summary...`);
  const summary = await pipeline.generateDailySummary();
  const stats = pipeline.getSystemStats();
  
  console.log(`✅ Batch processing complete!`);
  console.log(`   Processed: ${totalRecords} records`);
  console.log(`   Total Analyses: ${summary.totalAnalyses}`);
  console.log(`   Total Notifications: ${stats.totalNotifications}`);
  console.log(`   Recent Activity: ${stats.recentActivity}`);
}

// Run demonstration if this file is executed directly
if (require.main === module) {
  demonstrateBotDetectionAlerting()
    .then(() => demonstrateBatchAlerting())
    .catch(console.error);
}