import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { campaigns, campaignApplications, users } from '@repo/database/schemas';
import { eq, and, desc, notInArray, isNull, or, lt, gt } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';
import { CampaignService } from '@repo/utils';

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
    const offset = (page - 1) * limit;

    // Get campaigns that are active and the promoter hasn't applied to yet
    const existingApplications = await db
      .select({ campaignId: campaignApplications.campaignId })
      .from(campaignApplications)
      .where(eq(campaignApplications.promoterId, session.user.id));

    const appliedCampaignIds = existingApplications.map(app => app.campaignId);

    // Build query conditions
    const conditions = [
      eq(campaigns.status, 'active'),
      // Campaign should be within date range or have no date restrictions
      or(
        isNull(campaigns.startDate),
        lt(campaigns.startDate, new Date())
      ),
      or(
        isNull(campaigns.endDate),
        gt(campaigns.endDate, new Date())
      )
    ];

    // Exclude campaigns the promoter has already applied to
    if (appliedCampaignIds.length > 0) {
      conditions.push(notInArray(campaigns.id, appliedCampaignIds));
    }

    const availableCampaigns = await db
      .select({
        campaign: campaigns,
        creator: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(campaigns)
      .innerJoin(users, eq(campaigns.creatorId, users.id))
      .where(and(...conditions))
      .orderBy(desc(campaigns.createdAt))
      .limit(limit)
      .offset(offset);

    // Calculate campaign progress for each campaign
    const campaignsWithProgress = availableCampaigns.map(({ campaign, creator }) => {
      const progress = CampaignService.calculateCampaignProgress({
        budget: parseFloat(campaign.budget),
        ratePerView: parseFloat(campaign.ratePerView)
      });

      return {
        ...campaign,
        creator,
        progress,
        isActive: CampaignService.isCampaignActive({
          status: campaign.status,
          startDate: campaign.startDate,
          endDate: campaign.endDate
        })
      };
    });

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: campaigns.id })
      .from(campaigns)
      .where(and(...conditions));

    const totalCount = totalCountResult.length;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      campaigns: campaignsWithProgress,
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