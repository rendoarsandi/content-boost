// Note: Database operations should be handled externally
// This module provides OAuth utilities without direct database access

export interface TikTokTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  refresh_expires_in: number;
}

export interface TikTokUserInfo {
  open_id: string;
  union_id: string;
  avatar_url: string;
  avatar_url_100: string;
  avatar_url_200: string;
  display_name: string;
  bio_description: string;
  profile_deep_link: string;
  is_verified: boolean;
  follower_count: number;
  following_count: number;
  likes_count: number;
  video_count: number;
}

export class TikTokOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.TIKTOK_CLIENT_ID!;
    this.clientSecret = process.env.TIKTOK_CLIENT_SECRET!;
    this.redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/tiktok`;
  }

  // Generate authorization URL
  getAuthorizationUrl(state?: string): string {
    const authUrl = new URL('https://www.tiktok.com/auth/authorize/');

    authUrl.searchParams.set('client_key', this.clientId);
    authUrl.searchParams.set(
      'scope',
      'user.info.basic,user.info.profile,user.info.stats,video.list'
    );
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('redirect_uri', this.redirectUri);

    if (state) {
      authUrl.searchParams.set('state', state);
    }

    return authUrl.toString();
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<TikTokTokenResponse> {
    const response = await fetch(
      'https://open-api.tiktok.com/oauth/access_token/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: this.clientId,
          client_secret: this.clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `TikTok OAuth error: ${data.error_description || data.error}`
      );
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      refresh_expires_in: data.refresh_expires_in,
    };
  }

  // Get user information using access token
  async getUserInfo(accessToken: string): Promise<TikTokUserInfo> {
    const response = await fetch('https://open-api.tiktok.com/v2/user/info/', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (data.error) {
      throw new Error(`TikTok API error: ${data.error.message || data.error}`);
    }

    return data.data.user;
  }

  // Refresh access token
  async refreshAccessToken(refreshToken: string): Promise<TikTokTokenResponse> {
    const response = await fetch(
      'https://open-api.tiktok.com/oauth/refresh_token/',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_key: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `TikTok token refresh error: ${data.error_description || data.error}`
      );
    }

    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token || refreshToken, // Keep old refresh token if new one not provided
      expires_in: data.expires_in,
      token_type: data.token_type,
      scope: data.scope,
      refresh_expires_in: data.refresh_expires_in,
    };
  }

  // Note: Database operations should be handled externally
  // These methods require external database access implementation
}

// Export singleton instance
export const tiktokOAuth = new TikTokOAuth();
