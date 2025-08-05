import {
  RedisCache,
  CacheKeyManager,
  createCache,
  createRedisConfig,
} from './index';

// Example usage of the cache package
export async function cacheUsageExample() {
  // Method 1: Create cache with factory function (recommended)
  const cache = createCache();

  // Method 2: Create cache manually
  const manualConfig = createRedisConfig();
  const manualCache = new RedisCache(manualConfig);

  try {
    // Connect to Redis
    await cache.connect();
    console.log('Connected to Redis');

    // Health check
    const isHealthy = await cache.ping();
    console.log('Redis health:', isHealthy);

    // Session management example
    const sessionId = 'user-session-123';
    const sessionData = {
      userId: 'user-456',
      role: 'creator',
      loginTime: new Date(),
    };

    // Set session data (automatically uses session TTL policy)
    await cache.setSession(sessionId, sessionData);
    console.log('Session saved');

    // Get session data
    const retrievedSession = await cache.getSession(sessionId);
    console.log('Retrieved session:', retrievedSession);

    // View tracking example
    const promoterId = 'promoter-789';
    const campaignId = 'campaign-101';
    const viewData = {
      views: 1500,
      likes: 150,
      comments: 25,
      shares: 10,
      timestamp: new Date(),
    };

    // Set view tracking data (automatically uses viewTracking TTL policy)
    await cache.setViewTracking(promoterId, campaignId, viewData);
    console.log('View tracking data saved');

    // Get view tracking data
    const retrievedViews = await cache.getViewTracking(promoterId, campaignId);
    console.log('Retrieved view data:', retrievedViews);

    // Bot analysis example
    const botAnalysis = {
      score: 25,
      action: 'monitor',
      reason: 'Slightly elevated view:like ratio',
      analysisTime: new Date(),
    };

    await cache.setBotAnalysis(promoterId, campaignId, botAnalysis);
    const retrievedBotAnalysis = await cache.getBotAnalysis(
      promoterId,
      campaignId
    );
    console.log('Bot analysis:', retrievedBotAnalysis);

    // Rate limiting example
    const platform = 'tiktok';
    const userId = 'api-user-123';

    // Increment rate limit counter
    const currentCount = await cache.incrementRateLimit(platform, userId);
    console.log('Current API calls:', currentCount);

    // Check rate limit
    const rateCount = await cache.getRateLimit(platform, userId);
    console.log('Rate limit count:', rateCount);

    // Daily payout example
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const payoutData = {
      totalAmount: 50000, // in Rupiah
      processedPayouts: 25,
      pendingPayouts: 5,
      processedAt: new Date(),
    };

    await cache.setDailyPayout(today, payoutData);
    const retrievedPayout = await cache.getDailyPayout(today);
    console.log('Daily payout data:', retrievedPayout);

    // Batch operations example
    const batchData = {
      'batch:key1': { data: 'value1' },
      'batch:key2': { data: 'value2' },
      'batch:key3': { data: 'value3' },
    };

    // Set multiple keys at once
    await cache.mset(batchData, 300); // 5 minutes TTL
    console.log('Batch data saved');

    // Get multiple keys at once
    const batchKeys = Object.keys(batchData);
    const batchResults = await cache.mget(batchKeys);
    console.log('Batch results:', batchResults);

    // Pattern operations example
    const patternKeys = await cache.keys('batch:*');
    console.log('Keys matching pattern:', patternKeys);

    // Delete keys by pattern
    const deletedCount = await cache.deletePattern('batch:*');
    console.log('Deleted keys:', deletedCount);

    // Cache statistics
    const stats = await cache.getStats();
    console.log('Cache statistics:', stats);

    // Custom key operations using key manager
    const keyManager = cache.getKeyManager();
    const customKey = keyManager.custom('analytics', 'daily', '2024-01-15');

    await cache.set(customKey, { totalViews: 10000, uniqueUsers: 500 });
    const analyticsData = await cache.get(customKey);
    console.log('Analytics data:', analyticsData);

    // TTL operations
    const keyTTL = await cache.ttl(customKey);
    console.log('Key TTL:', keyTTL, 'seconds');

    // Set custom expiration
    await cache.expire(customKey, 1800); // 30 minutes
    console.log('Updated key expiration');

    // Check if key exists
    const keyExists = await cache.exists(customKey);
    console.log('Key exists:', keyExists);

    // Clean up
    await cache.del(customKey);
    await cache.deleteSession(sessionId);
  } catch (error) {
    console.error('Cache operation error:', error);
  } finally {
    // Always disconnect when done
    await cache.disconnect();
    console.log('Disconnected from Redis');
  }
}

// Example of error handling and retry logic
export async function cacheWithRetryExample() {
  const cache = createCache();

  const maxRetries = 3;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      await cache.connect();

      // Perform cache operations
      await cache.set('test-key', { test: 'data' });
      const result = await cache.get('test-key');
      console.log('Cache operation successful:', result);

      break; // Success, exit retry loop
    } catch (error) {
      retries++;
      console.error(`Cache operation failed (attempt ${retries}):`, error);

      if (retries >= maxRetries) {
        console.error('Max retries reached, giving up');
        throw error;
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.pow(2, retries) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  await cache.disconnect();
}

// Example of cache warming strategy
export async function cacheWarmingExample() {
  const cache = createCache();

  try {
    await cache.connect();

    // Warm up frequently accessed data
    const frequentlyAccessedData = [
      { key: 'config:platform-fee', value: { percentage: 5 } },
      {
        key: 'config:bot-thresholds',
        value: { viewLikeRatio: 10, spikePercentage: 500 },
      },
      { key: 'config:rate-limits', value: { tiktok: 100, instagram: 200 } },
    ];

    // Batch warm-up
    const warmupData: Record<string, any> = {};
    frequentlyAccessedData.forEach(item => {
      warmupData[item.key] = item.value;
    });

    await cache.mset(warmupData, 3600); // 1 hour TTL
    console.log('Cache warmed up with configuration data');

    // Verify warm-up
    const configKeys = Object.keys(warmupData);
    const warmupResults = await cache.mget(configKeys);
    console.log('Warm-up verification:', warmupResults);
  } catch (error) {
    console.error('Cache warming error:', error);
  } finally {
    await cache.disconnect();
  }
}

// Run examples if this file is executed directly
if (require.main === module) {
  console.log('Running cache usage examples...');

  cacheUsageExample()
    .then(() => console.log('Basic usage example completed'))
    .catch(console.error);
}
