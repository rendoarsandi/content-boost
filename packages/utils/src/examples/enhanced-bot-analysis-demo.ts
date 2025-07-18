import { 
  EnhancedBotAnalyzer, 
  createEnhancedBotAnalyzer,
  getGlobalEnhancedBotAnalyzer 
} from '../enhanced-bot-analyzer';
import { ViewRecord } from '../bot-detection';

/**
 * Comprehensive demo of the Enhanced Bot Analysis Engine
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7
 */

// Sample view records for different scenarios
const legitimateViewRecords: ViewRecord[] = [
  {
    id: '1',
    promoterId: 'promoter-legit-001',
    campaignId: 'campaign-001',
    platform: 'tiktok',
    platformPostId: 'tiktok-post-1',
    viewCount: 100,
    likeCount: 15,
    commentCount: 3,
    shareCount: 2,
    timestamp: new Date(Date.now() - 10 * 60 * 1000) // 10 minutes ago
  },
  {
    id: '2',
    promoterId: 'promoter-legit-001',
    campaignId: 'campaign-001',
    platform: 'tiktok',
    platformPostId: 'tiktok-post-1',
    viewCount: 150,
    likeCount: 22,
    commentCount: 5,
    shareCount: 3,
    timestamp: new Date(Date.now() - 5 * 60 * 1000) // 5 minutes ago
  },
  {
    id: '3',
    promoterId: 'promoter-legit-001',
    campaignId: 'campaign-001',
    platform: 'tiktok',
    platformPostId: 'tiktok-post-1',
    viewCount: 180,
    likeCount: 28,
    commentCount: 6,
    shareCount: 4,
    timestamp: new Date() // Now
  }
];

const suspiciousViewRecords: ViewRecord[] = [
  {
    id: '4',
    promoterId: 'promoter-suspicious-002',
    campaignId: 'campaign-002',
    platform: 'instagram',
    platformPostId: 'insta-post-1',
    viewCount: 1000,
    likeCount: 5, // Very low engagement
    commentCount: 0,
    shareCount: 1,
    timestamp: new Date(Date.now() - 8 * 60 * 1000)
  },
  {
    id: '5',
    promoterId: 'promoter-suspicious-002',
    campaignId: 'campaign-002',
    platform: 'instagram',
    platformPostId: 'insta-post-1',
    viewCount: 1200,
    likeCount: 6,
    commentCount: 0,
    shareCount: 1,
    timestamp: new Date(Date.now() - 4 * 60 * 1000)
  }
];

const botViewRecords: ViewRecord[] = [
  {
    id: '6',
    promoterId: 'promoter-bot-003',
    campaignId: 'campaign-003',
    platform: 'tiktok',
    platformPostId: 'tiktok-bot-post',
    viewCount: 10000, // Extremely high views
    likeCount: 0, // No likes at all
    commentCount: 0, // No comments at all
    shareCount: 0,
    timestamp: new Date(Date.now() - 2 * 60 * 1000)
  }
];

const spikeViewRecords: ViewRecord[] = [
  {
    id: '7',
    promoterId: 'promoter-spike-004',
    campaignId: 'campaign-004',
    platform: 'tiktok',
    platformPostId: 'tiktok-spike-post',
    viewCount: 100,
    likeCount: 10,
    commentCount: 2,
    shareCount: 1,
    timestamp: new Date(Date.now() - 10 * 60 * 1000)
  },
  {
    id: '8',
    promoterId: 'promoter-spike-004',
    campaignId: 'campaign-004',
    platform: 'tiktok',
    platformPostId: 'tiktok-spike-post',
    viewCount: 800, // 700% spike within 5 minutes
    likeCount: 50,
    commentCount: 8,
    shareCount: 10,
    timestamp: new Date(Date.now() - 7 * 60 * 1000) // 3 minutes after first record
  }
];

