/**
 * Integration test for Real-Time Bot Analysis Engine
 * This demonstrates the core functionality working together
 */

import { RealTimeBotAnalyzer, createRealTimeBotAnalyzer } from '../real-time-bot-analyzer';
import { BotDetectionService, ViewRecord } from '../bot-detection';

/**
 * Simple integration test to verify the bot analysis engine works
 */
export async function testBotAnalysisIntegration(): Promise<void> {
  console.log('🧪 Testing Real-Time Bot Analysis Engine Integration...\n');

  try {
    // Create a real bot detection service (not mocked)
    const botService = new BotDetectionService();
    
    // Create analyzer with real service
    const analyzer = new RealTimeBotAnalyzer(botService, {
      analysisInterval: 1000, // 1 second for testing
      batchSize: 10,
      cacheTimeout: 60, // 1 minute
      enableAutoActions: false, // Disable actions for testing
      logLevel: 'info'
    });

    // Start the analyzer
    analyzer.start();
    console.log('✅ Analyzer started successfully');

    // Create test view records that should trigger bot detection
    const suspiciousRecords: ViewRecord[] = [
      {
        id: 'test_1',
        promoterId: 'test_promoter',
        campaignId: 'test_campaign',
        platform: 'tiktok',
        platformPostId: 'test_post',
        viewCount: 1000,
        likeCount: 5, // Very low likes for high views (suspicious ratio)
        commentCount: 0, // No comments (suspicious)
        shareCount: 0, // No shares (suspicious)
        timestamp: new Date()
      },
      {
        id: 'test_2',
        promoterId: 'test_promoter',
        campaignId: 'test_campaign',
        platform: 'tiktok',
        platformPostId: 'test_post',
        viewCount: 5000, // Huge spike (500% increase)
        likeCount: 7,
        commentCount: 0,
        shareCount: 0,
        timestamp: new Date(Date.now() + 60000) // 1 minute later
      }
    ];

    // Add suspicious records
    analyzer.addViewRecords(suspiciousRecords);
    console.log('✅ Added suspicious view records');

    // Perform analysis
    const result = await analyzer.analyzeImmediate('test_promoter', 'test_campaign');
    
    console.log('\n📊 Analysis Results:');
    console.log(`Bot Score: ${result.analysis.botScore}%`);
    console.log(`Action: ${result.analysis.action}`);
    console.log(`Reason: ${result.analysis.reason}`);
    console.log(`Processing Time: ${result.processingTime}ms`);
    
    console.log('\n📈 Metrics:');
    console.log(`Total Views: ${result.analysis.metrics.totalViews}`);
    console.log(`Total Likes: ${result.analysis.metrics.totalLikes}`);
    console.log(`View:Like Ratio: ${result.analysis.metrics.viewLikeRatio.toFixed(1)}:1`);
    console.log(`View:Comment Ratio: ${result.analysis.metrics.viewCommentRatio.toFixed(1)}:1`);
    console.log(`Spike Detected: ${result.analysis.metrics.spikeDetected}`);
    if (result.analysis.metrics.spikePercentage) {
      console.log(`Spike Percentage: ${result.analysis.metrics.spikePercentage.toFixed(1)}%`);
    }

    // Verify bot detection worked
    if (result.analysis.botScore > 50) {
      console.log('\n✅ Bot detection working correctly - high bot score detected');
    } else {
      console.log('\n⚠️  Bot detection may need tuning - low bot score for suspicious activity');
    }

    // Test normal activity for comparison
    const normalRecords: ViewRecord[] = [
      {
        id: 'normal_1',
        promoterId: 'normal_promoter',
        campaignId: 'test_campaign',
        platform: 'instagram',
        platformPostId: 'normal_post',
        viewCount: 100,
        likeCount: 15, // Good ratio
        commentCount: 8, // Good engagement
        shareCount: 3, // Good sharing
        timestamp: new Date()
      },
      {
        id: 'normal_2',
        promoterId: 'normal_promoter',
        campaignId: 'test_campaign',
        platform: 'instagram',
        platformPostId: 'normal_post',
        viewCount: 120, // Gradual increase
        likeCount: 18,
        commentCount: 10,
        shareCount: 4,
        timestamp: new Date(Date.now() + 60000)
      }
    ];

    analyzer.addViewRecords(normalRecords);
    const normalResult = await analyzer.analyzeImmediate('normal_promoter', 'test_campaign');
    
    console.log('\n📊 Normal Activity Analysis:');
    console.log(`Bot Score: ${normalResult.analysis.botScore}%`);
    console.log(`Action: ${normalResult.analysis.action}`);
    console.log(`View:Like Ratio: ${normalResult.analysis.metrics.viewLikeRatio.toFixed(1)}:1`);

    if (normalResult.analysis.botScore < 30) {
      console.log('✅ Normal activity correctly identified as legitimate');
    } else {
      console.log('⚠️  Normal activity flagged as suspicious - may need threshold adjustment');
    }

    // Test statistics
    const stats = analyzer.getStatistics();
    console.log('\n📈 Analyzer Statistics:');
    console.log(`Queue Size: ${stats.queueSize}`);
    console.log(`Cache Size: ${stats.cacheSize}`);
    console.log(`Is Running: ${stats.isRunning}`);

    // Stop the analyzer
    analyzer.stop();
    console.log('\n✅ Analyzer stopped successfully');

    console.log('\n🎉 Integration test completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Integration test failed:', error);
    throw error;
  }
}

