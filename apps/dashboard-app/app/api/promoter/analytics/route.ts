import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@repo/auth/server-only';

// GET /api/promoter/analytics - Get promoter analytics
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const campaignId = searchParams.get('campaignId');
    const promoterId = (session.user as any).id;

    // Mock promotions data for demo purposes
    const mockPromotions = [
      {
        id: 'promotion-1',
        promoterId: promoterId,
        campaignId: 'campaign-1',
        appliedAt: new Date('2024-01-15').toISOString(),
        submittedContent: 'https://example.com/my-content',
        campaign: {
          id: 'campaign-1',
          title: 'Summer Product Launch',
          budget: 5000000,
        },
        viewRecords: [
          { viewCount: 1000, isLegitimate: true },
          { viewCount: 800, isLegitimate: true },
          { viewCount: 200, isLegitimate: false },
        ],
        payouts: [
          { amount: 150000, status: 'COMPLETED' },
          { amount: 80000, status: 'COMPLETED' },
        ],
      },
      {
        id: 'promotion-2',
        promoterId: promoterId,
        campaignId: 'campaign-2',
        appliedAt: new Date('2024-02-05').toISOString(),
        submittedContent: 'https://example.com/my-content-2',
        campaign: {
          id: 'campaign-2',
          title: 'Winter Holiday Sale',
          budget: 3000000,
        },
        viewRecords: [
          { viewCount: 1500, isLegitimate: true },
        ],
        payouts: [
          { amount: 180000, status: 'PENDING' },
        ],
      },
    ];

    // Filter by campaign if specified
    let filteredPromotions = mockPromotions.filter(p => p.promoterId === promoterId);
    if (campaignId) {
      filteredPromotions = filteredPromotions.filter(p => p.campaignId === campaignId);
    }

    // Calculate basic analytics from promotions
    const totalViews = filteredPromotions.reduce((sum, p) => {
      const legitimateViews = p.viewRecords.reduce(
        (viewSum, record) =>
          viewSum + (record.isLegitimate ? record.viewCount : 0),
        0
      );
      return sum + legitimateViews;
    }, 0);

    const totalEarnings = filteredPromotions.reduce((sum, p) => {
      const earnings = p.payouts.reduce(
        (payoutSum, payout) => payoutSum + payout.amount,
        0
      );
      return sum + earnings;
    }, 0);

    const campaignCount = new Set(filteredPromotions.map(p => p.campaignId)).size;

    return NextResponse.json({
      period: parseInt(period),
      overview: {
        totalViews,
        totalEarnings,
        campaignCount,
        promotionsCount: filteredPromotions.length,
      },
      applications: filteredPromotions.map(promotion => {
        const legitimateViews = promotion.viewRecords.reduce(
          (viewSum, record) =>
            viewSum + (record.isLegitimate ? record.viewCount : 0),
          0
        );
        const earnings = promotion.payouts.reduce(
          (payoutSum, payout) => payoutSum + payout.amount,
          0
        );

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
        pending: filteredPromotions.reduce((sum, p) => {
          const pendingAmount = p.payouts
            .filter(payout => payout.status === 'PENDING')
            .reduce((pendingSum, payout) => pendingSum + payout.amount, 0);
          return sum + pendingAmount;
        }, 0),
        completedPayouts: filteredPromotions.reduce((sum, p) => {
          const completedAmount = p.payouts
            .filter(payout => payout.status === 'COMPLETED')
            .reduce((completedSum, payout) => completedSum + payout.amount, 0);
          return sum + completedAmount;
        }, 0),
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