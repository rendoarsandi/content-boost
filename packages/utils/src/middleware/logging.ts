import { NextRequest, NextResponse } from 'next/server';

export async function loggingMiddleware(request: NextRequest, appName: string) {
  const start = Date.now();
  const response = NextResponse.next();

  response.headers.set('x-app-name', appName);

  // Log request details
  console.log(`[${appName}] ${request.method} ${request.url} - ${Date.now() - start}ms`);

  return response;
}
