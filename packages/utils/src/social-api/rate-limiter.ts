import { RedisCache } from '@repo/cache';
import { RateLimitConfig, RateLimitStatus, SocialPlatform } from './types';
import { RATE_LIMIT_DEFAULTS } from './constants';

export class RateLimiter {
  private cache: RedisCache;
  private configs: Map<SocialPlatform, RateLimitConfig>;

  constructor(cache: RedisCache, customConfigs?: Partial<Record<SocialPlatform, RateLimitConfig>>) {
    this.cache = cache;
    this.configs = new Map();
    
    // Set default configs
    Object.entries(RATE_LIMIT_DEFAULTS).forEach(([platform, config]) => {
      this.configs.set(platform as SocialPlatform, config);
    });
    
    // Override with custom configs
    if (customConfigs) {
      Object.entries(customConfigs).forEach(([platform, config]) => {
        if (config) {
          this.configs.set(platform as SocialPlatform, {
            ...RATE_LIMIT_DEFAULTS[platform],
            ...config
          });
        }
      });
    }
  }

  private getRateLimitKey(platform: SocialPlatform, userId: string): string {
    const config = this.configs.get(platform);
    const prefix = config?.keyPrefix || `${platform}_rate_limit`;
    return `${prefix}:${userId}`;
  }

  async checkRateLimit(platform: SocialPlatform, userId: string): Promise<RateLimitStatus> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`Rate limit config not found for platform: ${platform}`);
    }

    const key = this.getRateLimitKey(platform, userId);
    const windowSeconds = Math.floor(config.windowMs / 1000);
    
    try {
      // Get current count
      const currentCount = await this.cache.getRateLimit(platform, userId);
      const remaining = Math.max(0, config.maxRequests - currentCount);
      const resetTime = new Date(Date.now() + windowSeconds * 1000);
      
      return {
        platform,
        userId,
        remaining,
        resetTime,
        isLimited: remaining === 0
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // On error, assume not limited to avoid blocking
      return {
        platform,
        userId,
        remaining: config.maxRequests,
        resetTime: new Date(Date.now() + windowSeconds * 1000),
        isLimited: false
      };
    }
  }

  async incrementRateLimit(platform: SocialPlatform, userId: string): Promise<RateLimitStatus> {
    const config = this.configs.get(platform);
    if (!config) {
      throw new Error(`Rate limit config not found for platform: ${platform}`);
    }

    try {
      // Increment the counter
      const newCount = await this.cache.incrementRateLimit(platform, userId);
      const remaining = Math.max(0, config.maxRequests - newCount);
      const windowSeconds = Math.floor(config.windowMs / 1000);
      const resetTime = new Date(Date.now() + windowSeconds * 1000);
      
      return {
        platform,
        userId,
        remaining,
        resetTime,
        isLimited: remaining === 0
      };
    } catch (error) {
      console.error('Rate limit increment error:', error);
      throw error;
    }
  }

  async isRateLimited(platform: SocialPlatform, userId: string): Promise<boolean> {
    const status = await this.checkRateLimit(platform, userId);
    return status.isLimited;
  }

  async getRemainingRequests(platform: SocialPlatform, userId: string): Promise<number> {
    const status = await this.checkRateLimit(platform, userId);
    return status.remaining;
  }

  async getResetTime(platform: SocialPlatform, userId: string): Promise<Date> {
    const status = await this.checkRateLimit(platform, userId);
    return status.resetTime;
  }

  async resetRateLimit(platform: SocialPlatform, userId: string): Promise<void> {
    const key = this.getRateLimitKey(platform, userId);
    await this.cache.del(key);
  }

  async getAllRateLimitStatus(userId: string): Promise<RateLimitStatus[]> {
    const platforms: SocialPlatform[] = ['tiktok', 'instagram'];
    const statuses = await Promise.all(
      platforms.map(platform => this.checkRateLimit(platform, userId))
    );
    return statuses;
  }

  // Utility method to wait until rate limit resets
  async waitForRateLimit(platform: SocialPlatform, userId: string): Promise<void> {
    const status = await this.checkRateLimit(platform, userId);
    if (status.isLimited) {
      const waitTime = status.resetTime.getTime() - Date.now();
      if (waitTime > 0) {
        console.log(`Rate limited for ${platform}:${userId}. Waiting ${waitTime}ms`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  // Get rate limit configuration for a platform
  getRateLimitConfig(platform: SocialPlatform): RateLimitConfig | undefined {
    return this.configs.get(platform);
  }

  // Update rate limit configuration
  updateRateLimitConfig(platform: SocialPlatform, config: Partial<RateLimitConfig>): void {
    const currentConfig = this.configs.get(platform);
    if (currentConfig) {
      this.configs.set(platform, { ...currentConfig, ...config });
    }
  }
}