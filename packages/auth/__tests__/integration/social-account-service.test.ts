import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock the database and OAuth modules
const mockDb = {
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    }),
  }),
};

jest.mock('@repo/database', () => ({
  db: mockDb,
  users: {},
  socialAccounts: {},
}));

jest.mock('../src/oauth/tiktok', () => ({
  tiktokOAuth: {
    exchangeCodeForToken: jest.fn(),
    getUserInfo: jest.fn(),
    linkToExistingUser: jest.fn(),
    unlinkFromUser: jest.fn(),
    ensureValidToken: jest.fn(),
    getAuthorizationUrl: jest.fn(),
  },
}));

jest.mock('../src/oauth/instagram', () => ({
  instagramOAuth: {
    exchangeCodeForToken: jest.fn(),
    getUserInfo: jest.fn(),
    linkToExistingUser: jest.fn(),
    unlinkFromUser: jest.fn(),
    ensureValidToken: jest.fn(),
    getAuthorizationUrl: jest.fn(),
  },
}));

jest.mock('../src/server', () => ({
  getSocialAccounts: jest.fn(),
  getSocialAccount: jest.fn(),
}));

describe('SocialAccountService', () => {
  let SocialAccountService: any;
  let service: any;
  const mockUserId = 'test-user-id';

  beforeEach(async () => {
    jest.clearAllMocks();

    // Dynamic import to avoid module loading issues
    const module = await import('../src/services/social-account');
    SocialAccountService = module.SocialAccountService;
    service = new SocialAccountService(mockUserId);
  });

  describe('getConnectedAccounts', () => {
    it('should return empty array when no accounts connected', async () => {
      const { getSocialAccounts } = await import('../src/server');
      (getSocialAccounts as jest.Mock).mockResolvedValue([]);

      const result = await service.getConnectedAccounts();

      expect(result).toEqual([]);
      expect(getSocialAccounts).toHaveBeenCalledWith(mockUserId);
    });

    it('should return account info with status for connected accounts', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          platform: 'tiktok',
          platformUserId: 'tiktok-user-id',
          expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
        },
        {
          id: 'account-2',
          platform: 'instagram',
          platformUserId: 'instagram-user-id',
          expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago (expired)
        },
      ];

      const { getSocialAccounts } = await import('../src/server');
      (getSocialAccounts as jest.Mock).mockResolvedValue(mockAccounts);

      const result = await service.getConnectedAccounts();

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        platform: 'tiktok',
        connected: true,
        isExpired: false,
      });
      expect(result[1]).toMatchObject({
        platform: 'instagram',
        connected: true,
        isExpired: true,
      });
    });
  });

  describe('connectAccount', () => {
    it('should successfully connect TikTok account', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        refresh_token: 'test-refresh-token',
        expires_in: 3600,
      };

      const mockUserInfo = {
        open_id: 'tiktok-user-id',
        display_name: 'Test User',
        follower_count: 1000,
        avatar_url_200: 'https://example.com/avatar.jpg',
      };

      const mockSocialAccount = {
        id: 'account-id',
        platformUserId: 'tiktok-user-id',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      };

      const { tiktokOAuth } = await import('../src/oauth/tiktok');
      (tiktokOAuth.exchangeCodeForToken as jest.Mock).mockResolvedValue(
        mockTokens
      );
      (tiktokOAuth.getUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);
      (tiktokOAuth.linkToExistingUser as jest.Mock).mockResolvedValue(
        mockSocialAccount
      );

      const result = await service.connectAccount('tiktok', 'test-code');

      expect(result.success).toBe(true);
      expect(result.account).toMatchObject({
        platform: 'tiktok',
        connected: true,
        profileInfo: {
          username: 'Test User',
          followerCount: 1000,
        },
      });
    });

    it('should successfully connect Instagram account', async () => {
      const mockTokens = {
        access_token: 'test-access-token',
        expires_in: 5184000,
      };

      const mockUserInfo = {
        id: 'instagram-user-id',
        username: 'testuser',
        name: 'Test User',
        followers_count: 500,
        profile_picture_url: 'https://example.com/profile.jpg',
      };

      const mockSocialAccount = {
        id: 'account-id',
        platformUserId: 'instagram-user-id',
        expiresAt: new Date(Date.now() + 5184000 * 1000),
      };

      const { instagramOAuth } = await import('../src/oauth/instagram');
      (instagramOAuth.exchangeCodeForToken as jest.Mock).mockResolvedValue(
        mockTokens
      );
      (instagramOAuth.getUserInfo as jest.Mock).mockResolvedValue(mockUserInfo);
      (instagramOAuth.linkToExistingUser as jest.Mock).mockResolvedValue(
        mockSocialAccount
      );

      const result = await service.connectAccount('instagram', 'test-code');

      expect(result.success).toBe(true);
      expect(result.account).toMatchObject({
        platform: 'instagram',
        connected: true,
        profileInfo: {
          username: 'testuser',
          displayName: 'Test User',
          followerCount: 500,
        },
      });
    });

    it('should handle connection errors gracefully', async () => {
      const { tiktokOAuth } = await import('../src/oauth/tiktok');
      (tiktokOAuth.exchangeCodeForToken as jest.Mock).mockRejectedValue(
        new Error('OAuth error')
      );

      const result = await service.connectAccount('tiktok', 'invalid-code');

      expect(result.success).toBe(false);
      expect(result.error).toBe('OAuth error');
    });
  });

  describe('disconnectAccount', () => {
    it('should successfully disconnect TikTok account', async () => {
      const { tiktokOAuth } = await import('../src/oauth/tiktok');
      (tiktokOAuth.unlinkFromUser as jest.Mock).mockResolvedValue(undefined);

      const result = await service.disconnectAccount('tiktok');

      expect(result.success).toBe(true);
      expect(tiktokOAuth.unlinkFromUser).toHaveBeenCalledWith(mockUserId);
    });

    it('should successfully disconnect Instagram account', async () => {
      const { instagramOAuth } = await import('../src/oauth/instagram');
      (instagramOAuth.unlinkFromUser as jest.Mock).mockResolvedValue(undefined);

      const result = await service.disconnectAccount('instagram');

      expect(result.success).toBe(true);
      expect(instagramOAuth.unlinkFromUser).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle disconnection errors gracefully', async () => {
      const { tiktokOAuth } = await import('../src/oauth/tiktok');
      (tiktokOAuth.unlinkFromUser as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await service.disconnectAccount('tiktok');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('refreshToken', () => {
    it('should successfully refresh TikTok token', async () => {
      const { tiktokOAuth } = await import('../src/oauth/tiktok');
      (tiktokOAuth.ensureValidToken as jest.Mock).mockResolvedValue(
        'new-token'
      );

      const result = await service.refreshToken('tiktok');

      expect(result.success).toBe(true);
      expect(tiktokOAuth.ensureValidToken).toHaveBeenCalledWith(mockUserId);
    });

    it('should successfully refresh Instagram token', async () => {
      const { instagramOAuth } = await import('../src/oauth/instagram');
      (instagramOAuth.ensureValidToken as jest.Mock).mockResolvedValue(
        'new-token'
      );

      const result = await service.refreshToken('instagram');

      expect(result.success).toBe(true);
      expect(instagramOAuth.ensureValidToken).toHaveBeenCalledWith(mockUserId);
    });

    it('should handle token refresh errors gracefully', async () => {
      const { tiktokOAuth } = await import('../src/oauth/tiktok');
      (tiktokOAuth.ensureValidToken as jest.Mock).mockRejectedValue(
        new Error('Token refresh failed')
      );

      const result = await service.refreshToken('tiktok');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Token refresh failed');
    });
  });

  describe('getAuthorizationUrl', () => {
    it('should return TikTok authorization URL', () => {
      const { tiktokOAuth } = require('../src/oauth/tiktok');
      (tiktokOAuth.getAuthorizationUrl as jest.Mock).mockReturnValue(
        'https://tiktok.com/auth'
      );

      const result = service.getAuthorizationUrl('tiktok', 'test-state');

      expect(result).toBe('https://tiktok.com/auth');
      expect(tiktokOAuth.getAuthorizationUrl).toHaveBeenCalledWith(
        'test-state'
      );
    });

    it('should return Instagram authorization URL', () => {
      const { instagramOAuth } = require('../src/oauth/instagram');
      (instagramOAuth.getAuthorizationUrl as jest.Mock).mockReturnValue(
        'https://instagram.com/auth'
      );

      const result = service.getAuthorizationUrl('instagram', 'test-state');

      expect(result).toBe('https://instagram.com/auth');
      expect(instagramOAuth.getAuthorizationUrl).toHaveBeenCalledWith(
        'test-state'
      );
    });

    it('should throw error for unsupported platform', () => {
      expect(() => {
        service.getAuthorizationUrl('unsupported' as any);
      }).toThrow('Unsupported platform: unsupported');
    });
  });

  describe('getAccountHealth', () => {
    it('should return health status for all platforms', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          platform: 'tiktok',
          connected: true,
          isExpired: false,
          needsRefresh: false,
        },
      ];

      jest
        .spyOn(service, 'getConnectedAccounts')
        .mockResolvedValue(mockAccounts);

      const result = await service.getAccountHealth();

      expect(result).toHaveLength(2); // TikTok and Instagram
      expect(result[0]).toMatchObject({
        platform: 'tiktok',
        status: 'healthy',
      });
      expect(result[1]).toMatchObject({
        platform: 'instagram',
        status: 'disconnected',
      });
    });

    it('should identify expired tokens', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          platform: 'tiktok',
          connected: true,
          isExpired: true,
          needsRefresh: false,
        },
      ];

      jest
        .spyOn(service, 'getConnectedAccounts')
        .mockResolvedValue(mockAccounts);

      const result = await service.getAccountHealth();

      const tiktokHealth = result.find(h => h.platform === 'tiktok');
      expect(tiktokHealth?.status).toBe('expired');
    });

    it('should identify tokens that need refresh', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          platform: 'tiktok',
          connected: true,
          isExpired: false,
          needsRefresh: true,
        },
      ];

      jest
        .spyOn(service, 'getConnectedAccounts')
        .mockResolvedValue(mockAccounts);

      const result = await service.getAccountHealth();

      const tiktokHealth = result.find(h => h.platform === 'tiktok');
      expect(tiktokHealth?.status).toBe('needs_refresh');
    });
  });

  describe('autoRefreshTokens', () => {
    it('should auto-refresh tokens that need refresh', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          platform: 'tiktok',
          connected: true,
          isExpired: false,
          needsRefresh: true,
        },
        {
          id: 'account-2',
          platform: 'instagram',
          connected: true,
          isExpired: true, // Should not refresh expired tokens
          needsRefresh: false,
        },
      ];

      jest
        .spyOn(service, 'getConnectedAccounts')
        .mockResolvedValue(mockAccounts);
      jest.spyOn(service, 'refreshToken').mockResolvedValue({ success: true });

      await service.autoRefreshTokens();

      expect(service.refreshToken).toHaveBeenCalledTimes(1);
      expect(service.refreshToken).toHaveBeenCalledWith('tiktok');
    });

    it('should handle refresh failures gracefully', async () => {
      const mockAccounts = [
        {
          id: 'account-1',
          platform: 'tiktok',
          connected: true,
          isExpired: false,
          needsRefresh: true,
        },
      ];

      jest
        .spyOn(service, 'getConnectedAccounts')
        .mockResolvedValue(mockAccounts);
      jest
        .spyOn(service, 'refreshToken')
        .mockRejectedValue(new Error('Refresh failed'));

      // Should not throw error
      await expect(service.autoRefreshTokens()).resolves.toBeUndefined();
    });
  });
});

describe('createSocialAccountService', () => {
  it('should create service instance with user ID', async () => {
    const { createSocialAccountService } = await import(
      '../src/services/social-account'
    );

    const service = createSocialAccountService('test-user-id');

    expect(service).toBeInstanceOf(Object);
    expect(typeof service.getConnectedAccounts).toBe('function');
    expect(typeof service.connectAccount).toBe('function');
    expect(typeof service.disconnectAccount).toBe('function');
  });
});
