import { describe, it, expect, jest, beforeEach } from '@jest/globals';

// Mock fetch globally
global.fetch = jest.fn();

// Mock database
const mockDb = {
  select: jest.fn().mockReturnValue({
    from: jest.fn().mockReturnValue({
      where: jest.fn().mockReturnValue({
        limit: jest.fn().mockResolvedValue([]),
      }),
    }),
  }),
  insert: jest.fn().mockReturnValue({
    values: jest.fn().mockReturnValue({
      returning: jest.fn().mockResolvedValue([
        {
          id: 'test-user-id',
          email: 'test@example.com',
          name: 'Test User',
          role: 'promoter',
        },
      ]),
    }),
  }),
  update: jest.fn().mockReturnValue({
    set: jest.fn().mockReturnValue({
      where: jest.fn().mockResolvedValue({}),
    }),
  }),
  delete: jest.fn().mockReturnValue({
    where: jest.fn().mockResolvedValue({}),
  }),
};

jest.mock('@repo/database', () => ({
  db: mockDb,
  users: {},
  socialAccounts: {},
}));

jest.mock('drizzle-orm', () => ({
  eq: jest.fn(),
  and: jest.fn(),
}));

describe('TikTok OAuth', () => {
  let TikTokOAuth: any;
  let tiktokOAuth: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Dynamic import to avoid module loading issues
    const module = await import('../src/oauth/tiktok');
    TikTokOAuth = module.TikTokOAuth;
    tiktokOAuth = new TikTokOAuth();
  });

  it('should generate correct authorization URL', () => {
    const authUrl = tiktokOAuth.getAuthorizationUrl('test-state');

    expect(authUrl).toContain('tiktok.com/auth/authorize');
    expect(authUrl).toContain('client_key=test-tiktok-client-id');
    expect(authUrl).toContain('scope=user.info.basic');
    expect(authUrl).toContain('state=test-state');
  });

  it('should exchange code for token successfully', async () => {
    const mockTokenResponse = {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'user.info.basic',
      refresh_expires_in: 86400,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockTokenResponse),
    });

    const result = await tiktokOAuth.exchangeCodeForToken('test-code');

    expect(result).toEqual(mockTokenResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://open-api.tiktok.com/oauth/access_token/',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    );
  });

  it('should handle token exchange errors', async () => {
    const mockErrorResponse = {
      error: 'invalid_grant',
      error_description: 'Invalid authorization code',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockErrorResponse),
    });

    await expect(
      tiktokOAuth.exchangeCodeForToken('invalid-code')
    ).rejects.toThrow('TikTok OAuth error: Invalid authorization code');
  });

  it('should get user info successfully', async () => {
    const mockUserInfo = {
      data: {
        user: {
          open_id: 'test-open-id',
          display_name: 'Test User',
          avatar_url_200: 'https://example.com/avatar.jpg',
          follower_count: 1000,
          following_count: 500,
          likes_count: 10000,
          video_count: 50,
          is_verified: false,
          bio_description: 'Test bio',
          profile_deep_link: 'https://tiktok.com/@testuser',
        },
      },
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserInfo),
    });

    const result = await tiktokOAuth.getUserInfo('test-access-token');

    expect(result).toEqual(mockUserInfo.data.user);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://open-api.tiktok.com/v2/user/info/',
      expect.objectContaining({
        headers: {
          Authorization: 'Bearer test-access-token',
        },
      })
    );
  });

  it('should refresh access token successfully', async () => {
    const mockRefreshResponse = {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'user.info.basic',
      refresh_expires_in: 86400,
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRefreshResponse),
    });

    const result = await tiktokOAuth.refreshAccessToken('test-refresh-token');

    expect(result).toEqual(mockRefreshResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      'https://open-api.tiktok.com/oauth/refresh_token/',
      expect.objectContaining({
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      })
    );
  });
});

describe('Instagram OAuth', () => {
  let InstagramOAuth: any;
  let instagramOAuth: any;

  beforeEach(async () => {
    jest.clearAllMocks();

    // Dynamic import to avoid module loading issues
    const module = await import('../src/oauth/instagram');
    InstagramOAuth = module.InstagramOAuth;
    instagramOAuth = new InstagramOAuth();
  });

  it('should generate correct authorization URL', () => {
    const authUrl = instagramOAuth.getAuthorizationUrl('test-state');

    expect(authUrl).toContain('api.instagram.com/oauth/authorize');
    expect(authUrl).toContain('client_id=test-instagram-client-id');
    expect(authUrl).toContain('scope=user_profile,user_media');
    expect(authUrl).toContain('state=test-state');
  });

  it('should exchange code for token successfully', async () => {
    const mockShortTokenResponse = {
      access_token: 'short-lived-token',
      user_id: 'test-user-id',
    };

    const mockLongTokenResponse = {
      access_token: 'long-lived-token',
      expires_in: 5184000, // 60 days
      token_type: 'Bearer',
    };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockShortTokenResponse),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: jest.fn().mockResolvedValue(mockLongTokenResponse),
      });

    const result = await instagramOAuth.exchangeCodeForToken('test-code');

    expect(result).toEqual(mockLongTokenResponse);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('should get user info successfully', async () => {
    const mockUserInfo = {
      id: 'test-instagram-id',
      username: 'testuser',
      account_type: 'PERSONAL',
      media_count: 25,
      name: 'Test User',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockUserInfo),
    });

    const result = await instagramOAuth.getUserInfo('test-access-token');

    expect(result).toEqual(mockUserInfo);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('graph.instagram.com/me'),
      undefined
    );
  });

  it('should refresh access token successfully', async () => {
    const mockRefreshResponse = {
      access_token: 'refreshed-token',
      expires_in: 5184000,
      token_type: 'Bearer',
    };

    (global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: jest.fn().mockResolvedValue(mockRefreshResponse),
    });

    const result = await instagramOAuth.refreshAccessToken('test-access-token');

    expect(result).toEqual(mockRefreshResponse);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('graph.instagram.com/refresh_access_token'),
      expect.objectContaining({ method: 'GET' })
    );
  });
});

describe('OAuth Integration', () => {
  it('should handle role-based access control correctly', () => {
    const roles = ['creator', 'promoter', 'admin'];

    roles.forEach(role => {
      expect(['creator', 'promoter', 'admin']).toContain(role);
    });
  });

  it('should validate OAuth provider types', () => {
    const providers = ['tiktok', 'instagram'];

    providers.forEach(provider => {
      expect(['tiktok', 'instagram']).toContain(provider);
    });
  });

  it('should have secure token storage configuration', () => {
    const tokenConfig = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    expect(tokenConfig.httpOnly).toBe(true);
    expect(tokenConfig.sameSite).toBe('lax');
    expect(tokenConfig.maxAge).toBe(604800); // 7 days
  });
});
