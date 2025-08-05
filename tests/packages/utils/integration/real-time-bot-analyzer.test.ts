import { RealTimeBotAnalyzer } from '../src/real-time-bot-analyzer';
import { BotDetectionService, ViewRecord } from '../src/bot-detection';

/**
 * Playtest for RealTimeBotAnalyzer
 * This test demonstrates the core functionality of the real-time analyzer.
 */
describe('RealTimeBotAnalyzer Playtest', () => {
  it('should add records and perform immediate analysis', async () => {
    console.log('🧪 Running RealTimeBotAnalyzer Playtest...');

    // 1. Initialize the analyzer with a real BotDetectionService
    const botDetectionService = new BotDetectionService();
    const analyzer = new RealTimeBotAnalyzer(botDetectionService, {
      logLevel: 'error', // Keep console clean
    });

    // 2. Define view records
    const promoterId = 'playtest-promoter-realtime';
    const campaignId = 'playtest-campaign-realtime';
    const viewRecords: ViewRecord[] = [
      {
        id: 'rt-view1',
        promoterId,
        campaignId,
        platform: 'instagram',
        contentId: 'post-realtime',
        viewCount: 500,
        likeCount: 5,
        commentCount: 0,
        shareCount: 0,
        timestamp: new Date(),
      },
    ];

    // 3. Add records to the analyzer
    analyzer.addViewRecords(viewRecords);
    console.log(
      `Records added to queue. Queue size: ${analyzer.getStatistics().queueSize}`
    );

    // 4. Trigger an immediate analysis
    const result = await analyzer.analyzeImmediate(promoterId, campaignId);

    // 5. Log the output
    console.log('📊 Immediate Analysis Result:', {
      botScore: result.analysis.botScore,
      action: result.analysis.action,
      reason: result.analysis.reason,
    });

    // 6. Assertions
    expect(result).toBeDefined();
    expect(result.analysis.botScore).toBeGreaterThan(0);

    // 7. Test caching
    const cachedResult = await analyzer.analyzeImmediate(
      promoterId,
      campaignId
    );
    console.log('📊 Cached Analysis Result:', {
      botScore: cachedResult.analysis.botScore,
    });
    expect(cachedResult.analysis.botScore).toEqual(result.analysis.botScore);

    console.log('✅ Playtest finished.');
  });
});
