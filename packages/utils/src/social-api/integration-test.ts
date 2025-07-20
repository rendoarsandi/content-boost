import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from './manager';
import { APIClientConfig } from './types';

/**
 * Integration test to verify social media API setup
 * This demonstrates how to use the social API integration
 */
export async function testSocialAPIIntegration() {
  // Mock Redis cache for testing
  const mockCache = {
    getRateLimit: async () => 0,
    incrementRateLimit: async () => 1,
    del: async () => 1,
  } as any as RedisCache;

  // Create API manager
  const apiManager = new SocialMediaAPIManager(mockCache);

  // Test TikTok client registration
  const tiktokConfig: APIClientConfig = {
    accessToken: 'test-tiktok-token',
    userId: 'test-user-123',
    platform: 'tiktok',
    rateLimitConfig: {
      maxRequests: 100,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
    },
  };

  apiManager.registerClient('test-user-123', 'tiktok', tiktokConfig);

  // Test Instagram client registration
  const instagramConfig: APIClientConfig = {
    accessToken: 'test-instagram-token',
    userId: 'test-user-123',
    platform: 'instagram',
    rateLimitConfig: {
      maxRequests: 200,
      windowMs: 60 * 60 * 1000, // 1 hour
    },
    retryConfig: {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      backoffFactor: 2,
    },
  };

  apiManager.registerClient('test-user-123', 'instagram', instagramConfig);

  // Verify clients are registered
  const hasTikTokClient = apiManager.hasClient('test-user-123', 'tiktok');
  const hasInstagramClient = apiManager.hasClient('test-user-123', 'instagram');

  console.log('✅ Social Media API Integration Test Results:');
  console.log(`- TikTok client registered: ${hasTikTokClient}`);
  console.log(`- Instagram client registered: ${hasInstagramClient}`);

  // Test rate limit status
  const tiktokRateLimit = await apiManager.getRateLimitStatus('test-user-123', 'tiktok');
  const instagramRateLimit = await apiManager.getRateLimitStatus('test-user-123', 'instagram');

  console.log(`- TikTok rate limit remaining: ${tiktokRateLimit.remaining}`);
  console.log(`- Instagram rate limit remaining: ${instagramRateLimit.remaining}`);

  // Get statistics
  const stats = apiManager.getStatistics();
  console.log(`- Total registered clients: ${stats.totalClients}`);
  console.log(`- TikTok clients: ${stats.clientsByPlatform.tiktok}`);
  console.log(`- Instagram clients: ${stats.clientsByPlatform.instagram}`);

  return {
    success: true,
    tiktokClientRegistered: hasTikTokClient,
    instagramClientRegistered: hasInstagramClient,
    totalClients: stats.totalClients,
  };
}

/**
 * Example usage of the social API integration
 */
export async function exampleUsage() {
  const mockCache = {
    getRateLimit: async () => 0,
    incrementRateLimit: async () => 1,
    del: async () => 1,
  } as any as RedisCache;

  const apiManager = new SocialMediaAPIManager(mockCache);

  // Register a TikTok client
  apiManager.registerClient('user123', 'tiktok', {
    accessToken: 'your-tiktok-token',
    userId: 'user123',
    platform: 'tiktok',
  });

  // Collect metrics (would normally make real API calls)
  try {
    const result = await apiManager.collectMetrics(
      'user123',
      'tiktok',
      'video123',
      'campaign456'
    );

    if (result.success && result.metrics) {
      console.log('Metrics collected:', result.metrics);
    } else if (result.rateLimited) {
      console.log('Rate limited, retry after:', result.retryAfter);
    } else {
      console.log('Error:', result.error);
    }
  } catch (error) {
    console.error('Failed to collect metrics:', error);
  }
}