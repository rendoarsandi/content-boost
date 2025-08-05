import { NextRequest, NextResponse } from 'next/server';
import { FrameworkRequest, FrameworkResponse } from '@repo/auth';

export function toFrameworkRequest(nextRequest: NextRequest): FrameworkRequest {
  const headers: Record<string, string> = {};
  nextRequest.headers.forEach((value, key) => {
    headers[key] = value;
  });
  
  return {
    url: nextRequest.url,
    method: nextRequest.method,
    headers,
    body: undefined, // This could be populated if needed
  };
}

export function toNextResponse(
  frameworkResponse: FrameworkResponse
): NextResponse {
  const response = new NextResponse(
    frameworkResponse.body ? JSON.stringify(frameworkResponse.body) : null,
    {
      status: frameworkResponse.status,
      headers: frameworkResponse.headers
        ? Object.fromEntries(frameworkResponse.headers)
        : undefined,
    }
  );

  if (frameworkResponse.redirect) {
    response.headers.set('Location', frameworkResponse.redirect);
  }

  return response;
}
