import { RedisCache } from '@repo/cache';

// Ensure fetch is available in Node.js environment
if (typeof fetch === 'undefined') {
  // @ts-ignore
  global.fetch = require('node-fetch');
}

export type SocialPlatform = 'tiktok' | 'instagram';

// Social Media API Types
export interface SocialMediaMetrics {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  timestamp: Date;
}

export interface TikTokVideoMetrics extends SocialMediaMetrics {
  videoId: string;
  playCount: number;
  downloadCount: number;
}

export interface InstagramMediaMetrics extends SocialMediaMetrics {
  mediaId: string;
  impressions: number;
  reach: number;
  saved: number;
}

export interface APIRateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface APIErrorInterface {
  code: string;
  message: string;
  statusCode: number;
  retryable: boolean;
  retryAfter?: number;
}

// Rate Limiting Configuration
export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  backoffMultiplier: number;
  maxBackoffMs: number;
  maxRetries: number;
}

export const DEFAULT_RATE_LIMITS: Record<string, RateLimitConfig> = {
  tiktok: {
    maxRequests: 100, // TikTok API limit per hour
    windowMs: 60 * 60 * 1000, // 1 hour
    backoffMultiplier: 2,
    maxBackoffMs: 30000, // 30 seconds
    maxRetries: 3,
  },
  instagram: {
    maxRequests: 200, // Instagram API limit per hour
    windowMs: 60 * 60 * 1000, // 1 hour
    backoffMultiplier: 2,
    maxBackoffMs: 30000, // 30 seconds
    maxRetries: 3,
  },
};

// Base Social Media API Client
export abstract class BaseSocialMediaAPI {
  protected cache: RedisCache;
  protected rateLimitConfig: RateLimitConfig;
  protected platform: string;

  constructor(cache: RedisCache, platform: string, rateLimitConfig?: RateLimitConfig) {
    this.cache = cache;
    this.platform = platform;
    this.rateLimitConfig = rateLimitConfig || DEFAULT_RATE_LIMITS[platform];
  }

  // Rate limiting implementation
  protected async checkRateLimit(userId: string): Promise<boolean> {
    const count = await this.cache.getRateLimit(this.platform, userId);
    return count < this.rateLimitConfig.maxRequests;
  }

  protected async incrementRateLimit(userId: string): Promise<number> {
    return await this.cache.incrementRateLimit(this.platform, userId);
  }

  protected async getRateLimitInfo(userId: string): Promise<APIRateLimitInfo> {
    const count = await this.cache.getRateLimit(this.platform, userId);
    const ttl = await this.cache.ttl(this.cache.getKeyManager().rateLimit(this.platform, userId));
    
    return {
      limit: this.rateLimitConfig.maxRequests,
      remaining: Math.max(0, this.rateLimitConfig.maxRequests - count),
      resetTime: new Date(Date.now() + (ttl * 1000)),
    };
  }

