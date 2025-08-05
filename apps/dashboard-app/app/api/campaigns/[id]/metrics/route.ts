import { NextRequest, NextResponse } from 'next/server';

// GET /api/campaigns/[id]/metrics - Simplified metrics endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    return NextResponse.json({
      campaignId,
      metrics: {
        totalViews: 12500,
        totalEarnings: 125000,
        totalApplications: 45,
        approvedApplications: 32,
        rejectedApplications: 8,
        pendingApplications: 5,
        averageEngagementRate: 3.2,
        topPerformingContent: [
          {
            id: 'content-1',
            title: 'Sample Content 1',
            views: 5000,
            earnings: 50000,
          },
          {
            id: 'content-2',
            title: 'Sample Content 2',
            views: 3500,
            earnings: 35000,
          },
        ],
        dailyStats: [
          { date: '2024-01-01', views: 1200, earnings: 12000 },
          { date: '2024-01-02', views: 1500, earnings: 15000 },
          { date: '2024-01-03', views: 1800, earnings: 18000 },
        ],
      },
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching campaign metrics:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
