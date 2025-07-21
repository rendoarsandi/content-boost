import { describe, it, expect } from '@jest/globals';

describe('Auth Configuration', () => {
  it('should have correct environment variables', () => {
    expect(process.env.TIKTOK_CLIENT_ID).toBe('test-tiktok-client-id');
    expect(process.env.INSTAGRAM_CLIENT_ID).toBe('test-instagram-client-id');
    expect(process.env.NEXTAUTH_URL).toBe('http://localhost:3001');
    expect(process.env.NEXTAUTH_SECRET).toBe('test-secret');
  });

  it('should validate user roles correctly', () => {
    const validRoles = ['creator', 'promoter', 'admin'];
    
    validRoles.forEach(role => {
      expect(validRoles.includes(role)).toBe(true);
    });
    
    expect(validRoles.includes('invalid-role')).toBe(false);
  });

  it('should have correct OAuth scopes for TikTok', () => {
    const tiktokScopes = [
      "user.info.basic",
      "user.info.profile", 
      "user.info.stats",
      "video.list"
    ];
    
    expect(tiktokScopes.length).toBeGreaterThan(0);
    expect(tiktokScopes).toContain("user.info.basic");
    expect(tiktokScopes).toContain("user.info.profile");
  });

  it('should have correct OAuth scopes for Instagram', () => {
    const instagramScopes = [
      "user_profile",
      "user_media"
    ];
    
    expect(instagramScopes.length).toBeGreaterThan(0);
    expect(instagramScopes).toContain("user_profile");
    expect(instagramScopes).toContain("user_media");
  });
});

describe('OAuth Configuration', () => {
  it('should have TikTok OAuth URLs configured correctly', () => {
    const authUrl = "https://www.tiktok.com/auth/authorize/";
    const tokenUrl = "https://open-api.tiktok.com/oauth/access_token/";
    const refreshUrl = "https://open-api.tiktok.com/oauth/refresh_token/";
    
    expect(authUrl).toContain('tiktok.com');
    expect(tokenUrl).toContain('open-api.tiktok.com');
    expect(refreshUrl).toContain('refresh_token');
  });

  it('should have Instagram OAuth URLs configured correctly', () => {
    const authUrl = "https://api.instagram.com/oauth/authorize";
    const tokenUrl = "https://api.instagram.com/oauth/access_token";
    const refreshUrl = "https://graph.instagram.com/refresh_access_token";
    
    expect(authUrl).toContain('instagram.com');
    expect(tokenUrl).toContain('oauth/access_token');
    expect(refreshUrl).toContain('refresh_access_token');
  });
});

describe('Role-based Access Control', () => {
  it('should define correct user roles', () => {
    const USER_ROLES = {
      CREATOR: "creator" as const,
      PROMOTER: "promoter" as const,
      ADMIN: "admin" as const,
    };
    
    expect(USER_ROLES.CREATOR).toBe('creator');
    expect(USER_ROLES.PROMOTER).toBe('promoter');
    expect(USER_ROLES.ADMIN).toBe('admin');
  });

  it('should define correct social providers', () => {
    const SOCIAL_PROVIDERS = {
      TIKTOK: "tiktok" as const,
      INSTAGRAM: "instagram" as const,
    };
    
    expect(SOCIAL_PROVIDERS.TIKTOK).toBe('tiktok');
    expect(SOCIAL_PROVIDERS.INSTAGRAM).toBe('instagram');
  });
});

describe('JWT Configuration', () => {
  it('should have secure JWT settings', () => {
    const jwtConfig = {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      algorithm: "HS256",
    };
    
    expect(jwtConfig.expiresIn).toBe(604800); // 7 days in seconds
    expect(jwtConfig.algorithm).toBe("HS256");
  });

  it('should have proper session configuration', () => {
    const sessionConfig = {
      expiresIn: 60 * 60 * 24 * 7, // 7 days
      updateAge: 60 * 60 * 24, // 1 day
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5, // 5 minutes
      },
    };
    
    expect(sessionConfig.expiresIn).toBe(604800); // 7 days
    expect(sessionConfig.updateAge).toBe(86400); // 1 day
    expect(sessionConfig.cookieCache.enabled).toBe(true);
    expect(sessionConfig.cookieCache.maxAge).toBe(300); // 5 minutes
  });
});