  // Exponential backoff implementation
  protected async executeWithBackoff<T>(
    operation: () => Promise<T>,
    userId: string,
    attempt: number = 1
  ): Promise<T> {
    try {
      // Check rate limit before making request
      if (!(await this.checkRateLimit(userId))) {
        const rateLimitInfo = await this.getRateLimitInfo(userId);
        throw new APIError({
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded for ${this.platform}. Try again after ${rateLimitInfo.resetTime.toISOString()}`,
          statusCode: 429,
          retryable: true,
          retryAfter: Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000),
        });
      }

      // Increment rate limit counter
      await this.incrementRateLimit(userId);

      // Execute the operation
      const result = await operation();
      return result;
    } catch (error) {
      if (error instanceof APIError && error.retryable && attempt <= this.rateLimitConfig.maxRetries) {
        const backoffMs = Math.min(
          this.rateLimitConfig.backoffMultiplier ** (attempt - 1) * 1000,
          this.rateLimitConfig.maxBackoffMs
        );

        console.warn(
          `${this.platform} API request failed (attempt ${attempt}/${this.rateLimitConfig.maxRetries}). ` +
          `Retrying in ${backoffMs}ms. Error: ${error.message}`
        );

        await this.sleep(backoffMs);
        return this.executeWithBackoff(operation, userId, attempt + 1);
      }

      throw error;
    }
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Abstract methods to be implemented by specific platforms
  abstract getMetrics(accessToken: string, postId: string, userId: string): Promise<SocialMediaMetrics>;
  abstract validateToken(accessToken: string): Promise<boolean>;
  abstract refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }>;
}

// TikTok API Client
export class TikTokAPI extends BaseSocialMediaAPI {
  constructor(cache: RedisCache) {
    super(cache, 'tiktok');
  }

  async getMetrics(accessToken: string, videoId: string, userId: string): Promise<TikTokVideoMetrics> {
    return this.executeWithBackoff(async () => {
      const response = await fetch(`https://open-api.tiktok.com/v2/video/query/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filters: {
            video_ids: [videoId],
          },
          fields: [
            'id',
            'title',
            'video_description',
            'duration',
            'cover_image_url',
            'create_time',
            'share_url',
            'view_count',
            'like_count',
            'comment_count',
            'share_count',
            'download_count',
          ],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new APIError({
          code: errorData.error?.code || 'TIKTOK_API_ERROR',
          message: errorData.error?.message || `TikTok API request failed with status ${response.status}`,
          statusCode: response.status,
          retryable: response.status >= 500 || response.status === 429,
          retryAfter: response.headers?.get?.('retry-after') ? parseInt(response.headers.get('retry-after')!) : undefined,
        });
      }

      const data = await response.json() as any;

      if (data.error) {
        throw new APIError({
          code: data.error.code,
          message: data.error.message,
          statusCode: 400,
          retryable: false,
        });
      }

      const video = data.data?.videos?.[0];
      if (!video) {
        throw new APIError({
          code: 'VIDEO_NOT_FOUND',
          message: `Video with ID ${videoId} not found`,
          statusCode: 404,
          retryable: false,
        });
      }

      return {
        videoId: video.id,
        viewCount: video.view_count || 0,
        likeCount: video.like_count || 0,
        commentCount: video.comment_count || 0,
        shareCount: video.share_count || 0,
        playCount: video.view_count || 0, // TikTok uses view_count for plays
        downloadCount: video.download_count || 0,
        timestamp: new Date(),
      };
    }, userId);
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch('https://open-api.tiktok.com/v2/user/info/', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      return response.ok;
    } catch (error) {
      console.error('TikTok token validation error:', error);
      return false;
    }
  }

  async refreshToken(refreshToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const response = await fetch('https://open-api.tiktok.com/oauth/refresh_token/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_ID!,
        client_secret: process.env.TIKTOK_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      throw new APIError({
        code: 'TOKEN_REFRESH_FAILED',
        message: 'Failed to refresh TikTok access token',
        statusCode: response.status,
        retryable: false,
      });
    }

    const data = await response.json() as any;

    if (data.error) {
      throw new APIError({
        code: data.error.code || 'TOKEN_REFRESH_ERROR',
        message: data.error.message || 'TikTok token refresh failed',
        statusCode: 400,
        retryable: false,
      });
    }

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
    };
  }
}

// Instagram API Client
export class InstagramAPI extends BaseSocialMediaAPI {
  constructor(cache: RedisCache) {
    super(cache, 'instagram');
  }

  async getMetrics(accessToken: string, mediaId: string, userId: string): Promise<InstagramMediaMetrics> {
    return this.executeWithBackoff(async () => {
      const fields = [
        'id',
        'media_type',
        'media_url',
        'permalink',
        'timestamp',
        'caption',
        'like_count',
        'comments_count',
        'impressions',
        'reach',
        'saved',
      ].join(',');

      const response = await fetch(
        `https://graph.instagram.com/${mediaId}?fields=${fields}&access_token=${accessToken}`
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({})) as any;
        throw new APIError({
          code: errorData.error?.code || 'INSTAGRAM_API_ERROR',
          message: errorData.error?.message || `Instagram API request failed with status ${response.status}`,
          statusCode: response.status,
          retryable: response.status >= 500 || response.status === 429,
          retryAfter: response.headers?.get?.('retry-after') ? parseInt(response.headers.get('retry-after')!) : undefined,
        });
      }

      const data = await response.json() as any;

      if (data.error) {
        throw new APIError({
          code: data.error.code,
          message: data.error.message,
          statusCode: 400,
          retryable: false,
        });
      }

      return {
        mediaId: data.id,
        viewCount: data.impressions || 0, // Instagram uses impressions as view equivalent
        likeCount: data.like_count || 0,
        commentCount: data.comments_count || 0,
        shareCount: 0, // Instagram doesn't provide share count in basic API
        impressions: data.impressions || 0,
        reach: data.reach || 0,
        saved: data.saved || 0,
        timestamp: new Date(),
      };
    }, userId);
  }

  async validateToken(accessToken: string): Promise<boolean> {
    try {
      const response = await fetch(
        `https://graph.instagram.com/me?fields=id,username&access_token=${accessToken}`
      );

      return response.ok;
    } catch (error) {
      console.error('Instagram token validation error:', error);
      return false;
    }
  }

  async refreshToken(accessToken: string): Promise<{ accessToken: string; refreshToken?: string }> {
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      throw new APIError({
        code: 'TOKEN_REFRESH_FAILED',
        message: 'Failed to refresh Instagram access token',
        statusCode: response.status,
        retryable: false,
      });
    }

    const data = await response.json() as any;

    if (data.error) {
      throw new APIError({
        code: data.error.code || 'TOKEN_REFRESH_ERROR',
        message: data.error.message || 'Instagram token refresh failed',
        statusCode: 400,
        retryable: false,
      });
    }

    return {
      accessToken: data.access_token,
      // Instagram doesn't provide new refresh token, use the same access token
    };
  }
}

