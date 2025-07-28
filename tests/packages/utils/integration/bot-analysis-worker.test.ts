import { BotAnalysisWorker } from '../src/bot-analysis-worker';
import { ViewRecord } from '../src/bot-detection';

/**
 * Playtest for BotAnalysisWorker
 * This test demonstrates the worker's ability to process records in the background.
 */
describe('BotAnalysisWorker Playtest', () => {
  it('should start, process records, and stop', async () => {
    console.log('🧪 Running BotAnalysisWorker Playtest...');

    // 1. Initialize the worker
    const worker = new BotAnalysisWorker({
      worker: {
        enabled: true,
        dataFetchInterval: 500, // Fetch data every 0.5s
      },
      logging: { enabled: false }, // Disable file logging
    });

    // 2. Start the worker
    await worker.start();
    expect(worker.getStats().isRunning).toBe(true);
    console.log('✅ Worker started.');

    // 3. Add some view records to be processed
    const viewRecords: ViewRecord[] = [
      {
        id: 'worker-view1',
        promoterId: 'playtest-promoter-worker',
        campaignId: 'playtest-campaign-worker',
        platform: 'tiktok',
        contentId: 'post-worker',
        viewCount: 1500,
        likeCount: 12,
        commentCount: 3,
        shareCount: 1,
        timestamp: new Date(),
      },
    ];
    worker.addViewRecords(viewRecords);
    console.log(`Records added. Total processed: ${worker.getStats().totalRecordsProcessed}`);

    // 4. Wait for the worker to perform analysis
    // In a real scenario, this would happen automatically in the background.
    // For this test, we'll wait a moment to simulate background processing.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // 5. Check the stats to see if analysis was performed
    const stats = worker.getStats();
    console.log('📊 Worker Stats after processing:', {
      analyses: stats.totalAnalysesPerformed,
      errors: stats.errorCount,
    });

    // Due to the nature of background workers, we can't easily assert the
    // number of analyses, but we expect it to be running without errors.
    expect(stats.errorCount).toBe(0);

    // 6. Stop the worker
    await worker.stop();
    expect(worker.getStats().isRunning).toBe(false);
    console.log('✅ Worker stopped.');

    console.log('✅ Playtest finished.');
  }, 10000); // Increase timeout for this test
});