async function demonstrateEnhancedBotAnalysis() {
  console.log('🤖 Enhanced Bot Analysis Engine Demo');
  console.log('=====================================\n');

  // Create enhanced bot analyzer with custom configuration
  const analyzer = createEnhancedBotAnalyzer({
    logging: {
      enabled: true,
      logPath: 'logs/bot-detection/',
      auditTrail: true,
      detailedAnalysis: true
    },
    actions: {
      autoExecute: true,
      requireConfirmation: false,
      notifyAdmins: true
    },
    thresholds: {
      highConfidenceBan: 90,
      mediumConfidenceWarning: 50,
      lowConfidenceMonitor: 20
    }
  });

  // Test Case 1: Legitimate Activity
  console.log('📊 Test Case 1: Legitimate Activity');
  console.log('-----------------------------------');
  try {
    const legitimateResult = await analyzer.performAnalysis(
      'promoter-legit-001',
      'campaign-001',
      legitimateViewRecords
    );

    console.log(`Bot Score: ${legitimateResult.analysis.botScore}%`);
    console.log(`Action: ${legitimateResult.analysis.action}`);
    console.log(`Reason: ${legitimateResult.analysis.reason}`);
    console.log(`Action Executed: ${legitimateResult.actionResult.executed}`);
    console.log(`Views Analyzed: ${legitimateResult.actionResult.details.viewsAnalyzed}`);
    console.log(`Suspicious Patterns: ${legitimateResult.actionResult.details.suspiciousPatterns.join(', ') || 'None'}`);
    console.log();
  } catch (error) {
    console.error('Error in legitimate analysis:', error);
  }

  // Test Case 2: Suspicious Activity (Warning Level)
  console.log('⚠️  Test Case 2: Suspicious Activity');
  console.log('-----------------------------------');
  try {
    const suspiciousResult = await analyzer.performAnalysis(
      'promoter-suspicious-002',
      'campaign-002',
      suspiciousViewRecords
    );

    console.log(`Bot Score: ${suspiciousResult.analysis.botScore}%`);
    console.log(`Action: ${suspiciousResult.analysis.action}`);
    console.log(`Reason: ${suspiciousResult.analysis.reason}`);
    console.log(`Action Executed: ${suspiciousResult.actionResult.executed}`);
    console.log(`Views Analyzed: ${suspiciousResult.actionResult.details.viewsAnalyzed}`);
    console.log(`Suspicious Patterns: ${suspiciousResult.actionResult.details.suspiciousPatterns.join(', ')}`);
    console.log();
  } catch (error) {
    console.error('Error in suspicious analysis:', error);
  }

  // Test Case 3: Bot Activity (Ban Level)
  console.log('🚫 Test Case 3: Bot Activity (High Confidence)');
  console.log('----------------------------------------------');
  try {
    const botResult = await analyzer.performAnalysis(
      'promoter-bot-003',
      'campaign-003',
      botViewRecords
    );

    console.log(`Bot Score: ${botResult.analysis.botScore}%`);
    console.log(`Action: ${botResult.analysis.action}`);
    console.log(`Reason: ${botResult.analysis.reason}`);
    console.log(`Action Executed: ${botResult.actionResult.executed}`);
    console.log(`Views Analyzed: ${botResult.actionResult.details.viewsAnalyzed}`);
    console.log(`Suspicious Patterns: ${botResult.actionResult.details.suspiciousPatterns.join(', ')}`);
    console.log();
  } catch (error) {
    console.error('Error in bot analysis:', error);
  }

  // Test Case 4: Spike Detection
  console.log('📈 Test Case 4: View Spike Detection');
  console.log('-----------------------------------');
  try {
    const spikeResult = await analyzer.performAnalysis(
      'promoter-spike-004',
      'campaign-004',
      spikeViewRecords
    );

    console.log(`Bot Score: ${spikeResult.analysis.botScore}%`);
    console.log(`Action: ${spikeResult.analysis.action}`);
    console.log(`Reason: ${spikeResult.analysis.reason}`);
    console.log(`Action Executed: ${spikeResult.actionResult.executed}`);
    console.log(`Spike Detected: ${spikeResult.analysis.metrics.spikeDetected}`);
    console.log(`Spike Percentage: ${spikeResult.analysis.metrics.spikePercentage?.toFixed(1)}%`);
    console.log(`Suspicious Patterns: ${spikeResult.actionResult.details.suspiciousPatterns.join(', ')}`);
    console.log();
  } catch (error) {
    console.error('Error in spike analysis:', error);
  }

  // Display comprehensive statistics
  console.log('📊 Analysis Statistics');
  console.log('---------------------');
  const stats = analyzer.getStatistics();
  console.log(`Total Analyses: ${stats.totalAnalyses}`);
  console.log(`Average Confidence: ${stats.averageConfidence.toFixed(1)}%`);
  console.log(`Recent Activity (24h): ${stats.recentActivity}`);
  console.log('Actions Summary:');
  Object.entries(stats.actionsSummary).forEach(([action, count]) => {
    console.log(`  ${action}: ${count}`);
  });
  console.log();

  // Display analysis history for one promoter
  console.log('📜 Analysis History Example');
  console.log('---------------------------');
  const history = analyzer.getAnalysisHistory('promoter-bot-003', 'campaign-003');
  if (history.length > 0) {
    const lastAnalysis = history[history.length - 1];
    console.log(`Last Analysis: ${lastAnalysis.timestamp.toISOString()}`);
    console.log(`Processing Time: ${lastAnalysis.processingTime}ms`);
    console.log(`Bot Score: ${lastAnalysis.analysis.botScore}%`);
    console.log(`Action Taken: ${lastAnalysis.actionResult.action}`);
  }
  console.log();

  console.log('✅ Enhanced Bot Analysis Demo Complete!');
  console.log('Check logs/bot-detection/ directory for detailed logs.');
}

