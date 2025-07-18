// Main auth configuration is exported separately to avoid client-side database imports
// Import from "@repo/auth/config" for server-side usage
export type { ClientUser as User, ClientSession as Session } from "./client-config";

// Client-side utilities
export {
  authClient,
  useSession,
  signIn,
  signOut,
  signUp,
  getCurrentUser,
  isAuthenticated,
  hasRole,
  hasAnyRole,
  getSocialAccounts,
  disconnectSocialAccount,
  refreshSocialToken,
} from "./client";

// Server-side utilities are exported separately to avoid client-side imports
// Import from "@repo/auth/server" for server-side usage

// Middleware
export {
  authMiddleware,
  rateLimitMiddleware,
  csrfMiddleware,
  createAuthMiddleware,
  config as middlewareConfig,
} from "./middleware";

// Types
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: "creator" | "promoter" | "admin";
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthSession {
  user: AuthUser;
  accessToken?: string;
  refreshToken?: string;
  provider?: string;
  expires: Date;
}

export interface SocialAccountData {
  id: string;
  userId: string;
  provider: "tiktok" | "instagram";
  platformUserId: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
  createdAt: Date;
}

// Social Media APIs
export {
  TikTokAPI,
  InstagramAPI,
  SocialMediaManager,
} from "./social";
export type {
  TikTokUserInfo,
  TikTokVideoInfo,
  TikTokVideoStats,
  InstagramUserInfo,
  InstagramMediaInfo,
  InstagramInsights,
  SocialMediaMetrics,
  UserSocialProfile,
} from "./social";

// OAuth handlers
export { tiktokOAuth, TikTokOAuth } from "./oauth/tiktok";
export { instagramOAuth, InstagramOAuth } from "./oauth/instagram";
export { OAuthManager } from "./oauth";
export type {
  TikTokTokenResponse,
  TikTokUserInfo as TikTokOAuthUserInfo,
} from "./oauth/tiktok";
export type {
  InstagramTokenResponse,
  InstagramUserInfo as InstagramOAuthUserInfo,
} from "./oauth/instagram";

// OAuth providers
export { tiktokProvider, instagramProvider } from "./providers";
export type { TikTokProfile, InstagramProfile } from "./providers";

// OAuth route handlers
export {
  handleTikTokAuth,
  handleInstagramAuth,
  handleLinkTikTok,
  handleLinkInstagram,
  handleUnlinkTikTok,
  handleUnlinkInstagram,
  handleGetSocialAccounts,
  handleRefreshTikTokToken,
  handleRefreshInstagramToken,
} from "./handlers/oauth";

// Services
export { 
  SocialAccountService, 
  createSocialAccountService,
  SocialAccountManager,
  TokenRefreshService
} from "./services";
export type { 
  SocialAccountInfo, 
  SocialAccountConnectionResult,
  ConnectionResult
} from "./services";

// Constants
export const USER_ROLES = {
  CREATOR: "creator" as const,
  PROMOTER: "promoter" as const,
  ADMIN: "admin" as const,
} as const;

export const SOCIAL_PROVIDERS = {
  TIKTOK: "tiktok" as const,
  INSTAGRAM: "instagram" as const,
} as const;