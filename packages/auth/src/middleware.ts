import { NextRequest, NextResponse } from "next/server";

// Route protection middleware
export async function authMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Public routes that don't require authentication
  const publicRoutes = [
    "/",
    "/login",
    "/register",
    "/api/auth",
    "/api/health",
  ];
  
  // Check if route is public
  const isPublicRoute = publicRoutes.some(route => 
    pathname.startsWith(route) || pathname === route
  );
  
  if (isPublicRoute) {
    return NextResponse.next();
  }
  
  // For now, just allow all requests through
  // Authentication will be handled by individual API routes
  return NextResponse.next();
}

// Rate limiting middleware
export async function rateLimitMiddleware(request: NextRequest) {
  const ip = request.ip || request.headers.get("x-forwarded-for") || "unknown";
  const { pathname } = request.nextUrl;
  
  // Apply rate limiting to auth endpoints
  if (pathname.startsWith("/api/auth")) {
    // Implement rate limiting logic here
    // This could use Redis or in-memory storage
    
    const rateLimitKey = `rate_limit:${ip}:${pathname}`;
    const windowMs = 60 * 1000; // 1 minute
    const maxRequests = 10; // 10 requests per minute
    
    // For now, just log the request
    console.log(`Rate limit check for ${ip} on ${pathname}`);
  }
  
  return NextResponse.next();
}

// CSRF protection middleware
export async function csrfMiddleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const method = request.method;
  
  // Apply CSRF protection to state-changing requests
  if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
    if (pathname.startsWith("/api/auth")) {
      // BetterAuth handles CSRF protection internally
      return NextResponse.next();
    }
    
    // Check for CSRF token in other API routes
    const csrfToken = request.headers.get("x-csrf-token");
    
    if (!csrfToken) {
      return NextResponse.json(
        { error: "CSRF token missing" },
        { status: 403 }
      );
    }
    
    // Validate CSRF token (implement your validation logic)
    // For now, just log
    console.log(`CSRF token check for ${pathname}: ${csrfToken}`);
  }
  
  return NextResponse.next();
}

// Combined middleware
export function createAuthMiddleware() {
  return async function middleware(request: NextRequest) {
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

// Matcher configuration for Next.js middleware
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
};