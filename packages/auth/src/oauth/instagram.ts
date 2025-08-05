// Note: Database operations should be handled externally
// This module provides OAuth utilities without direct database access

export interface InstagramTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export interface InstagramUserInfo {
  id: string;
  username: string;
  account_type: 'BUSINESS' | 'MEDIA_CREATOR' | 'PERSONAL';
  media_count: number;
  followers_count?: number;
  follows_count?: number;
  name?: string;
  biography?: string;
  website?: string;
  profile_picture_url?: string;
}

export class InstagramOAuth {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.INSTAGRAM_CLIENT_ID!;
    this.clientSecret = process.env.INSTAGRAM_CLIENT_SECRET!;
    this.redirectUri = `${process.env.NEXTAUTH_URL}/api/auth/callback/instagram`;
  }

  // Generate authorization URL
  getAuthorizationUrl(state?: string): string {
    const authUrl = new URL('https://api.instagram.com/oauth/authorize');

    authUrl.searchParams.set('client_id', this.clientId);
    authUrl.searchParams.set('redirect_uri', this.redirectUri);
    authUrl.searchParams.set('scope', 'user_profile,user_media');
    authUrl.searchParams.set('response_type', 'code');

    if (state) {
      authUrl.searchParams.set('state', state);
    }

    return authUrl.toString();
  }

  // Exchange authorization code for access token
  async exchangeCodeForToken(code: string): Promise<InstagramTokenResponse> {
    // First, get short-lived access token
    const response = await fetch(
      'https://api.instagram.com/oauth/access_token',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: this.clientId,
          client_secret: this.clientSecret,
          grant_type: 'authorization_code',
          redirect_uri: this.redirectUri,
          code,
        }),
      }
    );

    const shortTokenData = await response.json();

    if (shortTokenData.error) {
      throw new Error(
        `Instagram OAuth error: ${shortTokenData.error_description || shortTokenData.error}`
      );
    }

    // Exchange for long-lived access token
    const longTokenResponse = await fetch(
      `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${this.clientSecret}&access_token=${shortTokenData.access_token}`,
      { method: 'GET' }
    );

    const longTokenData = await longTokenResponse.json();

    if (longTokenData.error) {
      throw new Error(
        `Instagram long-lived token error: ${longTokenData.error.message || longTokenData.error}`
      );
    }

    return {
      access_token: longTokenData.access_token,
      expires_in: longTokenData.expires_in,
      token_type: longTokenData.token_type || 'Bearer',
    };
  }

  // Get user information using access token
  async getUserInfo(accessToken: string): Promise<InstagramUserInfo> {
    const fields = [
      'id',
      'username',
      'account_type',
      'media_count',
      'followers_count',
      'follows_count',
      'name',
      'biography',
      'website',
      'profile_picture_url',
    ].join(',');

    const response = await fetch(
      `https://graph.instagram.com/me?fields=${fields}&access_token=${accessToken}`
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `Instagram API error: ${data.error.message || data.error}`
      );
    }

    return data;
  }

  // Refresh access token (Instagram long-lived tokens)
  async refreshAccessToken(
    accessToken: string
  ): Promise<InstagramTokenResponse> {
    const response = await fetch(
      `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`,
      { method: 'GET' }
    );

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `Instagram token refresh error: ${data.error.message || data.error}`
      );
    }

    return {
      access_token: data.access_token,
      expires_in: data.expires_in,
      token_type: data.token_type || 'Bearer',
    };
  }

  // Note: Database operations should be handled externally
  // These methods require external database access implementation
}

// Export singleton instance
export const instagramOAuth = new InstagramOAuth();
