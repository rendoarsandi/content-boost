import { BotDetectionService, ViewRecord } from '../src/bot-detection';

/**
 * Playtest for BotDetectionService
 * This test demonstrates the core functionality of the service in a simple scenario.
 */
describe('BotDetectionService Playtest', () => {
  it('should analyze views and identify suspicious activity', async () => {
    console.log('🧪 Running BotDetectionService Playtest...');

    // 1. Initialize the service
    const botDetectionService = new BotDetectionService();

    // 2. Define a set of view records for a promoter
    const promoterId = 'playtest-promoter';
    const campaignId = 'playtest-campaign';
    const viewRecords: ViewRecord[] = [
      {
        id: 'view1',
        promoterId,
        campaignId,
        platform: 'tiktok',
        contentId: 'post-xyz',
        viewCount: 2000,
        likeCount: 15, // Very low likes for the view count
        commentCount: 2,
        shareCount: 1,
        timestamp: new Date(Date.now() - 120000),
      },
      {
        id: 'view2',
        promoterId,
        campaignId,
        platform: 'tiktok',
        contentId: 'post-xyz',
        viewCount: 8000, // A significant spike in views
        likeCount: 40,
        commentCount: 5,
        shareCount: 2,
        timestamp: new Date(),
      },
    ];

    // 3. Perform the analysis
    const analysis = await botDetectionService.analyzeViews(
      promoterId,
      campaignId,
      viewRecords
    );

    // 4. Log the output to see the results
    console.log('📊 Analysis Result:', {
      botScore: analysis.botScore,
      action: analysis.action,
      reason: analysis.reason,
      spikeDetected: analysis.metrics.spikeDetected,
      viewLikeRatio: analysis.metrics.viewLikeRatio,
    });

    // 5. Basic assertions to ensure the test ran correctly
    expect(analysis).toBeDefined();
    expect(analysis.botScore).toBeGreaterThan(50); // Expect a high score
    expect(analysis.action).toBe('warning'); // Or 'ban', depending on the score
    expect(analysis.metrics.spikeDetected).toBe(true);

    console.log('✅ Playtest finished.');
  });
});
