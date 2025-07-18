import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager, APIError } from './social-media-api';

export interface SocialToken {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  platform: 'tiktok' | 'instagram';
  userId: string;
  platformUserId: string;
}

export interface TokenRefreshResult {
  success: boolean;
  token?: SocialToken;
  error?: string;
  needsReauth?: boolean;
}

export interface TokenValidationResult {
  valid: boolean;
  needsRefresh: boolean;
  error?: string;
}

// Social Token Manager for handling token lifecycle
export class SocialTokenManager {
  private cache: RedisCache;
  private apiManager: SocialMediaAPIManager;

  constructor(cache: RedisCache, apiManager: SocialMediaAPIManager) {
    this.cache = cache;
    this.apiManager = apiManager;
  }

  // Cache key generators
  private getTokenCacheKey(userId: string, platform: string): string {
    return this.cache.getKeyManager().custom('token', platform, userId);
  }

  private getRefreshLockKey(userId: string, platform: string): string {
    return this.cache.getKeyManager().custom('refresh-lock', platform, userId);
  }

  // Store token in cache
  async storeToken(token: SocialToken): Promise<void> {
    const key = this.getTokenCacheKey(token.userId, token.platform);
    const ttl = Math.max(0, Math.floor((token.expiresAt.getTime() - Date.now()) / 1000));
    
    await this.cache.set(key, token, { ttl });
  }

  // Get token from cache
  async getToken(userId: string, platform: 'tiktok' | 'instagram'): Promise<SocialToken | null> {
    const key = this.getTokenCacheKey(userId, platform);
    return await this.cache.get<SocialToken>(key);
  }

  // Remove token from cache
  async removeToken(userId: string, platform: 'tiktok' | 'instagram'): Promise<void> {
    const key = this.getTokenCacheKey(userId, platform);
    await this.cache.del(key);
  }

  // Check if token exists and is valid
  async validateToken(userId: string, platform: 'tiktok' | 'instagram'): Promise<TokenValidationResult> {
    const token = await this.getToken(userId, platform);
    
    if (!token) {
      return {
        valid: false,
        needsRefresh: false,
        error: 'Token not found',
      };
    }

    const now = new Date();
    const expiresIn = token.expiresAt.getTime() - now.getTime();
    const needsRefresh = expiresIn < 24 * 60 * 60 * 1000; // Refresh if expires within 24 hours

    // If token is expired
    if (expiresIn <= 0) {
      return {
        valid: false,
        needsRefresh: true,
        error: 'Token expired',
      };
    }

    // Validate token with API
    try {
      const isValid = await this.apiManager.validateToken(platform, token.accessToken);
      
      if (!isValid) {
        return {
          valid: false,
          needsRefresh: true,
          error: 'Token invalid according to API',
        };
      }

      return {
        valid: true,
        needsRefresh,
      };
    } catch (error) {
      console.error(`Token validation error for ${platform}:`, error);
      return {
        valid: false,
        needsRefresh: true,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      };
    }
  }

  // Refresh token with distributed locking to prevent concurrent refreshes
  async refreshToken(userId: string, platform: 'tiktok' | 'instagram'): Promise<TokenRefreshResult> {
    const lockKey = this.getRefreshLockKey(userId, platform);
    const lockTTL = 30; // 30 seconds lock

    try {
      // Try to acquire lock
      const lockAcquired = await this.acquireLock(lockKey, lockTTL);
      if (!lockAcquired) {
        // Another process is already refreshing, wait and return current token
        await this.sleep(1000);
        const token = await this.getToken(userId, platform);
        return {
          success: !!token,
          token: token || undefined,
          error: token ? undefined : 'Token refresh in progress by another process',
        };
      }

      const currentToken = await this.getToken(userId, platform);
      if (!currentToken) {
        return {
          success: false,
          error: 'No token found to refresh',
          needsReauth: true,
        };
      }

      if (!currentToken.refreshToken) {
        return {
          success: false,
          error: 'No refresh token available',
          needsReauth: true,
        };
      }

      // Attempt to refresh the token
      const refreshResult = await this.apiManager.refreshToken(platform, currentToken.refreshToken);
      
      // Calculate new expiration time
      const expiresAt = new Date();
      if (platform === 'tiktok') {
        expiresAt.setSeconds(expiresAt.getSeconds() + 86400); // TikTok tokens typically last 24 hours
      } else if (platform === 'instagram') {
        expiresAt.setSeconds(expiresAt.getSeconds() + 5184000); // Instagram long-lived tokens last ~60 days
      }

      const newToken: SocialToken = {
        ...currentToken,
        accessToken: refreshResult.accessToken,
        refreshToken: refreshResult.refreshToken || currentToken.refreshToken,
        expiresAt,
      };

      // Store the new token
      await this.storeToken(newToken);

      return {
        success: true,
        token: newToken,
      };
    } catch (error) {
      console.error(`Token refresh error for ${platform}:`, error);
      
      if (error instanceof APIError) {
        return {
          success: false,
          error: error.message,
          needsReauth: error.code === 'TOKEN_REFRESH_FAILED' || error.statusCode === 401,
        };
      }

      const errorMessage = error instanceof Error ? error.message : 'Unknown refresh error';
      return {
        success: false,
        error: errorMessage,
        needsReauth: true,
      };
    } finally {
      // Release lock
      await this.releaseLock(lockKey);
    }
  }

