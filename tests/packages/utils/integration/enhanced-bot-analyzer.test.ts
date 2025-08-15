import { EnhancedBotAnalyzer } from '@repo/utils/enhanced-bot-analyzer';
import { ViewRecord } from '@repo/utils/bot-detection';

/**
 * Playtest for EnhancedBotAnalyzer
 * This test demonstrates the core functionality of the analyzer in a simple scenario.
 */
describe('EnhancedBotAnalyzer Playtest', () => {
  it('should perform analysis and return a result', async () => {
    console.log('🧪 Running EnhancedBotAnalyzer Playtest...');

    // 1. Initialize the analyzer
    const analyzer = new EnhancedBotAnalyzer({
      logging: { enabled: false }, // Disable file logging for the test
      actions: { autoExecute: false }, // Disable automatic actions
    });

    // 2. Define a set of view records for a promoter
    const promoterId = 'playtest-promoter';
    const campaignId = 'playtest-campaign';
    const viewRecords: ViewRecord[] = [
      {
        id: 'view1',
        promoterId,
        campaignId,
        platform: 'tiktok',
        contentId: 'post-abc',
        viewCount: 1000,
        likeCount: 10, // Suspiciously low
        commentCount: 1,
        shareCount: 0,
        timestamp: new Date(Date.now() - 60000),
      },
      {
        id: 'view2',
        promoterId,
        campaignId,
        platform: 'tiktok',
        contentId: 'post-abc',
        viewCount: 5000, // Represents a spike
        likeCount: 25,
        commentCount: 2,
        shareCount: 1,
        timestamp: new Date(),
      },
    ];

    // 3. Perform the analysis
    const { analysis, actionResult } = await analyzer.performAnalysis(
      promoterId,
      campaignId,
      viewRecords
    );

    // 4. Log the output to see the results
    console.log('📊 Analysis Result:', {
      botScore: analysis.botScore,
      action: analysis.action,
      reason: analysis.reason,
    });

    // 5. Basic assertions to ensure the test ran correctly
    expect(analysis).toBeDefined();
    expect(actionResult).toBeDefined();
    expect(analysis.botScore).toBeGreaterThan(0); // Expect some level of suspicion

    console.log('✅ Playtest finished.');
  });
});
