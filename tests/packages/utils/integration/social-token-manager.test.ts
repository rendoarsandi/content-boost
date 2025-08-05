import { RedisCache } from '@repo/cache';
import { SocialMediaAPIManager } from '../src/social-media-api';
import {
  SocialTokenManager,
  createSocialTokenManager,
  SocialToken,
} from '../src/social-token-manager';

// Mock dependencies
const mockCache = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  keys: jest.fn(),
  getKeyManager: jest.fn(() => ({
    custom: jest.fn((...parts: string[]) => parts.join(':')),
  })),
  client: {
    set: jest.fn(),
  },
} as unknown as RedisCache;

const mockAPIManager = {
  validateToken: jest.fn(),
  refreshToken: jest.fn(),
} as unknown as SocialMediaAPIManager;

describe('SocialTokenManager', () => {
  let tokenManager: SocialTokenManager;

  beforeEach(() => {
    jest.clearAllMocks();
    tokenManager = createSocialTokenManager(mockCache, mockAPIManager);
  });

  describe('storeToken', () => {
    it('should store token with correct TTL', async () => {
      const token: SocialToken = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresAt: new Date(Date.now() + 3600000), // 1 hour from now
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      await tokenManager.storeToken(token);

      expect(mockCache.set).toHaveBeenCalledWith(
        'token:tiktok:user123',
        token,
        { ttl: expect.any(Number) }
      );

      const ttlCall = (mockCache.set as jest.Mock).mock.calls[0][2];
      expect(ttlCall.ttl).toBeGreaterThan(3500); // Should be close to 1 hour
      expect(ttlCall.ttl).toBeLessThanOrEqual(3600);
    });

    it('should handle expired token gracefully', async () => {
      const expiredToken: SocialToken = {
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        platform: 'instagram',
        userId: 'user123',
        platformUserId: 'instagram_user_123',
      };

      await tokenManager.storeToken(expiredToken);

      expect(mockCache.set).toHaveBeenCalledWith(
        'token:instagram:user123',
        expiredToken,
        { ttl: 0 }
      );
    });
  });

  describe('getToken', () => {
    it('should retrieve token from cache', async () => {
      const token: SocialToken = {
        accessToken: 'access_token_123',
        refreshToken: 'refresh_token_123',
        expiresAt: new Date(Date.now() + 3600000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      (mockCache.get as jest.Mock).mockResolvedValue(token);

      const result = await tokenManager.getToken('user123', 'tiktok');

      expect(result).toEqual(token);
      expect(mockCache.get).toHaveBeenCalledWith('token:tiktok:user123');
    });

    it('should return null when token not found', async () => {
      (mockCache.get as jest.Mock).mockResolvedValue(null);

      const result = await tokenManager.getToken('user123', 'tiktok');

      expect(result).toBeNull();
    });
  });

  describe('validateToken', () => {
    it('should return valid for healthy token', async () => {
      const token: SocialToken = {
        accessToken: 'valid_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48 hours from now
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      (mockCache.get as jest.Mock).mockResolvedValue(token);
      (mockAPIManager.validateToken as jest.Mock).mockResolvedValue(true);

      const result = await tokenManager.validateToken('user123', 'tiktok');

      expect(result).toEqual({
        valid: true,
        needsRefresh: false,
      });
    });

    it('should indicate needs refresh for token expiring soon', async () => {
      const token: SocialToken = {
        accessToken: 'expiring_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours from now
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      (mockCache.get as jest.Mock).mockResolvedValue(token);
      (mockAPIManager.validateToken as jest.Mock).mockResolvedValue(true);

      const result = await tokenManager.validateToken('user123', 'tiktok');

      expect(result).toEqual({
        valid: true,
        needsRefresh: true,
      });
    });

    it('should return invalid for expired token', async () => {
      const expiredToken: SocialToken = {
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() - 1000), // 1 second ago
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      (mockCache.get as jest.Mock).mockResolvedValue(expiredToken);

      const result = await tokenManager.validateToken('user123', 'tiktok');

      expect(result).toEqual({
        valid: false,
        needsRefresh: true,
        error: 'Token expired',
      });
    });

    it('should return invalid when token not found', async () => {
      (mockCache.get as jest.Mock).mockResolvedValue(null);

      const result = await tokenManager.validateToken('user123', 'tiktok');

      expect(result).toEqual({
        valid: false,
        needsRefresh: false,
        error: 'Token not found',
      });
    });

    it('should return invalid when API validation fails', async () => {
      const token: SocialToken = {
        accessToken: 'invalid_api_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 3600000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      (mockCache.get as jest.Mock).mockResolvedValue(token);
      (mockAPIManager.validateToken as jest.Mock).mockResolvedValue(false);

      const result = await tokenManager.validateToken('user123', 'tiktok');

      expect(result).toEqual({
        valid: false,
        needsRefresh: true,
        error: 'Token invalid according to API',
      });
    });
  });

  describe('refreshToken', () => {
    it('should refresh token successfully', async () => {
      const currentToken: SocialToken = {
        accessToken: 'old_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 1000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      // Mock lock acquisition
      (mockCache['client'].set as jest.Mock).mockResolvedValue('OK');
      (mockCache.get as jest.Mock).mockResolvedValue(currentToken);
      (mockAPIManager.refreshToken as jest.Mock).mockResolvedValue({
        accessToken: 'new_access_token',
        refreshToken: 'new_refresh_token',
      });

      const result = await tokenManager.refreshToken('user123', 'tiktok');

      expect(result.success).toBe(true);
      expect(result.token?.accessToken).toBe('new_access_token');
      expect(result.token?.refreshToken).toBe('new_refresh_token');
      expect(mockCache.set).toHaveBeenCalledWith(
        'token:tiktok:user123',
        expect.objectContaining({
          accessToken: 'new_access_token',
          refreshToken: 'new_refresh_token',
        }),
        { ttl: expect.any(Number) }
      );
    });

    it('should handle refresh failure', async () => {
      const currentToken: SocialToken = {
        accessToken: 'old_token',
        refreshToken: 'invalid_refresh_token',
        expiresAt: new Date(Date.now() + 1000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      // Mock lock acquisition
      (mockCache['client'].set as jest.Mock).mockResolvedValue('OK');
      (mockCache.get as jest.Mock).mockResolvedValue(currentToken);
      (mockAPIManager.refreshToken as jest.Mock).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const result = await tokenManager.refreshToken('user123', 'tiktok');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid refresh token');
      expect(result.needsReauth).toBe(true);
    });

    it('should handle missing token', async () => {
      // Mock lock acquisition
      (mockCache['client'].set as jest.Mock).mockResolvedValue('OK');
      (mockCache.get as jest.Mock).mockResolvedValue(null);

      const result = await tokenManager.refreshToken('user123', 'tiktok');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No token found to refresh');
      expect(result.needsReauth).toBe(true);
    });

    it('should handle missing refresh token', async () => {
      const tokenWithoutRefresh: SocialToken = {
        accessToken: 'access_token',
        expiresAt: new Date(Date.now() + 1000),
        platform: 'instagram',
        userId: 'user123',
        platformUserId: 'instagram_user_123',
      };

      // Mock lock acquisition
      (mockCache['client'].set as jest.Mock).mockResolvedValue('OK');
      (mockCache.get as jest.Mock).mockResolvedValue(tokenWithoutRefresh);

      const result = await tokenManager.refreshToken('user123', 'instagram');

      expect(result.success).toBe(false);
      expect(result.error).toBe('No refresh token available');
      expect(result.needsReauth).toBe(true);
    });

    it('should handle concurrent refresh attempts', async () => {
      // Mock lock acquisition failure (another process is refreshing)
      (mockCache['client'].set as jest.Mock).mockResolvedValue(null);

      const existingToken: SocialToken = {
        accessToken: 'existing_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 3600000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      // After waiting, return the existing token
      (mockCache.get as jest.Mock).mockResolvedValue(existingToken);

      const result = await tokenManager.refreshToken('user123', 'tiktok');

      expect(result.success).toBe(true);
      expect(result.token).toEqual(existingToken);
    });
  });

  describe('getValidToken', () => {
    it('should return token when valid and not needing refresh', async () => {
      const validToken: SocialToken = {
        accessToken: 'valid_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      (mockCache.get as jest.Mock).mockResolvedValue(validToken);
      (mockAPIManager.validateToken as jest.Mock).mockResolvedValue(true);

      const result = await tokenManager.getValidToken('user123', 'tiktok');

      expect(result).toEqual(validToken);
    });

    it('should refresh and return new token when needed', async () => {
      const oldToken: SocialToken = {
        accessToken: 'old_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 12 * 60 * 60 * 1000), // 12 hours (needs refresh)
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      const newToken: SocialToken = {
        ...oldToken,
        accessToken: 'new_token',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      };

      // First call returns old token, second call returns new token
      (mockCache.get as jest.Mock)
        .mockResolvedValueOnce(oldToken)
        .mockResolvedValueOnce(newToken);

      (mockAPIManager.validateToken as jest.Mock).mockResolvedValue(true);

      // Mock successful refresh
      (mockCache['client'].set as jest.Mock).mockResolvedValue('OK');
      (mockAPIManager.refreshToken as jest.Mock).mockResolvedValue({
        accessToken: 'new_token',
        refreshToken: 'refresh_token',
      });

      const result = await tokenManager.getValidToken('user123', 'tiktok');

      expect(result?.accessToken).toBe('new_token');
    });

    it('should return null when refresh fails and needs reauth', async () => {
      const expiredToken: SocialToken = {
        accessToken: 'expired_token',
        refreshToken: 'invalid_refresh',
        expiresAt: new Date(Date.now() - 1000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      (mockCache.get as jest.Mock).mockResolvedValue(expiredToken);

      // Mock failed refresh
      (mockCache['client'].set as jest.Mock).mockResolvedValue('OK');
      (mockAPIManager.refreshToken as jest.Mock).mockRejectedValue(
        new Error('Invalid refresh token')
      );

      const result = await tokenManager.getValidToken('user123', 'tiktok');

      expect(result).toBeNull();
      expect(mockCache.del).toHaveBeenCalledWith('token:tiktok:user123');
    });
  });

  describe('getTokenHealth', () => {
    it('should return health status for all platforms', async () => {
      const tiktokToken: SocialToken = {
        accessToken: 'tiktok_token',
        refreshToken: 'tiktok_refresh',
        expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      // Mock TikTok token exists and is valid
      (mockCache.get as jest.Mock)
        .mockResolvedValueOnce(tiktokToken) // First call for TikTok validation
        .mockResolvedValueOnce(null) // Second call for Instagram validation
        .mockResolvedValueOnce(tiktokToken) // Third call for TikTok health
        .mockResolvedValueOnce(null); // Fourth call for Instagram health

      (mockAPIManager.validateToken as jest.Mock)
        .mockResolvedValueOnce(true) // TikTok validation
        .mockResolvedValueOnce(false); // Instagram validation (no token)

      const health = await tokenManager.getTokenHealth('user123');

      expect(health).toEqual({
        tiktok: {
          connected: true,
          valid: true,
          needsRefresh: false,
          expiresAt: tiktokToken.expiresAt,
        },
        instagram: {
          connected: false,
          valid: false,
          needsRefresh: false,
          expiresAt: undefined,
          error: 'Token not found',
        },
      });
    });
  });

  describe('cleanupExpiredTokens', () => {
    it('should remove expired tokens from cache', async () => {
      const expiredToken: SocialToken = {
        accessToken: 'expired_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() - 1000),
        platform: 'tiktok',
        userId: 'user123',
        platformUserId: 'tiktok_user_123',
      };

      const validToken: SocialToken = {
        accessToken: 'valid_token',
        refreshToken: 'refresh_token',
        expiresAt: new Date(Date.now() + 3600000),
        platform: 'instagram',
        userId: 'user456',
        platformUserId: 'instagram_user_456',
      };

      (mockCache.keys as jest.Mock).mockResolvedValue([
        'token:tiktok:user123',
        'token:instagram:user456',
      ]);

      (mockCache.get as jest.Mock)
        .mockResolvedValueOnce(expiredToken)
        .mockResolvedValueOnce(validToken);

      const cleanedCount = await tokenManager.cleanupExpiredTokens();

      expect(cleanedCount).toBe(1);
      expect(mockCache.del).toHaveBeenCalledWith('token:tiktok:user123');
      expect(mockCache.del).not.toHaveBeenCalledWith('token:instagram:user456');
    });
  });
});
