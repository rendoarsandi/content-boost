import { NextRequest } from 'next/server';
import { loggingMiddleware } from '@repo/utils/middleware/logging';

export async function middleware(request: NextRequest) {
  return loggingMiddleware(request, 'landing-page');
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