// Social Media API Manager
export class SocialMediaAPIManager {
  private tiktokAPI: TikTokAPI;
  private instagramAPI: InstagramAPI;
  private cache: RedisCache;

  constructor(cache: RedisCache) {
    this.cache = cache;
    this.tiktokAPI = new TikTokAPI(cache);
    this.instagramAPI = new InstagramAPI(cache);
  }

  async getMetrics(
    platform: 'tiktok' | 'instagram',
    accessToken: string,
    postId: string,
    userId: string
  ): Promise<SocialMediaMetrics> {
    switch (platform) {
      case 'tiktok':
        return this.tiktokAPI.getMetrics(accessToken, postId, userId);
      case 'instagram':
        return this.instagramAPI.getMetrics(accessToken, postId, userId);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async validateToken(platform: 'tiktok' | 'instagram', accessToken: string): Promise<boolean> {
    switch (platform) {
      case 'tiktok':
        return this.tiktokAPI.validateToken(accessToken);
      case 'instagram':
        return this.instagramAPI.validateToken(accessToken);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async refreshToken(
    platform: 'tiktok' | 'instagram',
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken?: string }> {
    switch (platform) {
      case 'tiktok':
        return this.tiktokAPI.refreshToken(refreshToken);
      case 'instagram':
        return this.instagramAPI.refreshToken(refreshToken);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  async getRateLimitInfo(platform: 'tiktok' | 'instagram', userId: string): Promise<APIRateLimitInfo> {
    switch (platform) {
      case 'tiktok':
        return this.tiktokAPI['getRateLimitInfo'](userId);
      case 'instagram':
        return this.instagramAPI['getRateLimitInfo'](userId);
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  // Batch metrics collection for multiple posts
  async getBatchMetrics(
    requests: Array<{
      platform: 'tiktok' | 'instagram';
      accessToken: string;
      postId: string;
      userId: string;
    }>
  ): Promise<Array<{ success: boolean; data?: SocialMediaMetrics; error?: APIError }>> {
    const results = await Promise.allSettled(
      requests.map(req => this.getMetrics(req.platform, req.accessToken, req.postId, req.userId))
    );

    return results.map(result => {
      if (result.status === 'fulfilled') {
        return { success: true, data: result.value };
      } else {
        return {
          success: false,
          error: result.reason instanceof APIError ? result.reason : new APIError({
            code: 'UNKNOWN_ERROR',
            message: result.reason?.message || 'Unknown error occurred',
            statusCode: 500,
            retryable: false,
          }),
        };
      }
    });
  }

  // Health check for all platforms
  async healthCheck(): Promise<Record<string, boolean>> {
    const tiktokHealthy = await this.tiktokAPI.validateToken('dummy_token').catch(() => false);
    const instagramHealthy = await this.instagramAPI.validateToken('dummy_token').catch(() => false);

    return {
      tiktok: tiktokHealthy,
      instagram: instagramHealthy,
    };
  }
}

// Custom API Error class
export class APIError extends Error {
  public code: string;
  public statusCode: number;
  public retryable: boolean;
  public retryAfter?: number;

  constructor(params: {
    code: string;
    message: string;
    statusCode: number;
    retryable: boolean;
    retryAfter?: number;
  }) {
    super(params.message);
    this.name = 'APIError';
    this.code = params.code;
    this.statusCode = params.statusCode;
    this.retryable = params.retryable;
    this.retryAfter = params.retryAfter;
  }
}

// Export factory function
export const createSocialMediaAPIManager = (cache: RedisCache) => {
  return new SocialMediaAPIManager(cache);
};