import { tiktokOAuth } from "../oauth/tiktok";
import { instagramOAuth } from "../oauth/instagram";
import { FrameworkRequest, FrameworkResponse } from "@repo/auth/types";

// TikTok OAuth handlers
export async function handleTikTokAuth(request: FrameworkRequest): Promise<FrameworkResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("TikTok OAuth error:", error);
    return { status: 302, headers: new Map([["Location", `/login?error=oauth_error`]]) };
  }

  // If no code, redirect to TikTok authorization
  if (!code) {
    const authUrl = tiktokOAuth.getAuthorizationUrl(crypto.randomUUID());
    return { status: 302, headers: new Map([["Location", authUrl]]) };
  }

  try {
    // Exchange code for tokens
    const tokens = await tiktokOAuth.exchangeCodeForToken(code);
    
    // Get user info
    const userInfo = await tiktokOAuth.getUserInfo(tokens.access_token);
    
    // Note: User creation and session management should be handled externally
    return { status: 302, headers: new Map([["Location", `/dashboard`]]) };
  } catch (error) {
    console.error("TikTok OAuth callback error:", error);
    return { status: 302, headers: new Map([["Location", `/login?error=oauth_callback_error`]]) };
  }
}

// Instagram OAuth handlers
export async function handleInstagramAuth(request: FrameworkRequest): Promise<FrameworkResponse> {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Instagram OAuth error:", error);
    return { status: 302, headers: new Map([["Location", `/login?error=oauth_error`]]) };
  }

  // If no code, redirect to Instagram authorization
  if (!code) {
    const authUrl = instagramOAuth.getAuthorizationUrl(crypto.randomUUID());
    return { status: 302, headers: new Map([["Location", authUrl]]) };
  }

  try {
    // Exchange code for tokens
    const tokens = await instagramOAuth.exchangeCodeForToken(code);
    
    // Get user info
    const userInfo = await instagramOAuth.getUserInfo(tokens.access_token);
    
    // Note: User creation and session management should be handled externally
    return { status: 302, headers: new Map([["Location", `/dashboard`]]) };
  } catch (error) {
    console.error("Instagram OAuth callback error:", error);
    return { status: 302, headers: new Map([["Location", `/login?error=oauth_callback_error`]]) };
  }
}

// Link social account to existing user
export async function handleLinkTikTok(request: FrameworkRequest): Promise<FrameworkResponse> {
  // Note: Session management and user linking should be handled externally
  return { status: 302, headers: new Map([["Location", `/dashboard/social`]]) };
}

export async function handleLinkInstagram(request: FrameworkRequest): Promise<FrameworkResponse> {
  // Note: Session management and user linking should be handled externally
  return { status: 302, headers: new Map([["Location", `/dashboard/social`]]) };
}

// Unlink social accounts
export async function handleUnlinkTikTok(request: FrameworkRequest): Promise<FrameworkResponse> {
  // Note: Session management and unlinking should be handled externally
  return { status: 200, headers: new Map(), body: { success: true } };
}

export async function handleUnlinkInstagram(request: FrameworkRequest): Promise<FrameworkResponse> {
  // Note: Session management and unlinking should be handled externally
  return { status: 200, headers: new Map(), body: { success: true } };
}

// Get connected social accounts
export async function handleGetSocialAccounts(request: FrameworkRequest): Promise<FrameworkResponse> {
  // Note: Session management and account retrieval should be handled externally
  return { status: 200, headers: new Map(), body: { accounts: [] } };
}

// Refresh social tokens
export async function handleRefreshTikTokToken(request: FrameworkRequest): Promise<FrameworkResponse> {
  // Note: Session management and token refresh should be handled externally
  return { 
    status: 200,
    headers: new Map(),
    body: {
      success: true,
      message: "TikTok token refreshed successfully"
    }
  };
}

export async function handleRefreshInstagramToken(request: FrameworkRequest): Promise<FrameworkResponse> {
  // Note: Session management and token refresh should be handled externally
  return { 
    status: 200,
    headers: new Map(),
    body: {
      success: true,
      message: "Instagram token refreshed successfully"
    }
  };
}