// Demonstrate different confidence scoring scenarios
async function demonstrateConfidenceScoring() {
  console.log('\n🎯 Confidence Scoring Scenarios');
  console.log('===============================\n');

  const analyzer = createEnhancedBotAnalyzer();

  // Scenario 1: Multiple suspicious patterns
  const multiPatternRecords: ViewRecord[] = [
    {
      id: 'multi-1',
      promoterId: 'multi-pattern-promoter',
      campaignId: 'multi-pattern-campaign',
      platform: 'tiktok',
      platformPostId: 'multi-pattern-post',
      viewCount: 5000, // High views
      likeCount: 10, // Very low likes (500:1 ratio)
      commentCount: 1, // Very low comments (5000:1 ratio)
      shareCount: 0,
      timestamp: new Date()
    }
  ];

  const multiResult = await analyzer.performAnalysis(
    'multi-pattern-promoter',
    'multi-pattern-campaign',
    multiPatternRecords
  );

  console.log('Multiple Suspicious Patterns:');
  console.log(`- View:Like Ratio: ${multiResult.analysis.metrics.viewLikeRatio.toFixed(1)}:1`);
  console.log(`- View:Comment Ratio: ${multiResult.analysis.metrics.viewCommentRatio.toFixed(1)}:1`);
  console.log(`- Bot Score: ${multiResult.analysis.botScore}%`);
  console.log(`- Action: ${multiResult.analysis.action}`);
  console.log(`- Patterns: ${multiResult.actionResult.details.suspiciousPatterns.join(', ')}`);
  console.log();

  // Scenario 2: Regular timing patterns (bot-like)
  const regularTimingRecords: ViewRecord[] = Array.from({ length: 5 }, (_, i) => ({
    id: `timing-${i + 1}`,
    promoterId: 'timing-pattern-promoter',
    campaignId: 'timing-pattern-campaign',
    platform: 'instagram',
    platformPostId: 'timing-pattern-post',
    viewCount: 200 + (i * 100),
    likeCount: 20 + (i * 5),
    commentCount: 2 + i,
    shareCount: 1,
    timestamp: new Date(Date.now() - (5 - i) * 60 * 1000) // Exactly 1 minute apart
  }));

  const timingResult = await analyzer.performAnalysis(
    'timing-pattern-promoter',
    'timing-pattern-campaign',
    regularTimingRecords
  );

  console.log('Regular Timing Patterns:');
  console.log(`- Bot Score: ${timingResult.analysis.botScore}%`);
  console.log(`- Action: ${timingResult.analysis.action}`);
  console.log(`- Enhanced Patterns Detected: ${timingResult.analysis.reason.includes('timing patterns')}`);
  console.log();
}

// Main execution
async function main() {
  try {
    await demonstrateEnhancedBotAnalysis();
    await demonstrateConfidenceScoring();
  } catch (error) {
    console.error('Demo failed:', error);
  }
}

// Export for use in other modules
export {
  demonstrateEnhancedBotAnalysis,
  demonstrateConfidenceScoring,
  legitimateViewRecords,
  suspiciousViewRecords,
  botViewRecords,
  spikeViewRecords
};

// Run demo if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}