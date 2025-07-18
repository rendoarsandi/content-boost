import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    // For development/demo purposes, simulate social account status
    // In production, this would validate session and fetch real account status
    
    // Mock connected accounts data
    const connectedAccounts = [
      {
        platform: 'tiktok',
        username: '@demo_user',
        connected: true,
        expired: false,
        lastSync: new Date().toISOString(),
        tokenExpiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
      },
      {
        platform: 'instagram',
        username: '@demo_user_ig',
        connected: true,
        expired: false,
        lastSync: new Date().toISOString(),
        tokenExpiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString(), // 60 days
      },
    ];
    
    const tokenStatus = {
      tiktok: { valid: true, expiresIn: 30 * 24 * 60 * 60 * 1000 },
      instagram: { valid: true, expiresIn: 60 * 24 * 60 * 60 * 1000 },
    };
    
    const availablePlatforms = ["tiktok", "instagram"];
    const validation = { valid: true, issues: [] };

    return NextResponse.json({
      success: true,
      data: {
        connectedAccounts,
        tokenStatus,
        availablePlatforms,
        validation,
        summary: {
          totalConnected: connectedAccounts.length,
          expiredTokens: connectedAccounts.filter(acc => acc.expired).length,
          validTokens: connectedAccounts.filter(acc => !acc.expired).length,
        },
      },
    });
  } catch (error) {
    console.error("Error fetching social account status:", error);
    return NextResponse.json(
      { error: "Failed to fetch social account status" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // For development/demo purposes, simulate social account actions
    // In production, this would validate session and perform real actions
    
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case "refresh_tokens":
        // Mock token refresh
        const refreshedTokens = [
          { platform: 'tiktok', success: true, expiresIn: 30 * 24 * 60 * 60 * 1000 },
          { platform: 'instagram', success: true, expiresIn: 60 * 24 * 60 * 60 * 1000 },
        ];
        
        return NextResponse.json({
          success: true,
          data: refreshedTokens,
        });

      case "validate_tokens":
        // Mock token validation
        const validation = { 
          valid: true, 
          issues: [],
          details: {
            tiktok: { valid: true, expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) },
            instagram: { valid: true, expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) },
          }
        };
        
        return NextResponse.json({
          success: true,
          data: validation,
        });

      default:
        return NextResponse.json(
          { error: "Invalid action" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error("Error processing social account action:", error);
    return NextResponse.json(
      { error: "Failed to process action" },
      { status: 500 }
    );
  }
}