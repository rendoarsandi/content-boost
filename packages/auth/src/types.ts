export interface FrameworkRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: any;
}

export interface FrameworkResponse {
  status: number;
  headers: Map<string, string>;
  body?: any;
  redirect?: string;
}

export interface OAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scope?: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
}

export interface SocialUserInfo {
  id: string;
  username?: string;
  email?: string;
  displayName?: string;
  profileUrl?: string;
  avatarUrl?: string;
}

export interface SocialAccount {
  id: string;
  userId: string;
  provider: 'tiktok' | 'instagram';
  providerAccountId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  tokenType?: string;
  scope?: string;
  username?: string;
  displayName?: string;
  profileUrl?: string;
  avatarUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}
