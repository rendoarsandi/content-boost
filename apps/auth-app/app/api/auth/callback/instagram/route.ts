import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const callbackUrl = searchParams.get('callbackUrl') || 'https://dashboard.domain.com';
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    
    if (!code) {
      return NextResponse.redirect(
        new URL('/login?error=missing_authorization_code', request.nextUrl.origin)
      );
    }

    // For development/demo purposes, simulate successful OAuth
    // In production, this would:
    // 1. Exchange code for access token with Instagram API
    // 2. Get user info from Instagram API
    // 3. Store user and social account in database
    
    const mockInstagramUser = {
      id: 'instagram_user_123',
      name: 'Instagram User',
      email: 'user@instagram.example.com',
      role: 'promoter',
    };

    // For now, redirect to onboarding with mock user data
    return NextResponse.redirect(
      new URL(`/onboarding?callbackUrl=${encodeURIComponent(callbackUrl)}&provider=instagram&userId=${mockInstagramUser.id}`, request.nextUrl.origin)
    );
  } catch (error) {
    console.error('Instagram OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/error?error=oauth_callback_failed', request.nextUrl.origin)
    );
  }
}