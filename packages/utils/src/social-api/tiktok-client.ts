import { TikTokAPI, TikTokVideoInfo, TikTokVideoStats } from '@repo/auth/social';
import { 
  APIClientInterface, 
  APIResponse, 
  SocialMediaMetrics, 
  APIClientConfig,
  APIError
} from './types';
import { RateLimiter } from './rate-limiter';
import { APIErrorHandler } from './error-handler';
import { API_ENDPOINTS } from './constants';

export class TikTokAPIClient implements APIClientInterface {
  public readonly platform = 'tiktok' as const;
  private api: TikTokAPI;
  private rateLimiter: RateLimiter;
  private errorHandler: APIErrorHandler;
  private config: APIClientConfig;

  constructor(
    config: APIClientConfig,
    rateLimiter: RateLimiter,
    errorHandler?: APIErrorHandler
  ) {
    this.config = config;
    this.api = new TikTokAPI(config.accessToken);
    this.rateLimiter = rateLimiter;
    this.errorHandler = errorHandler || new APIErrorHandler(config.retryConfig);
  }

  async getUserMetrics(postId: string): Promise<APIResponse<SocialMediaMetrics>> {
    try {
      // Check rate limit
      const rateLimitStatus = await this.rateLimiter.checkRateLimit(this.platform, this.config.userId);
      if (rateLimitStatus.isLimited) {
        return {
          success: false,
          error: this.errorHandler.createError(
            'RATE_LIMITED',
            'Rate limit exceeded',
            429,
            Math.floor((rateLimitStatus.resetTime.getTime() - Date.now()) / 1000)
          ),
          rateLimitInfo: {
            remaining: rateLimitStatus.remaining,
            resetTime: rateLimitStatus.resetTime
          }
        };
      }

      // Execute with retry logic
      const result = await this.errorHandler.executeWithRetry(async () => {
        // Increment rate limit counter
        await this.rateLimiter.incrementRateLimit(this.platform, this.config.userId);
        
        // Get video stats
        const videoStats = await this.api.getVideoStats([postId]);
        
        if (!videoStats.length) {
          throw this.errorHandler.parseValidationError(`Video not found: ${postId}`);
        }

        const stats = videoStats[0];
        
        // Convert to standard metrics format
        const metrics: SocialMediaMetrics = {
          platform: this.platform,
          postId,
          userId: this.config.userId,
          campaignId: '', // Will be set by caller
          metrics: {
            views: stats.view_count || 0,
            likes: stats.like_count || 0,
            comments: stats.comment_count || 0,
            shares: stats.share_count || 0
          },
          timestamp: new Date(),
          isValid: this.validateMetrics(stats)
        };

        return metrics;
      }, `TikTok getUserMetrics for post ${postId}`);

      const updatedRateLimitStatus = await this.rateLimiter.checkRateLimit(this.platform, this.config.userId);

      return {
        success: true,
        data: result,
        rateLimitInfo: {
          remaining: updatedRateLimitStatus.remaining,
          resetTime: updatedRateLimitStatus.resetTime
        }
      };

    } catch (error) {
      const apiError = error instanceof Error 
        ? this.errorHandler.parseUnknownError(error)
        : error as APIError;

      return {
        success: false,
        error: apiError
      };
    }
  }

  async getPostMetrics(postId: string): Promise<APIResponse<SocialMediaMetrics>> {
    // For TikTok, getUserMetrics and getPostMetrics are the same
    return this.getUserMetrics(postId);
  }

  async validateToken(): Promise<boolean> {
    try {
      // Check rate limit first
      const rateLimitStatus = await this.rateLimiter.checkRateLimit(this.platform, this.config.userId);
      if (rateLimitStatus.isLimited) {
        console.warn('Cannot validate token: rate limited');
        return false;
      }

      await this.errorHandler.executeWithRetry(async () => {
        await this.rateLimiter.incrementRateLimit(this.platform, this.config.userId);
        await this.api.getUserInfo();
      }, 'TikTok token validation');

      return true;
    } catch (error) {
      console.error('TikTok token validation failed:', error);
      return false;
    }
  }

  async getVideoInfo(postId: string): Promise<APIResponse<TikTokVideoInfo>> {
    try {
      const rateLimitStatus = await this.rateLimiter.checkRateLimit(this.platform, this.config.userId);
      if (rateLimitStatus.isLimited) {
        return {
          success: false,
          error: this.errorHandler.createError(
            'RATE_LIMITED',
            'Rate limit exceeded',
            429,
            Math.floor((rateLimitStatus.resetTime.getTime() - Date.now()) / 1000)
          )
        };
      }

      const result = await this.errorHandler.executeWithRetry(async () => {
        await this.rateLimiter.incrementRateLimit(this.platform, this.config.userId);
        return await this.api.getVideoById(postId);
      }, `TikTok getVideoInfo for post ${postId}`);

      return {
        success: true,
        data: result
      };

    } catch (error) {
      const apiError = error instanceof Error 
        ? this.errorHandler.parseUnknownError(error)
        : error as APIError;

      return {
        success: false,
        error: apiError
      };
    }
  }

  async getUserVideos(cursor?: string, maxCount: number = 20): Promise<APIResponse<{
    videos: TikTokVideoInfo[];
    cursor: string;
    hasMore: boolean;
  }>> {
    try {
      const rateLimitStatus = await this.rateLimiter.checkRateLimit(this.platform, this.config.userId);
      if (rateLimitStatus.isLimited) {
        return {
          success: false,
          error: this.errorHandler.createError(
            'RATE_LIMITED',
            'Rate limit exceeded',
            429,
            Math.floor((rateLimitStatus.resetTime.getTime() - Date.now()) / 1000)
          )
        };
      }

      const result = await this.errorHandler.executeWithRetry(async () => {
        await this.rateLimiter.incrementRateLimit(this.platform, this.config.userId);
        const response = await this.api.getUserVideos(cursor, maxCount);
        
        return {
          videos: response.videos,
          cursor: response.cursor,
          hasMore: response.has_more
        };
      }, 'TikTok getUserVideos');

      return {
        success: true,
        data: result
      };

    } catch (error) {
      const apiError = error instanceof Error 
        ? this.errorHandler.parseUnknownError(error)
        : error as APIError;

      return {
        success: false,
        error: apiError
      };
    }
  }

  private validateMetrics(stats: TikTokVideoStats): boolean {
    // Basic validation - ensure metrics are non-negative numbers
    return (
      typeof stats.view_count === 'number' && stats.view_count >= 0 &&
      typeof stats.like_count === 'number' && stats.like_count >= 0 &&
      typeof stats.comment_count === 'number' && stats.comment_count >= 0 &&
      typeof stats.share_count === 'number' && stats.share_count >= 0
    );
  }

  // Utility method to extract video ID from TikTok URL
  static extractVideoId(url: string): string | null {
    return TikTokAPI.extractVideoId(url);
  }

  // Get current rate limit status
  async getRateLimitStatus() {
    return await this.rateLimiter.checkRateLimit(this.platform, this.config.userId);
  }

  // Update access token
  updateAccessToken(newToken: string): void {
    this.config.accessToken = newToken;
    this.api = new TikTokAPI(newToken);
  }

  // Get configuration
  getConfig(): APIClientConfig {
    return { ...this.config };
  }
}