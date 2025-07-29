import { NextRequest, NextResponse } from 'next/server';
import { FrameworkRequest, FrameworkResponse } from '@repo/auth';

export function toFrameworkRequest(nextRequest: NextRequest): FrameworkRequest {
  return {
    url: nextRequest.url,
    method: nextRequest.method,
    headers: new Map(nextRequest.headers.entries()),
    json: nextRequest.json ? () => nextRequest.json() : undefined,
    text: nextRequest.text ? () => nextRequest.text() : undefined,
    arrayBuffer: nextRequest.arrayBuffer ? () => nextRequest.arrayBuffer() : undefined,
    blob: nextRequest.blob ? () => nextRequest.blob() : undefined,
    formData: nextRequest.formData ? () => nextRequest.formData() : undefined,
  };
}

export function toNextResponse(frameworkResponse: FrameworkResponse): NextResponse {
  const response = new NextResponse(frameworkResponse.body ? JSON.stringify(frameworkResponse.body) : null, {
    status: frameworkResponse.status,
    headers: frameworkResponse.headers ? Object.fromEntries(frameworkResponse.headers) : undefined,
  });

  if (frameworkResponse.redirect) {
    response.headers.set('Location', frameworkResponse.redirect);
    return response;
  }

  return response;
}
