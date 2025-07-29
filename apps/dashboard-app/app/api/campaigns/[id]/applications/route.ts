import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, users } from '@repo/database';
// import { eq, and, desc } from 'drizzle-orm';
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
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(campaigns.creatorId, session.user.id)
        )
      );

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // pending, approved, rejected
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = (page - 1) * limit;

    // Build query conditions
    const conditions = [eq(campaignApplications.campaignId, campaignId)];
    
    if (status && ['pending', 'approved', 'rejected'].includes(status)) {
      conditions.push(eq(campaignApplications.status, status as any));
    }

    // Get applications with promoter details
    const applications = await db
      .select({
        application: campaignApplications,
        promoter: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(campaignApplications)
      .innerJoin(users, eq(campaignApplications.promoterId, users.id))
      .where(conditions.length > 1 ? and(...conditions) : conditions[0])
      .orderBy(desc(campaignApplications.appliedAt))
      .limit(limit)
      .offset(offset);

    // Get total count for pagination
    const totalCountResult = await db
      .select({ count: campaignApplications.id })
      .from(campaignApplications)
      .where(conditions.length > 1 ? and(...conditions) : conditions[0]);

    const totalCount = totalCountResult.length;
    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      applications,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
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