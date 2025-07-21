import { NextResponse } from 'next/server';

/**
 * Health check endpoint for Railway deployment
 * GET /api/health
 */
export async function GET() {
  return NextResponse.json(
    { 
      status: 'ok',
      service: 'landing-page',
      timestamp: new Date().toISOString()
    },
    { status: 200 }
  );
}