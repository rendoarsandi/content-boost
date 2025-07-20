import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  // Check if user is authenticated and has admin role
  const token = request.cookies.get('auth-token');
  
  if (!token) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // For now, we'll implement basic token validation
  // In production, this should validate the JWT and check admin role
  try {
    // TODO: Implement proper JWT validation and admin role check
    // const payload = await verifyJWT(token.value);
    // if (payload.role !== 'admin') {
    //   return NextResponse.redirect(new URL('/unauthorized', request.url));
    // }
  } catch (error) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|login|unauthorized).*)',
  ],
};