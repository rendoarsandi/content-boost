import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // For development/demo purposes, simulate social profile fetching
    // In production, this would validate session and fetch real profiles
    
    // Mock profile data
    const profiles = [
      {
        platform: 'tiktok',
        username: '@demo_user',
        displayName: 'Demo User',
        followers: 12500,
        following: 450,
        posts: 89,
        verified: false,
        connected: true,
        lastSync: new Date().toISOString(),
      },
      {
        platform: 'instagram',
        username: '@demo_user_ig',
        displayName: 'Demo User IG',
        followers: 8900,
        following: 320,
        posts: 156,
        verified: true,
        connected: true,
        lastSync: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        profiles,
      },
    });
  } catch (error) {
    console.error("Error fetching social profiles:", error);
    return NextResponse.json(
      { error: "Failed to fetch social profiles" },
      { status: 500 }
    );
  }
}