import { performance } from 'perf_hooks';
import {
  detectBot,
  BotDetectionConfig,
  ViewMetrics,
} from '../src/bot-detection';

/**
 * Performance test for bot detection algorithm
 *
 * This test measures the performance of the bot detection algorithm under various loads
 * and with different types of data patterns.
 */

describe('Bot Detection Algorithm Performance Tests', () => {
  // Standard configuration
  const config: BotDetectionConfig = {
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
  };

  // Helper to generate test data
  function generateTestData(
    count: number,
    viewsPerMinute: number,
    likesRatio: number,
    commentsRatio: number,
    includeSpike: boolean = false
  ): ViewMetrics[] {
    const now = Date.now();
    const data: ViewMetrics[] = [];

    for (let i = 0; i < count; i++) {
      const timestamp = new Date(now - (count - i) * 60 * 1000); // One minute intervals
      const views = viewsPerMinute;
      const likes = Math.round(views / likesRatio);
      const comments = Math.round(views / commentsRatio);

      // Add spike if requested (5x normal views at 75% through the dataset)
      const isSpike = includeSpike && i === Math.floor(count * 0.75);

      data.push({
        timestamp,
        viewCount: isSpike ? views * 5 : views,
        likeCount: likes,
        commentCount: comments,
        shareCount: Math.round(comments / 2),
      });
    }

    return data;
  }

  // Test with small dataset (30 minutes of data)
  test('Performance with small dataset (30 data points)', () => {
    const normalData = generateTestData(30, 100, 10, 100);

    const start = performance.now();
    const result = detectBot(
      'test-promoter',
      'test-campaign',
      normalData,
      config
    );
    const end = performance.now();

    console.log(`Small dataset (30 points) execution time: ${end - start}ms`);
    expect(end - start).toBeLessThan(50); // Should be very fast, under 50ms
    expect(result).toBeDefined();
  });

  // Test with medium dataset (24 hours of data)
  test('Performance with medium dataset (1440 data points)', () => {
    const normalData = generateTestData(1440, 100, 10, 100);

    const start = performance.now();
    const result = detectBot(
      'test-promoter',
      'test-campaign',
      normalData,
      config
    );
    const end = performance.now();

    console.log(
      `Medium dataset (1440 points) execution time: ${end - start}ms`
    );
    expect(end - start).toBeLessThan(200); // Should be under 200ms
    expect(result).toBeDefined();
  });

  // Test with large dataset (7 days of data)
  test('Performance with large dataset (10080 data points)', () => {
    const normalData = generateTestData(10080, 100, 10, 100);

    const start = performance.now();
    const result = detectBot(
      'test-promoter',
      'test-campaign',
      normalData,
      config
    );
    const end = performance.now();

    console.log(
      `Large dataset (10080 points) execution time: ${end - start}ms`
    );
    expect(end - start).toBeLessThan(1000); // Should be under 1 second
    expect(result).toBeDefined();
  });

  // Test with bot-like data (high view:like ratio)
  test('Performance with bot-like data (high view:like ratio)', () => {
    const botData = generateTestData(1440, 1000, 100, 1000);

    const start = performance.now();
    const result = detectBot('test-promoter', 'test-campaign', botData, config);
    const end = performance.now();

    console.log(`Bot-like data execution time: ${end - start}ms`);
    expect(end - start).toBeLessThan(200);
    expect(result.botScore).toBeGreaterThan(50); // Should detect suspicious activity
  });

  // Test with spike detection
  test('Performance with spike detection', () => {
    const spikeData = generateTestData(1440, 100, 10, 100, true);

    const start = performance.now();
    const result = detectBot(
      'test-promoter',
      'test-campaign',
      spikeData,
      config
    );
    const end = performance.now();

    console.log(`Spike detection execution time: ${end - start}ms`);
    expect(end - start).toBeLessThan(200);
    expect(result.metrics.spikeDetected).toBe(true);
  });

  // Test with mixed data patterns
  test('Performance with mixed data patterns', () => {
    // Create a complex dataset with varying patterns
    const now = Date.now();
    const mixedData: ViewMetrics[] = [];

    // Normal pattern for first 6 hours
    for (let i = 0; i < 360; i++) {
      mixedData.push({
        timestamp: new Date(now - (1440 - i) * 60 * 1000),
        viewCount: 100 + Math.random() * 20,
        likeCount: 10 + Math.random() * 5,
        commentCount: 1 + Math.random() * 1,
        shareCount: Math.random() * 1,
      });
    }

    // Bot-like pattern for next 6 hours
    for (let i = 360; i < 720; i++) {
      mixedData.push({
        timestamp: new Date(now - (1440 - i) * 60 * 1000),
        viewCount: 500 + Math.random() * 100,
        likeCount: 5 + Math.random() * 2,
        commentCount: 0.5 + Math.random() * 0.5,
        shareCount: Math.random() * 0.5,
      });
    }

    // Spike for 30 minutes
    for (let i = 720; i < 750; i++) {
      mixedData.push({
        timestamp: new Date(now - (1440 - i) * 60 * 1000),
        viewCount: 2000 + Math.random() * 500,
        likeCount: 20 + Math.random() * 10,
        commentCount: 2 + Math.random() * 1,
        shareCount: 1 + Math.random() * 1,
      });
    }

    // Return to normal for remaining time
    for (let i = 750; i < 1440; i++) {
      mixedData.push({
        timestamp: new Date(now - (1440 - i) * 60 * 1000),
        viewCount: 100 + Math.random() * 20,
        likeCount: 10 + Math.random() * 5,
        commentCount: 1 + Math.random() * 1,
        shareCount: Math.random() * 1,
      });
    }

    const start = performance.now();
    const result = detectBot(
      'test-promoter',
      'test-campaign',
      mixedData,
      config
    );
    const end = performance.now();

    console.log(`Mixed data patterns execution time: ${end - start}ms`);
    expect(end - start).toBeLessThan(500);
    expect(result).toBeDefined();
  });
});
