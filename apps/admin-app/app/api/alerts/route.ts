import { NextRequest, NextResponse } from 'next/server';
import { getActiveAlerts, getAllAlerts, AlertCategory, AlertSeverity } from '@repo/utils';

/**
 * Get alerts API endpoint
 * GET /api/alerts
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category') as AlertCategory | undefined;
  const severity = url.searchParams.get('severity') as AlertSeverity | undefined;
  const showResolved = url.searchParams.get('showResolved') === 'true';
  
  const alerts = showResolved
    ? getAllAlerts(category, severity)
    : getActiveAlerts(category, severity);
  
  return NextResponse.json({ alerts });
}