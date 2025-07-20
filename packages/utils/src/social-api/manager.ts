import { RedisCache } from '@repo/cache';
import { TikTokAPIClient } from './tiktok-client';
import { InstagramAPIClient } from './instagram-client';
import { RateLimiter } from './rate-limiter';
import { APIErrorHandler } from './error-handler';
import { 
  SocialPlatform, 
  APIClientConfig, 
  SocialMediaMetrics, 
  MetricsCollectionResult,
  APIClientInterface,
  TokenInfo,
  RateLimitStatus
} from './types';

export class SocialMediaAPIManager {
  private clients: Map<string, APIClientInterface> = new Map();
  private rateLimiter: RateLimiter;
  private errorHandler: APIErrorHandler;
  private cache: RedisCache;

  constructor(cache: RedisCache) {
    this.cache = cache;
    this.rateLimiter = new RateLimiter(cache);
    this.errorHandler = new APIErrorHandler();
  }

  // Register a client for a specific user and platform
  registerClient(userId: string, platform: SocialPlatform, config: APIClientConfig): void {
    const clientKey = this.getClientKey(userId, platform);
    
    let client: APIClientInterface;
    
    switch (platform) {
      case 'tiktok':
        client = new TikTokAPIClient(config, this.rateLimiter, this.errorHandler);
        break;
      case 'instagram':
        client = new InstagramAPIClient(config, this.rateLimiter, this.errorHandler);
        break;
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
    
    this.clients.set(clientKey, client);
  }

  // Remove a client
  unregisterClient(userId: string, platform: SocialPlatform): void {
    const clientKey = this.getClientKey(userId, platform);
    this.clients.delete(clientKey);
  }

  // Get a client
  getClient(userId: string, platform: SocialPlatform): APIClientInterface | undefined {
    const clientKey = this.getClientKey(userId, platform);
    return this.clients.get(clientKey);
  }

  // Check if a client exists
  hasClient(userId: string, platform: SocialPlatform): boolean {
    const clientKey = this.getClientKey(userId, platform);
    return this.clients.has(clientKey);
  }

  // Collect metrics for a specific post
  async collectMetrics(
    userId: string, 
    platform: SocialPlatform, 
    postId: string,
    campaignId: string
  ): Promise<MetricsCollectionResult> {
    const client = this.getClient(userId, platform);
    
    if (!client) {
      return {
        success: false,
        error: this.errorHandler.createError(
          'CLIENT_NOT_FOUND',
          `No client registered for user ${userId} on platform ${platform}`
        ),
        rateLimited: false
      };
    }

    try {
      const response = await client.getUserMetrics(postId);
      
      if (!response.success) {
        return {
          success: false,
          error: response.error,
          rateLimited: response.error?.code === 'RATE_LIMITED',
          retryAfter: response.error?.retryAfter
        };
      }

      // Set campaign ID
      if (response.data) {
        response.data.campaignId = campaignId;
      }

      return {
        success: true,
        metrics: response.data,
        rateLimited: false
      };

    } catch (error) {
      const apiError = this.errorHandler.parseUnknownError(error);
      return {
        success: false,
        error: apiError,
        rateLimited: false
      };
    }
  }

  // Collect metrics for multiple posts
  async collectBatchMetrics(
    requests: Array<{
      userId: string;
      platform: SocialPlatform;
      postId: string;
      campaignId: string;
    }>
  ): Promise<MetricsCollectionResult[]> {
    const results = await Promise.all(
      requests.map(async (request) => {
        return await this.collectMetrics(
          request.userId,
          request.platform,
          request.postId,
          request.campaignId
        );
      })
    );

    return results;
  }

  // Validate all registered tokens
  async validateAllTokens(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();
    
    for (const [clientKey, client] of this.clients.entries()) {
      try {
        const isValid = await client.validateToken();
        results.set(clientKey, isValid);
      } catch (error) {
        console.error(`Token validation failed for ${clientKey}:`, error);
        results.set(clientKey, false);
      }
    }

    return results;
  }

  // Get rate limit status for all clients
  async getAllRateLimitStatus(): Promise<Map<string, RateLimitStatus>> {
    const results = new Map<string, RateLimitStatus>();
    
    for (const [clientKey, client] of this.clients.entries()) {
      try {
        const [userId, platform] = this.parseClientKey(clientKey);
        const status = await this.rateLimiter.checkRateLimit(platform as SocialPlatform, userId);
        results.set(clientKey, status);
      } catch (error) {
        console.error(`Rate limit check failed for ${clientKey}:`, error);
      }
    }

    return results;
  }

  // Get rate limit status for specific user and platform
  async getRateLimitStatus(userId: string, platform: SocialPlatform): Promise<RateLimitStatus> {
    return await this.rateLimiter.checkRateLimit(platform, userId);
  }

  // Wait for rate limit to reset
  async waitForRateLimit(userId: string, platform: SocialPlatform): Promise<void> {
    await this.rateLimiter.waitForRateLimit(platform, userId);
  }

  // Update access token for a client
  updateAccessToken(userId: string, platform: SocialPlatform, newToken: string): void {
    const client = this.getClient(userId, platform);
    if (client) {
      if ('updateAccessToken' in client) {
        (client as any).updateAccessToken(newToken);
      }
    }
  }

  // Get all registered clients info
  getRegisteredClients(): Array<{ userId: string; platform: SocialPlatform; clientKey: string }> {
    const clients: Array<{ userId: string; platform: SocialPlatform; clientKey: string }> = [];
    
    for (const clientKey of this.clients.keys()) {
      const [userId, platform] = this.parseClientKey(clientKey);
      clients.push({
        userId,
        platform: platform as SocialPlatform,
        clientKey
      });
    }

    return clients;
  }

  // Health check for all clients
  async healthCheck(): Promise<Map<string, { isHealthy: boolean; error?: string }>> {
    const results = new Map<string, { isHealthy: boolean; error?: string }>();
    
    for (const [clientKey, client] of this.clients.entries()) {
      try {
        const isValid = await client.validateToken();
        results.set(clientKey, { isHealthy: isValid });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.set(clientKey, { 
          isHealthy: false, 
          error: errorMessage 
        });
      }
    }

    return results;
  }

  // Clear all clients
  clearAllClients(): void {
    this.clients.clear();
  }

  // Get statistics
  getStatistics(): {
    totalClients: number;
    clientsByPlatform: Record<SocialPlatform, number>;
    clientsByUser: Record<string, number>;
  } {
    const stats = {
      totalClients: this.clients.size,
      clientsByPlatform: { tiktok: 0, instagram: 0 } as Record<SocialPlatform, number>,
      clientsByUser: {} as Record<string, number>
    };

    for (const clientKey of this.clients.keys()) {
      const [userId, platform] = this.parseClientKey(clientKey);
      
      stats.clientsByPlatform[platform as SocialPlatform]++;
      stats.clientsByUser[userId] = (stats.clientsByUser[userId] || 0) + 1;
    }

    return stats;
  }

  private getClientKey(userId: string, platform: SocialPlatform): string {
    return `${userId}:${platform}`;
  }

  private parseClientKey(clientKey: string): [string, string] {
    const parts = clientKey.split(':');
    if (parts.length !== 2) {
      throw new Error(`Invalid client key format: ${clientKey}`);
    }
    return [parts[0], parts[1]];
  }
}