import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { getSession } from '@repo/auth/server-only';

// GET /api/promoter/analytics - Get promoter analytics with bot detection insights
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can access analytics' },
        { status: 401 }
      );
    }

    const promoterId = (session.user as any).id;
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days
    const campaignId = searchParams.get('campaignId');

    // Calculate date range
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(period));

    // Get promoter's promotions with basic analytics
    const promotions = await db.campaignApplication.findMany({
      where: {
        promoterId,
        appliedAt: {
          gte: startDate,
        },
        ...(campaignId && { campaignId }),
      },
      include: {
        campaign: true,
        viewRecords: true,
        payouts: true,
      },
    });

    // Calculate basic analytics from promotions
    const totalViews = promotions.reduce((sum, p) => {
      const legitimateViews = p.viewRecords.reduce((viewSum, record) => 
        viewSum + (record.isLegitimate ? record.viewCount : 0), 0);
      return sum + legitimateViews;
    }, 0);
    const totalEarnings = promotions.reduce((sum, p) => {
      const earnings = p.payouts.reduce((payoutSum, payout) => payoutSum + payout.amount, 0);
      return sum + earnings;
    }, 0);
    const campaignCount = new Set(promotions.map(p => p.campaignId)).size;

    return NextResponse.json({
      period: parseInt(period),
      overview: {
        totalViews,
        totalEarnings,
        campaignCount,
        promotionsCount: promotions.length,
      },
      applications: promotions.map(promotion => {
        const legitimateViews = promotion.viewRecords.reduce((viewSum, record) => 
          viewSum + (record.isLegitimate ? record.viewCount : 0), 0);
        const earnings = promotion.payouts.reduce((payoutSum, payout) => payoutSum + payout.amount, 0);
        
        return {
          id: promotion.id,
          campaignId: promotion.campaignId,
          campaignName: promotion.campaign.title,
          campaignBudget: promotion.campaign.budget,
          views: legitimateViews,
          earnings: earnings,
          contentUrl: promotion.submittedContent,
          createdAt: promotion.appliedAt,
        };
      }),
      earnings: {
        total: totalEarnings,
        pending: 0, // Would need a payout tracking system
        completedPayouts: 0,
      },
    });
  } catch (error) {
    console.error('Error fetching promoter analytics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
