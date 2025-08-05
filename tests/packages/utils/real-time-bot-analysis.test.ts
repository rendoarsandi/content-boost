/**
 * Example usage of the Real-Time Bot Analysis Engine
 *
 * This example demonstrates how to:
 * 1. Set up the real-time bot analyzer
 * 2. Configure the background worker
 * 3. Process view records in real-time
 * 4. Handle bot detection results
 * 5. Monitor system performance
 *
 * Requirements: 4.3, 4.4, 4.5, 5.1-5.7
 */

import {
  RealTimeBotAnalyzer,
  createRealTimeBotAnalyzer,
  getGlobalBotAnalyzer,
} from '../real-time-bot-analyzer';
import {
  BotAnalysisWorker,
  createBotAnalysisWorker,
  getGlobalBotAnalysisWorker,
} from '../bot-analysis-worker';
import { ViewRecord, BotDetectionService } from '../bot-detection';

/**
 * Example 1: Basic Real-Time Bot Analysis Setup
 */
export async function basicBotAnalysisExample(): Promise<void> {
  console.log('=== Basic Real-Time Bot Analysis Example ===');

  // Create analyzer with custom configuration
  const analyzer = createRealTimeBotAnalyzer({
    analysisInterval: 60 * 1000, // 1 minute
    batchSize: 100,
    cacheTimeout: 5 * 60, // 5 minutes
    enableAutoActions: true,
    logLevel: 'info',
  });

  // Start the analyzer
  analyzer.start();

  // Simulate incoming view records
  const sampleViewRecords: ViewRecord[] = [
    {
      id: '1',
      promoterId: 'promoter_001',
      campaignId: 'campaign_001',
      platform: 'tiktok',
      contentId: 'tiktok_post_123',
      viewCount: 1000,
      likeCount: 50,
      commentCount: 10,
      shareCount: 5,
      timestamp: new Date(),
    },
    {
      id: '2',
      promoterId: 'promoter_001',
      campaignId: 'campaign_001',
      platform: 'tiktok',
      contentId: 'tiktok_post_123',
      viewCount: 1500, // Suspicious spike
      likeCount: 52,
      commentCount: 10,
      shareCount: 5,
      timestamp: new Date(Date.now() + 60000), // 1 minute later
    },
  ];

  // Add records for analysis
  analyzer.addViewRecords(sampleViewRecords);

  // Perform immediate analysis
  try {
    const result = await analyzer.analyzeImmediate(
      'promoter_001',
      'campaign_001'
    );

    console.log('Analysis Result:', {
      botScore: result.analysis.botScore,
      action: result.analysis.action,
      reason: result.analysis.reason,
      actionTaken: result.actionTaken,
      processingTime: result.processingTime,
    });

    // Check statistics
    const stats = analyzer.getStatistics();
    console.log('Analyzer Statistics:', stats);
  } catch (error) {
    console.error('Analysis failed:', error);
  }

  // Stop the analyzer
  analyzer.stop();
}

/**
 * Example 2: Background Worker Setup
 */
export async function backgroundWorkerExample(): Promise<void> {
  console.log('=== Background Worker Example ===');

  // Create worker with custom configuration
  const worker = createBotAnalysisWorker({
    analyzer: {
      analysisInterval: 30 * 1000, // 30 seconds
      batchSize: 100,
      cacheTimeout: 5 * 60,
      enableAutoActions: true,
      logLevel: 'info',
    },
    worker: {
      enabled: true,
      dataFetchInterval: 15 * 1000, // 15 seconds
      maxRetries: 3,
      retryDelay: 5000,
      batchSize: 200,
    },
    logging: {
      enabled: true,
      logPath: 'logs/bot-detection/',
      maxLogSize: 10 * 1024 * 1024, // 10MB
      rotateDaily: true,
    },
  });

  // Start the worker
  await worker.start();

  // Simulate adding view records over time
  const simulateViewRecords = () => {
    const records: ViewRecord[] = [];

    for (let i = 0; i < 10; i++) {
      records.push({
        id: `record_${Date.now()}_${i}`,
        promoterId: `promoter_${Math.floor(Math.random() * 5) + 1}`,
        campaignId: `campaign_${Math.floor(Math.random() * 3) + 1}`,
        platform: Math.random() > 0.5 ? 'tiktok' : 'instagram',
        contentId: `post_${Math.floor(Math.random() * 100)}`,
        viewCount: Math.floor(Math.random() * 1000) + 100,
        likeCount: Math.floor(Math.random() * 50) + 5,
        commentCount: Math.floor(Math.random() * 20) + 1,
        shareCount: Math.floor(Math.random() * 10) + 1,
        timestamp: new Date(),
      });
    }

    worker.addViewRecords(records);
    console.log(`Added ${records.length} view records`);
  };

  // Simulate data every 10 seconds for 1 minute
  const dataInterval = setInterval(simulateViewRecords, 10000);

  // Monitor worker statistics
  const statsInterval = setInterval(() => {
    const stats = worker.getStats();
    console.log('Worker Statistics:', {
      isRunning: stats.isRunning,
      totalRecordsProcessed: stats.totalRecordsProcessed,
      totalAnalysesPerformed: stats.totalAnalysesPerformed,
      totalActionsTriggered: stats.totalActionsTriggered,
      errorCount: stats.errorCount,
      uptime: Math.round(stats.uptime / 1000) + 's',
    });
  }, 20000);

  // Run for 1 minute then cleanup
  setTimeout(async () => {
    clearInterval(dataInterval);
    clearInterval(statsInterval);
    await worker.stop();
    console.log('Background worker example completed');
  }, 60000);
}

