import { InstagramAPI, InstagramMediaInfo, InstagramInsights } from '@repo/auth/social';
import { 
  APIClientInterface, 
  APIResponse, 
  SocialMediaMetrics, 
  APIClientConfig,
  APIError
} from './types';
import { RateLimiter } from './rate-limiter';
import { APIErrorHandler } from './error-handler';

export class InstagramAPIClient implements APIClientInterface {
  public readonly platform = 'instagram' as const;
  private api: InstagramAPI;
  private rateLimiter: RateLimiter;
  private errorHandler: APIErrorHandler;
  private config: APIClientConfig;

  constructor(
    config: APIClientConfig,
    rateLimiter: RateLimiter,
    errorHandler?: APIErrorHandler
  ) {
    this.config = config;
    this.api = new InstagramAPI(config.accessToken);
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
        
        // Get media info and insights
        const [mediaInfo, insights] = await Promise.all([
          this.api.getMediaById(postId),
          this.api.getMediaInsights(postId, ['impressions', 'reach', 'likes', 'comments', 'shares', 'plays'])
        ]);

        // Extract metrics from insights
        const metricsMap = new Map<string, number>();
        insights.data.forEach(insight => {
          if (insight.values.length > 0) {
            metricsMap.set(insight.name, insight.values[0].value);
          }
        });

        // Convert to standard metrics format
        const metrics: SocialMediaMetrics = {
          platform: this.platform,
          postId,
          userId: this.config.userId,
          campaignId: '', // Will be set by caller
          metrics: {
            views: metricsMap.get('impressions') || metricsMap.get('reach') || metricsMap.get('plays') || 0,
            likes: metricsMap.get('likes') || mediaInfo.like_count || 0,
            comments: metricsMap.get('comments') || mediaInfo.comments_count || 0,
            shares: metricsMap.get('shares') || 0
          },
          timestamp: new Date(),
          isValid: this.validateMetrics(mediaInfo, insights.data)
        };

        return metrics;
      }, `Instagram getUserMetrics for post ${postId}`);

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
    // For Instagram, getUserMetrics and getPostMetrics are the same
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
      }, 'Instagram token validation');

      return true;
    } catch (error) {
      console.error('Instagram token validation failed:', error);
      return false;
    }
  }

  async getMediaInfo(postId: string): Promise<APIResponse<InstagramMediaInfo>> {
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
        return await this.api.getMediaById(postId);
      }, `Instagram getMediaInfo for post ${postId}`);

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

  async getMediaInsights(postId: string, metrics?: string[]): Promise<APIResponse<InstagramInsights[]>> {
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
        const insights = await this.api.getMediaInsights(postId, metrics);
        return insights.data;
      }, `Instagram getMediaInsights for post ${postId}`);

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

  async getUserMedia(limit: number = 25, after?: string): Promise<APIResponse<{
    data: InstagramMediaInfo[];
    hasNext: boolean;
    nextCursor?: string;
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
        const response = await this.api.getUserMedia(limit, after);
        
        return {
          data: response.data,
          hasNext: !!response.paging?.next,
          nextCursor: response.paging?.cursors.after
        };
      }, 'Instagram getUserMedia');

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

  private validateMetrics(mediaInfo: InstagramMediaInfo, insights: InstagramInsights[]): boolean {
    // Basic validation - ensure we have valid media info and insights
    if (!mediaInfo.id || !mediaInfo.media_type) {
      return false;
    }

    // Check if insights contain valid data
    const hasValidInsights = insights.some(insight => 
      insight.values.length > 0 && 
      typeof insight.values[0].value === 'number' && 
      insight.values[0].value >= 0
    );

    return hasValidInsights;
  }

  // Utility method to extract media ID from Instagram URL
  static extractMediaId(url: string): string | null {
    return InstagramAPI.extractMediaId(url);
  }

  // Convert shortcode to media ID
  static async shortcodeToMediaId(shortcode: string): Promise<string> {
    return InstagramAPI.shortcodeToMediaId(shortcode);
  }

  // Get current rate limit status
  async getRateLimitStatus() {
    return await this.rateLimiter.checkRateLimit(this.platform, this.config.userId);
  }

  // Update access token
  updateAccessToken(newToken: string): void {
    this.config.accessToken = newToken;
    this.api = new InstagramAPI(newToken);
  }

  // Get configuration
  getConfig(): APIClientConfig {
    return { ...this.config };
  }
}