// OAuth integrations
export { TikTokOAuth, tiktokOAuth } from "./tiktok";
export type { 
  TikTokTokenResponse, 
  TikTokUserInfo as TikTokOAuthUserInfo 
} from "./tiktok";

export { InstagramOAuth, instagramOAuth } from "./instagram";
export type { 
  InstagramTokenResponse, 
  InstagramUserInfo as InstagramOAuthUserInfo 
} from "./instagram";

// OAuth utilities
export class OAuthManager {
  static async linkSocialAccount(
    userId: string, 
    provider: "tiktok" | "instagram", 
    code: string
  ): Promise<{ success: boolean; error?: string }> {
    // Note: OAuth linking should be implemented with external database access
    return { 
      success: false, 
      error: "OAuth linking requires external implementation" 
    };
  }
  
  static async unlinkSocialAccount(
    userId: string, 
    provider: "tiktok" | "instagram"
  ): Promise<{ success: boolean; error?: string }> {
    // Note: OAuth unlinking should be implemented with external database access
    return { 
      success: false, 
      error: "OAuth unlinking requires external implementation" 
    };
  }
  
  static getAuthorizationUrl(provider: "tiktok" | "instagram", state?: string): string {
    // Note: OAuth URL generation should be implemented with external configuration
    throw new Error("OAuth URL generation requires external implementation");
  }
}