import { NextRequest, NextResponse } from 'next/server';
import { appLogger } from '../logging';
import { performanceMonitor } from '../performance';
import * as Sentry from '@sentry/nextjs';

/**
 * Middleware for request logging and performance monitoring
 * @param request Next.js request
 * @param serviceName Service name for logging
 */
export async function loggingMiddleware(
  request: NextRequest,
  serviceName: string = 'app'
) {
  const requestId = crypto.randomUUID();
  const url = new URL(request.url);
  const startTime = Date.now();
  
  // Skip logging for static assets and health checks
  if (
    url.pathname.startsWith('/_next/') ||
    url.pathname.startsWith('/static/') ||
    url.pathname === '/api/health' ||
    url.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Start performance monitoring
  const operationName = `${request.method} ${url.pathname}`;
  performanceMonitor.startMeasure(operationName);

  // Log the request
  appLogger.info(`Request started: ${request.method} ${url.pathname}`, {
    requestId,
    method: request.method,
    path: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
    userAgent: request.headers.get('user-agent'),
    service: serviceName,
  });

  // Create a response
  const response = NextResponse.next();

  // Add headers for tracking
  response.headers.set('X-Request-ID', requestId);
  
  // End performance monitoring
  const duration = performanceMonitor.endMeasure(operationName);
  
  // Log the response
  appLogger.info(`Request completed: ${request.method} ${url.pathname}`, {
    requestId,
    method: request.method,
    path: url.pathname,
    durationMs: duration.toFixed(2),
    service: serviceName,
  });

  return response;
}

/**
 * Error handler middleware for API routes
 * @param error Error object
 * @param request Next.js request
 * @param response Next.js response
 */
export function errorHandler(error: Error, request: NextRequest, response: NextResponse) {
  const url = new URL(request.url);
  
  // Log the error
  appLogger.error(`API Error: ${error.message}`, {
    path: url.pathname,
    method: request.method,
    stack: error.stack,
  });

  // Capture in Sentry if available
  try {
    Sentry.captureException(error);
  } catch (e) {
    // Sentry might not be initialized
  }

  // Return error response
  return NextResponse.json(
    {
      error: {
        message: 'An unexpected error occurred',
        code: 'INTERNAL_SERVER_ERROR',
      },
    },
    { status: 500 }
  );
}