/**
 * Example 3: High-Volume Bot Detection Scenario
 */
export async function highVolumeBotDetectionExample(): Promise<void> {
  console.log('=== High-Volume Bot Detection Example ===');

  const analyzer = createRealTimeBotAnalyzer({
    analysisInterval: 30 * 1000, // 30 seconds for high-volume
    batchSize: 500,
    enableAutoActions: true,
    logLevel: 'warn', // Only show warnings and errors
  });

  analyzer.start();

  // Simulate suspicious bot activity
  const createSuspiciousRecords = (
    promoterId: string,
    campaignId: string
  ): ViewRecord[] => {
    const records: ViewRecord[] = [];
    const baseTime = Date.now();

    // Create a pattern that should trigger bot detection
    for (let i = 0; i < 20; i++) {
      records.push({
        id: `suspicious_${i}`,
        promoterId,
        campaignId,
        platform: 'tiktok',
        contentId: 'suspicious_post',
        viewCount: 100 + i * 500, // Rapid view increase
        likeCount: 2, // Very low likes compared to views
        commentCount: 0, // No comments
        shareCount: 0, // No shares
        timestamp: new Date(baseTime + i * 30000), // Every 30 seconds
      });
    }

    return records;
  };

  // Create normal activity for comparison
  const createNormalRecords = (
    promoterId: string,
    campaignId: string
  ): ViewRecord[] => {
    const records: ViewRecord[] = [];
    const baseTime = Date.now();

    for (let i = 0; i < 20; i++) {
      records.push({
        id: `normal_${i}`,
        promoterId,
        campaignId,
        platform: 'instagram',
        contentId: 'normal_post',
        viewCount: 50 + i * 10, // Gradual increase
        likeCount: Math.floor((50 + i * 10) / 8), // Reasonable like ratio
        commentCount: Math.floor((50 + i * 10) / 25), // Reasonable comment ratio
        shareCount: Math.floor((50 + i * 10) / 50), // Reasonable share ratio
        timestamp: new Date(baseTime + i * 60000), // Every minute
      });
    }

    return records;
  };

  // Add suspicious records
  const suspiciousRecords = createSuspiciousRecords(
    'bot_promoter',
    'test_campaign'
  );
  analyzer.addViewRecords(suspiciousRecords);

  // Add normal records
  const normalRecords = createNormalRecords('normal_promoter', 'test_campaign');
  analyzer.addViewRecords(normalRecords);

  // Analyze both scenarios
  try {
    console.log('Analyzing suspicious activity...');
    const suspiciousResult = await analyzer.analyzeImmediate(
      'bot_promoter',
      'test_campaign'
    );
    console.log('Suspicious Analysis:', {
      botScore: suspiciousResult.analysis.botScore,
      action: suspiciousResult.analysis.action,
      reason: suspiciousResult.analysis.reason,
      metrics: {
        viewLikeRatio: suspiciousResult.analysis.metrics.viewLikeRatio,
        viewCommentRatio: suspiciousResult.analysis.metrics.viewCommentRatio,
        spikeDetected: suspiciousResult.analysis.metrics.spikeDetected,
      },
    });

    console.log('Analyzing normal activity...');
    const normalResult = await analyzer.analyzeImmediate(
      'normal_promoter',
      'test_campaign'
    );
    console.log('Normal Analysis:', {
      botScore: normalResult.analysis.botScore,
      action: normalResult.analysis.action,
      reason: normalResult.analysis.reason,
      metrics: {
        viewLikeRatio: normalResult.analysis.metrics.viewLikeRatio,
        viewCommentRatio: normalResult.analysis.metrics.viewCommentRatio,
        spikeDetected: normalResult.analysis.metrics.spikeDetected,
      },
    });
  } catch (error) {
    console.error('High-volume analysis failed:', error);
  }

  analyzer.stop();
}

