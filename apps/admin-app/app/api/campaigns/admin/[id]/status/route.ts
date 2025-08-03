import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const { status } = await request.json();

    if (!['draft', 'active', 'paused', 'completed'].includes(status)) {
      return NextResponse.json(
        { message: 'Invalid status' },
        { status: 400 }
      );
    }

    // TODO: Add status field to Campaign model in Prisma schema
    // For now, just log the operation
    console.log(`Campaign ${campaignId} status change to ${status} requested by admin`);

    return NextResponse.json({ 
      message: 'Campaign status update acknowledged (stubbed)' 
    });
  } catch (error) {
    console.error('Update campaign status error:', error);
    return NextResponse.json(
      { message: 'Failed to update campaign status' },
      { status: 500 }
    );
  }
}