import { NextRequest, NextResponse } from "next/server";

export async function POST(
  request: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider } = params;
    
    if (!["tiktok", "instagram"].includes(provider)) {
      return NextResponse.json(
        { error: "Invalid provider" },
        { status: 400 }
      );
    }

    // For development/demo purposes, simulate account unlinking
    // In production, this would:
    // 1. Validate user session
    // 2. Remove social account from database
    // 3. Revoke tokens with provider if needed

    console.log(`Mock unlink: ${provider} account unlinked`);

    return NextResponse.json({ 
      success: true,
      message: `${provider} account unlinked successfully`
    });
  } catch (error) {
    console.error(`Error unlinking ${params.provider} account:`, error);
    return NextResponse.json(
      { error: `Failed to unlink ${params.provider} account` },
      { status: 500 }
    );
  }
}