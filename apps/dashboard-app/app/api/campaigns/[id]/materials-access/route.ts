import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
import { auth } from '@repo/auth/server-only';

// GET /api/campaigns/[id]/materials-access - Get campaign materials for approved promoters
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only promoters can access campaign materials
    if (session.user.role !== 'promoter') {
      return NextResponse.json(
        { error: 'Forbidden - Only promoters can access campaign materials' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;

    // Check if promoter has a promotion for this campaign
    const promotion = await db.campaignApplication.findFirst({
      where: {
        campaignId,
        promoterId: session.user.id,
      },
      include: {
        campaign: {
          include: {
            creator: true,
          },
        },
        viewRecords: true,
        payouts: true,
      },
    });

    if (!promotion) {
      return NextResponse.json(
        {
          error:
            'Access denied - You must be part of this campaign to access materials',
        },
        { status: 403 }
      );
    }

    // Get campaign details (without sensitive creator information)
    const campaignDetails = {
      id: promotion.campaign.id,
      name: promotion.campaign.title,
      budget: promotion.campaign.budget,
    };

    // Log materials access for analytics
    console.log('Materials accessed:', {
      campaignId,
      promoterId: session.user.id,
      accessedAt: new Date(),
    });

    // Calculate metrics from related data
    const totalViews = promotion.viewRecords.reduce(
      (sum, record) => sum + record.viewCount,
      0
    );
    const legitimateViews = promotion.viewRecords.reduce(
      (sum, record) => sum + (record.isLegitimate ? record.viewCount : 0),
      0
    );
    const earnings = promotion.payouts.reduce(
      (sum, payout) => sum + payout.amount,
      0
    );

    return NextResponse.json({
      campaign: campaignDetails,
      promotion: {
        id: promotion.id,
        contentUrl: promotion.submittedContent,
        views: legitimateViews,
        earnings: earnings,
        createdAt: promotion.appliedAt,
      },
      guidelines: {
        contentCreation: [
          'Use the provided materials as inspiration, but create original content',
          'Include your tracking link in your bio or content description',
          'Follow platform-specific best practices for engagement',
          'Maintain authenticity while promoting the campaign',
        ],
        tracking: [
          'Your unique tracking link will monitor views and engagement',
          'Views are counted automatically through social media APIs',
          'Bot detection algorithms ensure fair payment calculation',
          'Check your dashboard regularly for performance updates',
        ],
        payment: [
          'Payments are calculated daily based on legitimate views',
          'Platform fee is deducted automatically',
          'Payments are processed within 24-48 hours',
          'You will receive notifications for all payment activities',
        ],
      },
      message:
        'You can now download and edit these materials for your promotion. Make sure to use your tracking link when promoting the content.',
      nextSteps: [
        'Download and review all campaign materials',
        'Create engaging content using the materials as inspiration',
        'Include your tracking link in your content or bio',
        'Start promoting and monitor your performance in the dashboard',
      ],
    });
  } catch (error) {
    console.error('Error fetching campaign materials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
