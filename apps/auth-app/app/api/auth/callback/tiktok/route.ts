import { NextRequest, NextResponse } from 'next/server';
import { handleTikTokAuth } from '@repo/auth';
import { toFrameworkRequest, toNextResponse } from '../../../../../utils/auth-adapter';

export async function GET(request: NextRequest) {
  const frameworkRequest = toFrameworkRequest(request);
  const frameworkResponse = await handleTikTokAuth(frameworkRequest);
  const response = toNextResponse(frameworkResponse);

  // If it's a redirect, ensure the URL is absolute
  if (frameworkResponse.redirect) {
    const redirectUrl = new URL(frameworkResponse.redirect, request.url);
    response.headers.set('Location', redirectUrl.toString());
  }

  return response;
}
