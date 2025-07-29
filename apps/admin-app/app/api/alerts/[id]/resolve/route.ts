import { NextRequest, NextResponse } from 'next/server';
import { resolveAlert } from '@repo/utils/alerting';

/**
 * Resolve alert API endpoint
 * POST /api/alerts/[id]/resolve
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: alertId } = await params;
  const alert = resolveAlert(alertId);
  
  if (!alert) {
    return NextResponse.json(
      { error: 'Alert not found' },
      { status: 404 }
    );
  }
  
  return NextResponse.json({ alert });
}