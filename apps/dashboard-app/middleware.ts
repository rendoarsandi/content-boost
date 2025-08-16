import { NextRequest, NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const start = Date.now();
  const response = NextResponse.next();

  response.headers.set('x-app-name', 'dashboard-app');

  // Log request details
  console.log(
    `[dashboard-app] ${request.method} ${request.url} - ${Date.now() - start}ms`
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
