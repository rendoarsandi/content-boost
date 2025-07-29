import { NextRequest, NextResponse } from 'next/server';
import { createAuthMiddleware } from '@repo/auth';
import { toFrameworkRequest, toNextResponse } from './utils/auth-adapter';
import { loggingMiddleware } from '@repo/utils/middleware/logging';

const authMiddleware = createAuthMiddleware();

export async function middleware(request: NextRequest) {
  // Apply logging middleware first
  const loggingResponse = await loggingMiddleware(request, 'auth-app');
  if (loggingResponse.status !== 200) {
    return loggingResponse;
  }

  // Convert NextRequest to FrameworkRequest
  const frameworkRequest = toFrameworkRequest(request);

  // Apply auth middleware
  const frameworkResponse = await authMiddleware(frameworkRequest);

  // Convert FrameworkResponse to NextResponse
  const response = toNextResponse(frameworkResponse);

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
