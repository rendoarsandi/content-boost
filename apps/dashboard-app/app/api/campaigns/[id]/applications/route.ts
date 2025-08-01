import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { auth } from '@repo/auth/server-only';

// GET /api/campaigns/[id]/applications - List applications for a campaign (creators only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can view applications for their campaigns
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can view campaign applications' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;

    // Check if campaign exists and user owns it
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        creatorId: session.user.id
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get promotions (applications) for this campaign
    const promotions = await db.promotion.findMany({
      where: {
        campaignId
      },
      include: {
        promoter: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await db.promotion.count({
      where: {
        campaignId
      }
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      promotions,
      campaign: {
        id: campaign.id,
        name: campaign.name,
        budget: campaign.budget,
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching campaign applications:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}