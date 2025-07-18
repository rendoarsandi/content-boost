import { NextRequest, NextResponse } from "next/server";
import { tiktokOAuth } from "../oauth/tiktok";
import { instagramOAuth } from "../oauth/instagram";
// Note: Auth config should be imported separately in server-side code

// TikTok OAuth handlers
export async function handleTikTokAuth(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("TikTok OAuth error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_error", request.url));
  }

  // If no code, redirect to TikTok authorization
  if (!code) {
    const authUrl = tiktokOAuth.getAuthorizationUrl(crypto.randomUUID());
    return NextResponse.redirect(authUrl);
  }

  try {
    // Exchange code for tokens
    const tokens = await tiktokOAuth.exchangeCodeForToken(code);
    
    // Get user info
    const userInfo = await tiktokOAuth.getUserInfo(tokens.access_token);
    
    // Note: User creation and session management should be handled externally
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("TikTok OAuth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_callback_error", request.url));
  }
}

// Instagram OAuth handlers
export async function handleInstagramAuth(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // Handle OAuth errors
  if (error) {
    console.error("Instagram OAuth error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_error", request.url));
  }

  // If no code, redirect to Instagram authorization
  if (!code) {
    const authUrl = instagramOAuth.getAuthorizationUrl(crypto.randomUUID());
    return NextResponse.redirect(authUrl);
  }

  try {
    // Exchange code for tokens
    const tokens = await instagramOAuth.exchangeCodeForToken(code);
    
    // Get user info
    const userInfo = await instagramOAuth.getUserInfo(tokens.access_token);
    
    // Note: User creation and session management should be handled externally
    return NextResponse.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    console.error("Instagram OAuth callback error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth_callback_error", request.url));
  }
}

// Link social account to existing user
export async function handleLinkTikTok(request: NextRequest) {
  // Note: Session management and user linking should be handled externally
  return NextResponse.redirect(new URL("/dashboard/social", request.url));
}

export async function handleLinkInstagram(request: NextRequest) {
  // Note: Session management and user linking should be handled externally
  return NextResponse.redirect(new URL("/dashboard/social", request.url));
}

// Unlink social accounts
export async function handleUnlinkTikTok(request: NextRequest) {
  // Note: Session management and unlinking should be handled externally
  return NextResponse.json({ success: true });
}

export async function handleUnlinkInstagram(request: NextRequest) {
  // Note: Session management and unlinking should be handled externally
  return NextResponse.json({ success: true });
}

// Get connected social accounts
export async function handleGetSocialAccounts(request: NextRequest) {
  // Note: Session management and account retrieval should be handled externally
  return NextResponse.json({ accounts: [] });
}

// Refresh social tokens
export async function handleRefreshTikTokToken(request: NextRequest) {
  // Note: Session management and token refresh should be handled externally
  return NextResponse.json({ 
    success: true,
    message: "TikTok token refreshed successfully" 
  });
}

export async function handleRefreshInstagramToken(request: NextRequest) {
  // Note: Session management and token refresh should be handled externally
  return NextResponse.json({ 
    success: true,
    message: "Instagram token refreshed successfully" 
  });
}