import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // For development/demo purposes, simulate social accounts fetching
    // In production, this would:
    // 1. Validate user session
    // 2. Fetch social accounts from database
    // 3. Return formatted account data

    // Mock social accounts data
    const accounts = [
      {
        id: 'account_1',
        provider: 'tiktok',
        platformUserId: 'tiktok_user_123',
        username: '@demo_user',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000
        ).toISOString(), // 30 days
        isActive: true,
      },
      {
        id: 'account_2',
        provider: 'instagram',
        platformUserId: 'instagram_user_123',
        username: '@demo_user_ig',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(
          Date.now() + 60 * 24 * 60 * 60 * 1000
        ).toISOString(), // 60 days
        isActive: true,
      },
    ];

    return NextResponse.json({
      success: true,
      data: accounts,
    });
  } catch (error) {
    console.error('Error fetching social accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch social accounts' },
      { status: 500 }
    );
  }
}