/**
 * Example 4: Global Singleton Usage
 */
export async function globalSingletonExample(): Promise<void> {
  console.log('=== Global Singleton Example ===');

  // Get global analyzer instance
  const globalAnalyzer = getGlobalBotAnalyzer();
  globalAnalyzer.start();

  // Get global worker instance
  const globalWorker = getGlobalBotAnalysisWorker();
  await globalWorker.start();

  // Use global instances
  const testRecords: ViewRecord[] = [
    {
      id: 'global_test',
      promoterId: 'global_promoter',
      campaignId: 'global_campaign',
      platform: 'tiktok',
      contentId: 'global_post',
      viewCount: 500,
      likeCount: 25,
      commentCount: 5,
      shareCount: 2,
      timestamp: new Date(),
    },
  ];

  globalWorker.addViewRecords(testRecords);

  try {
    const result = await globalAnalyzer.analyzeImmediate(
      'global_promoter',
      'global_campaign'
    );
    console.log('Global Analysis Result:', {
      botScore: result.analysis.botScore,
      action: result.analysis.action,
    });
  } catch (error) {
    console.error('Global analysis failed:', error);
  }

  // Cleanup
  globalAnalyzer.stop();
  await globalWorker.stop();
}

/**
 * Example 5: Custom Bot Detection Configuration
 */
export async function customBotDetectionExample(): Promise<void> {
  console.log('=== Custom Bot Detection Configuration Example ===');

  // Create custom bot detection service with stricter thresholds
  const customBotService = new BotDetectionService({
    thresholds: {
      viewLikeRatio: 5, // Stricter ratio (default: 10)
      viewCommentRatio: 50, // Stricter ratio (default: 100)
      spikePercentage: 300, // Lower spike threshold (default: 500)
      spikeTimeWindow: 3 * 60 * 1000, // 3 minutes (default: 5)
    },
    confidence: {
      ban: 80, // Lower ban threshold (default: 90)
      warning: 40, // Lower warning threshold (default: 50)
      monitor: 15, // Lower monitor threshold (default: 20)
    },
  });

  // Create analyzer with custom bot detection service
  const analyzer = new RealTimeBotAnalyzer(customBotService, {
    enableAutoActions: true,
    logLevel: 'info',
  });

  analyzer.start();

  // Test with moderately suspicious activity
  const moderateRecords: ViewRecord[] = [
    {
      id: 'moderate_test',
      promoterId: 'moderate_promoter',
      campaignId: 'moderate_campaign',
      platform: 'instagram',
      contentId: 'moderate_post',
      viewCount: 400,
      likeCount: 60, // Ratio: 6.67:1 (would be normal with default, suspicious with custom)
      commentCount: 10, // Ratio: 40:1 (would be normal with default, suspicious with custom)
      shareCount: 5,
      timestamp: new Date(),
    },
  ];

  analyzer.addViewRecords(moderateRecords);

  try {
    const result = await analyzer.analyzeImmediate(
      'moderate_promoter',
      'moderate_campaign'
    );
    console.log('Custom Detection Result:', {
      botScore: result.analysis.botScore,
      action: result.analysis.action,
      reason: result.analysis.reason,
      confidence: result.analysis.confidence,
    });
  } catch (error) {
    console.error('Custom detection failed:', error);
  }

  analyzer.stop();
}

/**
 * Run all examples
 */
export async function runAllExamples(): Promise<void> {
  console.log('🤖 Running Real-Time Bot Analysis Examples...\n');

  try {
    await basicBotAnalysisExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await highVolumeBotDetectionExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await globalSingletonExample();
    console.log('\n' + '='.repeat(50) + '\n');

    await customBotDetectionExample();
    console.log('\n' + '='.repeat(50) + '\n');

    // Note: backgroundWorkerExample runs for 1 minute, so we'll skip it in the full run
    console.log('✅ All examples completed successfully!');
    console.log('\nTo run the background worker example separately:');
    console.log('backgroundWorkerExample()');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Individual examples are already exported above

// Auto-run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}

// To run the background worker example:
// backgroundWorkerExample().catch(console.error);
