// Example usage of Social Media API Integration
import { RedisCache } from '@repo/cache';
import { createSocialMediaAPIManager } from '../social-media-api';

// Example: How to use the Social Media API Manager
export async function exampleUsage() {
  // Initialize Redis cache (this would be done in your app setup)
  const cache = new RedisCache({
    host: 'localhost',
    port: 6379,
  });

  // Create the social media API manager
  const apiManager = createSocialMediaAPIManager(cache);

  try {
    // Example 1: Get TikTok video metrics
    const tiktokMetrics = await apiManager.getMetrics(
      'tiktok',
      'your_tiktok_access_token',
      'video_id_123',
      'user_id_456'
    );

    console.log('TikTok Metrics:', {
      views: tiktokMetrics.viewCount,
      likes: tiktokMetrics.likeCount,
      comments: tiktokMetrics.commentCount,
      shares: tiktokMetrics.shareCount,
    });

    // Example 2: Get Instagram media metrics
    const instagramMetrics = await apiManager.getMetrics(
      'instagram',
      'your_instagram_access_token',
      'media_id_789',
      'user_id_456'
    );

    console.log('Instagram Metrics:', {
      impressions: instagramMetrics.viewCount, // Instagram uses impressions as views
      likes: instagramMetrics.likeCount,
      comments: instagramMetrics.commentCount,
      reach: (instagramMetrics as any).reach,
      saved: (instagramMetrics as any).saved,
    });

    // Example 3: Batch metrics collection
    const batchRequests = [
      {
        platform: 'tiktok' as const,
        accessToken: 'tiktok_token',
        postId: 'video_123',
        userId: 'user_456',
      },
      {
        platform: 'instagram' as const,
        accessToken: 'instagram_token',
        postId: 'media_789',
        userId: 'user_456',
      },
    ];

    const batchResults = await apiManager.getBatchMetrics(batchRequests);

    batchResults.forEach((result, index) => {
      if (result.success) {
        console.log(`Request ${index + 1} succeeded:`, result.data);
      } else {
        console.error(`Request ${index + 1} failed:`, result.error?.message);
      }
    });

    // Example 4: Check rate limit status
    const tiktokRateLimit = await apiManager.getRateLimitInfo(
      'tiktok',
      'user_456'
    );
    console.log('TikTok Rate Limit:', {
      remaining: tiktokRateLimit.remaining,
      limit: tiktokRateLimit.limit,
      resetTime: tiktokRateLimit.resetTime,
    });

    // Example 5: Validate tokens
    const isTikTokTokenValid = await apiManager.validateToken(
      'tiktok',
      'your_tiktok_token'
    );
    const isInstagramTokenValid = await apiManager.validateToken(
      'instagram',
      'your_instagram_token'
    );

    console.log('Token Validation:', {
      tiktok: isTikTokTokenValid,
      instagram: isInstagramTokenValid,
    });

    // Example 6: Refresh tokens
    if (!isTikTokTokenValid) {
      try {
        const newTokens = await apiManager.refreshToken(
          'tiktok',
          'your_refresh_token'
        );
        console.log('New TikTok tokens:', newTokens);
      } catch (error) {
        console.error('Failed to refresh TikTok token:', error);
      }
    }

    // Example 7: Health check
    const healthStatus = await apiManager.healthCheck();
    console.log('API Health Status:', healthStatus);
  } catch (error) {
    console.error('API Error:', error);

    // Handle different types of errors
    if (error && typeof error === 'object' && 'code' in error) {
      if (error.code === 'RATE_LIMIT_EXCEEDED') {
        console.log(
          `Rate limit exceeded. Retry after: ${(error as any).retryAfter} seconds`
        );
      } else if (error.code === 'TOKEN_REFRESH_FAILED') {
        console.log('Token refresh failed. User needs to re-authenticate.');
      } else if ('retryable' in error && error.retryable) {
        console.log(
          'Retryable error occurred. The system will automatically retry.'
        );
      }
    }
  }
}

// Example: Error handling patterns
export function handleAPIErrors(error: any) {
  switch (error.code) {
    case 'RATE_LIMIT_EXCEEDED':
      return {
        action: 'wait',
        retryAfter: error.retryAfter,
        message:
          'Rate limit exceeded. Please wait before making more requests.',
      };

    case 'TOKEN_REFRESH_FAILED':
      return {
        action: 'reauth',
        message: 'Token refresh failed. User needs to re-authenticate.',
      };

    case 'TIKTOK_API_ERROR':
    case 'INSTAGRAM_API_ERROR':
      return {
        action: error.retryable ? 'retry' : 'fail',
        message: `API error: ${error.message}`,
      };

    default:
      return {
        action: 'fail',
        message: 'Unknown error occurred',
      };
  }
}

// Example: Rate limiting best practices
export class RateLimitManager {
  private apiManager: any;

  constructor(apiManager: any) {
    this.apiManager = apiManager;
  }

  async safeGetMetrics(
    platform: 'tiktok' | 'instagram',
    token: string,
    postId: string,
    userId: string
  ) {
    // Check rate limit before making request
    const rateLimitInfo = await this.apiManager.getRateLimitInfo(
      platform,
      userId
    );

    if (rateLimitInfo.remaining <= 0) {
      const waitTime = Math.ceil(
        (rateLimitInfo.resetTime.getTime() - Date.now()) / 1000
      );
      throw new Error(
        `Rate limit exceeded. Wait ${waitTime} seconds before retrying.`
      );
    }

    // Make the request
    return await this.apiManager.getMetrics(platform, token, postId, userId);
  }

  async distributeRequests(requests: any[], maxConcurrent: number = 5) {
    const results = [];

    for (let i = 0; i < requests.length; i += maxConcurrent) {
      const batch = requests.slice(i, i + maxConcurrent);
      const batchResults = await this.apiManager.getBatchMetrics(batch);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + maxConcurrent < requests.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return results;
  }
}