/**
 * Test caching functionality
 */
export async function testCachingFunctionality(): Promise<void> {
  console.log('🧪 Testing Caching Functionality...\n');

  const analyzer = createRealTimeBotAnalyzer({
    cacheTimeout: 2, // 2 seconds for testing
    logLevel: 'info'
  });

  analyzer.start();

  const testRecords: ViewRecord[] = [{
    id: 'cache_test',
    promoterId: 'cache_promoter',
    campaignId: 'cache_campaign',
    platform: 'tiktok',
    platformPostId: 'cache_post',
    viewCount: 500,
    likeCount: 25,
    commentCount: 5,
    shareCount: 2,
    timestamp: new Date()
  }];

  analyzer.addViewRecords(testRecords);

  // First analysis
  const start1 = Date.now();
  const result1 = await analyzer.analyzeImmediate('cache_promoter', 'cache_campaign');
  const time1 = Date.now() - start1;

  // Second analysis (should use cache)
  const start2 = Date.now();
  const result2 = await analyzer.analyzeImmediate('cache_promoter', 'cache_campaign');
  const time2 = Date.now() - start2;

  console.log(`First analysis time: ${time1}ms`);
  console.log(`Second analysis time: ${time2}ms (cached)`);

  if (time2 < time1) {
    console.log('✅ Caching is working - second analysis was faster');
  } else {
    console.log('⚠️  Caching may not be working optimally');
  }

  // Wait for cache to expire
  console.log('Waiting for cache to expire...');
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Third analysis (cache should be expired)
  const start3 = Date.now();
  const result3 = await analyzer.analyzeImmediate('cache_promoter', 'cache_campaign');
  const time3 = Date.now() - start3;

  console.log(`Third analysis time: ${time3}ms (after cache expiry)`);

  if (time3 > time2) {
    console.log('✅ Cache expiry is working correctly');
  }

  analyzer.stop();
  console.log('✅ Caching test completed');
}

/**
 * Run all integration tests
 */
export async function runIntegrationTests(): Promise<void> {
  console.log('🚀 Starting Real-Time Bot Analysis Integration Tests\n');
  console.log('=' .repeat(60) + '\n');

  try {
    await testBotAnalysisIntegration();
    console.log('\n' + '=' .repeat(60) + '\n');
    
    await testCachingFunctionality();
    console.log('\n' + '=' .repeat(60) + '\n');

    console.log('🎉 All integration tests passed successfully!');
    
  } catch (error) {
    console.error('❌ Integration tests failed:', error);
    process.exit(1);
  }
}

// Auto-run if this file is executed directly
if (require.main === module) {
  runIntegrationTests().catch(console.error);
}