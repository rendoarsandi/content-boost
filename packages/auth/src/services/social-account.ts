// Note: This service should be used server-side only
// Social account data access is handled externally

export interface SocialAccountInfo {
  id: string;
  platform: 'tiktok' | 'instagram';
  platformUserId: string;
  connected: boolean;
  expiresAt: Date | null;
  isExpired: boolean;
  needsRefresh: boolean;
  profileInfo?: {
    username: string;
    displayName: string;
    followerCount?: number;
    profilePictureUrl?: string;
  };
}

export interface SocialAccountConnectionResult {
  success: boolean;
  error?: string;
  account?: SocialAccountInfo;
}

export class SocialAccountService {
  constructor(private userId: string) {}

  // Get all connected social accounts with status
  // Note: This method requires external data source
  async getConnectedAccounts(): Promise<SocialAccountInfo[]> {
    // This method should be implemented with external data access
    throw new Error('getConnectedAccounts requires external implementation');
  }

  // Get specific social account
  // Note: This method requires external data source
  async getAccount(
    platform: 'tiktok' | 'instagram'
  ): Promise<SocialAccountInfo | null> {
    // This method should be implemented with external data access
    throw new Error('getAccount requires external implementation');
  }

  // Connect a social account using OAuth code
  async connectAccount(
    platform: 'tiktok' | 'instagram',
    code: string
  ): Promise<SocialAccountConnectionResult> {
    // Note: OAuth connection should be implemented with external database access
    return {
      success: false,
      error: 'OAuth connection requires external implementation',
    };
  }

  // Disconnect a social account
  async disconnectAccount(
    platform: 'tiktok' | 'instagram'
  ): Promise<SocialAccountConnectionResult> {
    // Note: OAuth disconnection should be implemented with external database access
    return {
      success: false,
      error: 'OAuth disconnection requires external implementation',
    };
  }

  // Refresh token for a specific platform
  async refreshToken(
    platform: 'tiktok' | 'instagram'
  ): Promise<SocialAccountConnectionResult> {
    // Note: Token refresh should be implemented with external database access
    return {
      success: false,
      error: 'Token refresh requires external implementation',
    };
  }

  // Get authorization URL for connecting an account
  getAuthorizationUrl(
    platform: 'tiktok' | 'instagram',
    state?: string
  ): string {
    // Note: OAuth URL generation should be implemented with external configuration
    throw new Error('OAuth URL generation requires external implementation');
  }

  // Check if account is connected
  async isConnected(platform: 'tiktok' | 'instagram'): Promise<boolean> {
    const account = await this.getAccount(platform);
    return (account?.connected && !account.isExpired) || false;
  }

  // Get account health status
  async getAccountHealth(): Promise<
    {
      platform: 'tiktok' | 'instagram';
      status: 'healthy' | 'needs_refresh' | 'expired' | 'disconnected';
      message: string;
    }[]
  > {
    const accounts = await this.getConnectedAccounts();
    const healthStatus = [];

    // Check TikTok
    const tiktokAccount = accounts.find(a => a.platform === 'tiktok');
    if (!tiktokAccount) {
      healthStatus.push({
        platform: 'tiktok' as const,
        status: 'disconnected' as const,
        message: 'TikTok account not connected',
      });
    } else if (tiktokAccount.isExpired) {
      healthStatus.push({
        platform: 'tiktok' as const,
        status: 'expired' as const,
        message: 'TikTok token has expired and needs reconnection',
      });
    } else if (tiktokAccount.needsRefresh) {
      healthStatus.push({
        platform: 'tiktok' as const,
        status: 'needs_refresh' as const,
        message: 'TikTok token will expire soon',
      });
    } else {
      healthStatus.push({
        platform: 'tiktok' as const,
        status: 'healthy' as const,
        message: 'TikTok account is connected and healthy',
      });
    }

    // Check Instagram
    const instagramAccount = accounts.find(a => a.platform === 'instagram');
    if (!instagramAccount) {
      healthStatus.push({
        platform: 'instagram' as const,
        status: 'disconnected' as const,
        message: 'Instagram account not connected',
      });
    } else if (instagramAccount.isExpired) {
      healthStatus.push({
        platform: 'instagram' as const,
        status: 'expired' as const,
        message: 'Instagram token has expired and needs reconnection',
      });
    } else if (instagramAccount.needsRefresh) {
      healthStatus.push({
        platform: 'instagram' as const,
        status: 'needs_refresh' as const,
        message: 'Instagram token will expire soon',
      });
    } else {
      healthStatus.push({
        platform: 'instagram' as const,
        status: 'healthy' as const,
        message: 'Instagram account is connected and healthy',
      });
    }

    return healthStatus;
  }

  // Auto-refresh tokens that are about to expire
  async autoRefreshTokens(): Promise<void> {
    const accounts = await this.getConnectedAccounts();

    for (const account of accounts) {
      if (account.needsRefresh && !account.isExpired) {
        try {
          await this.refreshToken(account.platform);
          console.log(
            `Auto-refreshed ${account.platform} token for user ${this.userId}`
          );
        } catch (error) {
          console.error(
            `Failed to auto-refresh ${account.platform} token:`,
            error
          );
        }
      }
    }
  }
}

// Factory function to create service instance
export const createSocialAccountService = (userId: string) => {
  return new SocialAccountService(userId);
};