  // Get valid token, refreshing if necessary
  async getValidToken(userId: string, platform: 'tiktok' | 'instagram'): Promise<SocialToken | null> {
    const validation = await this.validateToken(userId, platform);
    
    if (validation.valid && !validation.needsRefresh) {
      return await this.getToken(userId, platform);
    }

    if (validation.needsRefresh) {
      const refreshResult = await this.refreshToken(userId, platform);
      
      if (refreshResult.success && refreshResult.token) {
        return refreshResult.token;
      }

      // If refresh failed and needs reauth, remove the invalid token
      if (refreshResult.needsReauth) {
        await this.removeToken(userId, platform);
      }
    }

    return null;
  }

  // Auto-refresh tokens that are about to expire
  async autoRefreshTokens(userId: string): Promise<{
    tiktok: TokenRefreshResult | null;
    instagram: TokenRefreshResult | null;
  }> {
    const results = {
      tiktok: null as TokenRefreshResult | null,
      instagram: null as TokenRefreshResult | null,
    };

    // Check TikTok token
    const tiktokValidation = await this.validateToken(userId, 'tiktok');
    if (tiktokValidation.needsRefresh) {
      results.tiktok = await this.refreshToken(userId, 'tiktok');
    }

    // Check Instagram token
    const instagramValidation = await this.validateToken(userId, 'instagram');
    if (instagramValidation.needsRefresh) {
      results.instagram = await this.refreshToken(userId, 'instagram');
    }

    return results;
  }

  // Get token health status for all platforms
  async getTokenHealth(userId: string): Promise<{
    tiktok: {
      connected: boolean;
      valid: boolean;
      needsRefresh: boolean;
      expiresAt?: Date;
      error?: string;
    };
    instagram: {
      connected: boolean;
      valid: boolean;
      needsRefresh: boolean;
      expiresAt?: Date;
      error?: string;
    };
  }> {
    const tiktokValidation = await this.validateToken(userId, 'tiktok');
    const instagramValidation = await this.validateToken(userId, 'instagram');
    
    const tiktokToken = await this.getToken(userId, 'tiktok');
    const instagramToken = await this.getToken(userId, 'instagram');

    return {
      tiktok: {
        connected: !!tiktokToken,
        valid: tiktokValidation.valid,
        needsRefresh: tiktokValidation.needsRefresh,
        expiresAt: tiktokToken?.expiresAt,
        error: tiktokValidation.error,
      },
      instagram: {
        connected: !!instagramToken,
        valid: instagramValidation.valid,
        needsRefresh: instagramValidation.needsRefresh,
        expiresAt: instagramToken?.expiresAt,
        error: instagramValidation.error,
      },
    };
  }

  // Batch token operations for multiple users
  async batchRefreshTokens(
    userPlatforms: Array<{ userId: string; platform: 'tiktok' | 'instagram' }>
  ): Promise<Array<{ userId: string; platform: string; result: TokenRefreshResult }>> {
    const results = await Promise.allSettled(
      userPlatforms.map(async ({ userId, platform }) => ({
        userId,
        platform,
        result: await this.refreshToken(userId, platform),
      }))
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          userId: userPlatforms[index].userId,
          platform: userPlatforms[index].platform,
          result: {
            success: false,
            error: result.reason?.message || 'Unknown error during batch refresh',
          },
        };
      }
    });
  }

  // Utility methods
  private async acquireLock(key: string, ttl: number): Promise<boolean> {
    try {
      const result = await this.cache['client'].set(key, '1', 'EX', ttl, 'NX');
      return result === 'OK';
    } catch (error) {
      console.error('Lock acquisition error:', error);
      return false;
    }
  }

  private async releaseLock(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (error) {
      console.error('Lock release error:', error);
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Cleanup expired tokens from cache
  async cleanupExpiredTokens(): Promise<number> {
    try {
      const pattern = this.cache.getKeyManager().custom('token', '*', '*');
      const keys = await this.cache.keys(pattern);
      let cleanedCount = 0;

      for (const key of keys) {
        const token = await this.cache.get<SocialToken>(key);
        if (token && token.expiresAt.getTime() <= Date.now()) {
          await this.cache.del(key);
          cleanedCount++;
        }
      }

      return cleanedCount;
    } catch (error) {
      console.error('Token cleanup error:', error);
      return 0;
    }
  }
}

// Export factory function
export const createSocialTokenManager = (cache: RedisCache, apiManager: SocialMediaAPIManager) => {
  return new SocialTokenManager(cache, apiManager);
};