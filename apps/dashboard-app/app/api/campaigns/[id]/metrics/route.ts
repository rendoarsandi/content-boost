import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
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

    // Verify campaign ownership and get metrics
    const campaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        creatorId: (session.user as any).id
      },
      include: {
        promotions: true,
        _count: {
          select: {
            promotions: true
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Calculate metrics from promotions
    const totalViews = campaign.promotions.reduce((sum, p) => sum + p.views, 0);
    const totalEarnings = campaign.promotions.reduce((sum, p) => sum + p.earnings, 0);
    const activePromotersCount = campaign._count.promotions;

    const metrics = {
      totalViews,
      totalEarnings,
      activePromoters: activePromotersCount,
      budget: campaign.budget,
      remainingBudget: campaign.budget - totalEarnings,
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