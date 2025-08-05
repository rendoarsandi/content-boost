import { NextRequest, NextResponse } from 'next/server';
import { handleTikTokAuth } from '@repo/auth';
import {
  toFrameworkRequest,
  toNextResponse,
} from '../../../../../utils/auth-adapter';

export async function GET(request: NextRequest) {
  const frameworkRequest = toFrameworkRequest(request);
  const frameworkResponse = await handleTikTokAuth(frameworkRequest);
  return toNextResponse(frameworkResponse);
}
