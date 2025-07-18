// Note: Database operations should be handled externally
// This service provides interfaces without direct database access

export interface SocialAccountInfo {
  id: string;
  platform: "tiktok" | "instagram";
  platformUserId: string;
  connected: boolean;
  expired: boolean;
  expiresAt?: Date;
  createdAt: Date;
  profileInfo?: {
    username: string;
    displayName: string;
    followerCount: number;
    mediaCount: number;
    profilePictureUrl?: string;
  };
}

export interface ConnectionResult {
  success: boolean;
  account?: SocialAccountInfo;
  error?: string;
  isNewConnection: boolean;
}

export class SocialAccountManager {
  constructor(private userId: string) {}

  // Get all connected social accounts for the user
  async getConnectedAccounts(): Promise<SocialAccountInfo[]> {
    // Note: Database operations should be handled externally
    throw new Error("getConnectedAccounts requires external implementation");
  }

  // Check if a specific platform is connected
  async isConnected(platform: "tiktok" | "instagram"): Promise<boolean> {
    // Note: Database operations should be handled externally
    throw new Error("isConnected requires external implementation");
  }

  // Get connection URL for a platform
  getConnectionUrl(platform: "tiktok" | "instagram", baseUrl: string): string {
    // Note: OAuth URL generation should be handled externally
    throw new Error("getConnectionUrl requires external implementation");
  }

  // Disconnect a platform
  async disconnect(platform: "tiktok" | "instagram"): Promise<boolean> {
    // Note: Database operations should be handled externally
    throw new Error("disconnect requires external implementation");
  }

  // Refresh tokens for all connected accounts
  async refreshTokens(): Promise<{ success: boolean; results: any[] }> {
    // Note: Token refresh should be handled externally
    throw new Error("refreshTokens requires external implementation");
  }

  // Get token status for all platforms
  async getTokenStatus(): Promise<{
    tiktok?: { expired: boolean; expiresAt?: Date };
    instagram?: { expired: boolean; expiresAt?: Date };
  }> {
    // Note: Token status should be handled externally
    throw new Error("getTokenStatus requires external implementation");
  }

  // Connect a new social account (called from OAuth callback)
  async connectAccount(
    platform: "tiktok" | "instagram",
    code: string
  ): Promise<ConnectionResult> {
    // Note: OAuth token exchange and user linking should be handled externally
    throw new Error("connectAccount requires external implementation");
  }

  // Get available platforms (not yet connected)
  async getAvailablePlatforms(): Promise<("tiktok" | "instagram")[]> {
    const connected = await this.getConnectedAccounts();
    const connectedPlatforms = connected.map(acc => acc.platform);
    
    const allPlatforms: ("tiktok" | "instagram")[] = ["tiktok", "instagram"];
    return allPlatforms.filter(platform => !connectedPlatforms.includes(platform));
  }

  // Validate and ensure all tokens are valid
  async validateAllTokens(): Promise<{
    valid: boolean;
    issues: Array<{ platform: string; issue: string }>;
  }> {
    // Note: Token validation should be handled externally
    throw new Error("validateAllTokens requires external implementation");
  }
}