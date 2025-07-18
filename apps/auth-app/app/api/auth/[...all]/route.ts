import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  // For development/demo purposes, provide basic auth endpoints
  // In production, this would be handled by BetterAuth
  
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  if (pathname.includes('/session')) {
    return NextResponse.json({
      data: {
        user: null,
        session: null,
      }
    });
  }
  
  if (pathname.includes('/signin')) {
    return NextResponse.json({
      message: 'Sign in endpoint - use social OAuth buttons on login page'
    });
  }
  
  return NextResponse.json({
    message: 'Auth endpoint available',
    timestamp: new Date().toISOString(),
  });
}

export async function POST(request: NextRequest) {
  // For development/demo purposes, provide basic auth endpoints
  // In production, this would be handled by BetterAuth
  
  const url = new URL(request.url);
  const pathname = url.pathname;
  
  if (pathname.includes('/signout')) {
    return NextResponse.json({
      success: true,
      message: 'Signed out successfully'
    });
  }
  
  return NextResponse.json({
    message: 'Auth POST endpoint available',
    timestamp: new Date().toISOString(),
  });
}