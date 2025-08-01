import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, viewRecords } from '@repo/database';
// import { eq, and, sum, count } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';

// GET /api/campaigns/[id]/metrics - Get real-time campaign metrics
export async function GET(
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

    // Only creators can view campaign metrics
    if ((session.user as any).role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can view campaign metrics' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;

    // Verify campaign ownership
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(and(eq(campaigns.id, campaignId), eq(campaigns.creatorId, (session.user as any).id)));

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Get total views metrics
    const viewMetrics = await db
      .select({
        totalViews: sum(viewRecords.viewCount),
        legitimateViews: count(viewRecords.id),
      })
      .from(viewRecords)
      .where(eq(viewRecords.campaignId, campaignId));

    // Get legitimate views count
    const legitimateViewMetrics = await db
      .select({
        legitimateViews: count(viewRecords.id),
      })
      .from(viewRecords)
      .where(
        and(
          eq(viewRecords.campaignId, campaignId),
          eq(viewRecords.isLegitimate, true)
        )
      );

    // Get bot views count
    const botViewMetrics = await db
      .select({
        botViews: count(viewRecords.id),
      })
      .from(viewRecords)
      .where(
        and(
          eq(viewRecords.campaignId, campaignId),
          eq(viewRecords.isLegitimate, false)
        )
      );

    // Get active promoters count
    const activePromoters = await db
      .select({
        count: count(campaignApplications.id),
      })
      .from(campaignApplications)
      .where(
        and(
          eq(campaignApplications.campaignId, campaignId),
          eq(campaignApplications.status, 'approved')
        )
      );

    const totalViews = Number(viewMetrics[0]?.totalViews || 0);
    const legitimateViews = Number(legitimateViewMetrics[0]?.legitimateViews || 0);
    const botViews = Number(botViewMetrics[0]?.botViews || 0);
    const activePromotersCount = Number(activePromoters[0]?.count || 0);
    const ratePerView = Number(campaign.ratePerView);
    const estimatedSpent = legitimateViews * ratePerView;

    const metrics = {
      totalViews,
      legitimateViews,
      botViews,
      activePromoters: activePromotersCount,
      estimatedSpent,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json({ metrics });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}