import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    if (!['tiktok', 'instagram'].includes(provider)) {
      return NextResponse.json({ error: 'Invalid provider' }, { status: 400 });
    }

    // For development/demo purposes, simulate social account connection
    // In production, this would:
    // 1. Validate user session
    // 2. Redirect to OAuth provider
    // 3. Handle callback and store tokens

    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const authUrl = `${baseUrl}/api/auth/callback/${provider}?code=mock_code&state=connect`;

    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error(`Error connecting account:`, error);
    return NextResponse.json(
      { error: 'Failed to connect account' },
      { status: 500 }
    );
  }
}
