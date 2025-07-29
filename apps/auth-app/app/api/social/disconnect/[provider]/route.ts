import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;
    
    if (!["tiktok", "instagram"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // For development/demo purposes, simulate social account disconnection
    // In production, this would:
    // 1. Validate user session
    // 2. Remove social account from database
    // 3. Revoke tokens with provider if needed

    console.log(`Mock disconnect: ${provider} account disconnected`);

    return NextResponse.json({ 
      success: true,
      message: `${provider} account disconnected successfully` 
    });
  } catch (error) {
    console.error(`Error disconnecting account:`, error);
    return NextResponse.json(
      { error: `Failed to disconnect account` },
      { status: 500 }
    );
  }
}