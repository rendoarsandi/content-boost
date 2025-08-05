import { FrameworkRequest, FrameworkResponse } from './types';

// Route protection middleware
export async function authMiddleware(
  request: FrameworkRequest
): Promise<FrameworkResponse> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Public routes that don't require authentication
  const publicRoutes = ['/', '/login', '/register', '/api/auth', '/api/health'];

  // Check if route is public
  const isPublicRoute = publicRoutes.some(
    route => pathname.startsWith(route) || pathname === route
  );

  if (isPublicRoute) {
    return { status: 200, headers: new Map() };
  }

  // For now, just allow all requests through
  // Authentication will be handled by individual API routes
  return { status: 200, headers: new Map() };
}

// Rate limiting middleware
export async function rateLimitMiddleware(
  request: FrameworkRequest
): Promise<FrameworkResponse> {
  const ip = request.headers['x-forwarded-for'] || 'unknown';
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Apply rate limiting to auth endpoints
  if (pathname.startsWith('/api/auth')) {
    // Implement rate limiting logic here
    // This could use Redis or in-memory storage

    const rateLimitKey = `rate_limit:${ip}:${pathname}`;
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10; // 10 requests per minute

    // For now, just log the request
    console.log(`Rate limit check for ${ip} on ${pathname}`);
  }

  return { status: 200, headers: new Map() };
}

// CSRF protection middleware
export async function csrfMiddleware(
  request: FrameworkRequest
): Promise<FrameworkResponse> {
  const url = new URL(request.url);
  const pathname = url.pathname;
  const method = request.method;

  // Apply CSRF protection to state-changing requests
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    if (pathname.startsWith('/api/auth')) {
      // BetterAuth handles CSRF protection internally
      return { status: 200, headers: new Map() };
    }

    // Check for CSRF token in other API routes
    const csrfToken = request.headers['x-csrf-token'];

    if (!csrfToken) {
      return {
        status: 403,
        body: { error: 'CSRF token missing' },
        headers: new Map(),
      };
    }

    // Validate CSRF token (implement your validation logic)
    // For now, just log
    console.log(`CSRF token check for ${pathname}: ${csrfToken}`);
  }

  return { status: 200, headers: new Map() };
}

// Combined middleware
export function createAuthMiddleware() {
  return async function middleware(
    request: FrameworkRequest
  ): Promise<FrameworkResponse> {
    // Apply rate limiting
    const rateLimitResponse = await rateLimitMiddleware(request);
    if (rateLimitResponse.status !== 200) {
      return rateLimitResponse;
    }

    // Apply CSRF protection
    const csrfResponse = await csrfMiddleware(request);
    if (csrfResponse.status !== 200) {
      return csrfResponse;
    }

    // Apply authentication
    return await authMiddleware(request);
  };
}
