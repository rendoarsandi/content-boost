import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { auth } from '@repo/auth/server-only';

// GET /api/campaigns/available - List available campaigns for promoters to apply
export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only promoters can view available campaigns
    if (session.user.role !== 'promoter') {
      return NextResponse.json(
        { error: 'Forbidden - Only promoters can view available campaigns' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const skip = (page - 1) * limit;

    // Get campaigns that the promoter hasn't applied to yet
    const existingPromotions = await db.promotion.findMany({
      where: {
        promoterId: session.user.id
      },
      select: {
        campaignId: true
      }
    });

    const appliedCampaignIds = existingPromotions.map(p => p.campaignId);

    // Get available campaigns
    const availableCampaigns = await db.campaign.findMany({
      where: {
        id: {
          notIn: appliedCampaignIds
        }
      },
      include: {
        creator: true,
        promotions: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await db.campaign.count({
      where: {
        id: {
          notIn: appliedCampaignIds
        }
      }
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      campaigns: availableCampaigns,
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
    console.error('Error fetching available campaigns:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}