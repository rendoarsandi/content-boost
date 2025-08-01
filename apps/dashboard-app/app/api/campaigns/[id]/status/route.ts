import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { getSession } from '@repo/auth/server-only';

// PATCH /api/campaigns/[id]/status - Since Campaign model has no status field, this endpoint returns campaign info
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can access campaign status
    if ((session.user as any).role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can access campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        creatorId: (session.user as any).id
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Since we don't have status field, just return campaign info
    return NextResponse.json({
      campaign,
      message: 'Campaign is active by default',
    });
  } catch (error) {
    console.error('Error accessing campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}