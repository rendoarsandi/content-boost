import { NextRequest, NextResponse } from 'next/server';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, campaignMaterials } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';
import { ApplicationService } from '@repo/utils';

// GET /api/campaigns/[id]/materials-access - Get campaign materials for approved promoters
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only promoters can access campaign materials
    if (session.user.role !== 'promoter') {
      return NextResponse.json(
        { error: 'Forbidden - Only promoters can access campaign materials' },
        { status: 403 }
      );
    }

    const campaignId = params.id;

    // Check if promoter has an approved application for this campaign
    const [application] = await db
      .select({
        application: campaignApplications,
        campaign: campaigns,
      })
      .from(campaignApplications)
      .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .where(
        and(
          eq(campaignApplications.campaignId, campaignId),
          eq(campaignApplications.promoterId, session.user.id),
          eq(campaignApplications.status, 'approved')
        )
      );

    if (!application) {
      return NextResponse.json(
        { error: 'Access denied - You must have an approved application to access campaign materials' },
        { status: 403 }
      );
    }

    // Check if campaign is still active
    if (application.campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is no longer active' },
        { status: 400 }
      );
    }

    // Get campaign materials
    const materials = await db
      .select()
      .from(campaignMaterials)
      .where(eq(campaignMaterials.campaignId, campaignId));

    // Get campaign details (without sensitive creator information)
    const campaignDetails = {
      id: application.campaign.id,
      title: application.campaign.title,
      description: application.campaign.description,
      ratePerView: application.campaign.ratePerView,
      requirements: application.campaign.requirements,
      startDate: application.campaign.startDate,
      endDate: application.campaign.endDate,
    };

    // Log materials access for analytics
    console.log('Materials accessed:', {
      campaignId,
      promoterId: session.user.id,
      accessedAt: new Date(),
      materialsCount: materials.length
    });

    // Generate notification for creator about materials access
    // TODO: This would integrate with a notification service
    console.log('Notification to creator:', {
      recipientId: application.campaign.creatorId,
      title: 'Campaign Materials Accessed',
      message: `${session.user.name} has accessed the materials for campaign "${application.campaign.title}". They can now start creating promotional content.`,
      type: 'materials_accessed',
      metadata: {
        campaignId,
        promoterId: session.user.id,
        materialsCount: materials.length
      }
    });

    // Decode tracking link to provide additional context
    const trackingInfo = ApplicationService.decodeEnhancedTrackingLink(application.application.trackingLink);

    return NextResponse.json({
      campaign: campaignDetails,
      materials,
      application: {
        id: application.application.id,
        trackingLink: application.application.trackingLink,
        appliedAt: application.application.appliedAt,
        reviewedAt: application.application.reviewedAt,
        trackingInfo: trackingInfo.error ? null : trackingInfo
      },
      guidelines: {
        contentCreation: [
          'Use the provided materials as inspiration, but create original content',
          'Include your tracking link in your bio or content description',
          'Follow platform-specific best practices for engagement',
          'Maintain authenticity while promoting the campaign'
        ],
        tracking: [
          'Your unique tracking link will monitor views and engagement',
          'Views are counted automatically through social media APIs',
          'Bot detection algorithms ensure fair payment calculation',
          'Check your dashboard regularly for performance updates'
        ],
        payment: [
          'Payments are calculated daily based on legitimate views',
          'Platform fee is deducted automatically',
          'Payments are processed within 24-48 hours',
          'You will receive notifications for all payment activities'
        ]
      },
      message: 'You can now download and edit these materials for your promotion. Make sure to use your tracking link when promoting the content.',
      nextSteps: [
        'Download and review all campaign materials',
        'Create engaging content using the materials as inspiration',
        'Include your tracking link in your content or bio',
        'Start promoting and monitor your performance in the dashboard'
      ]
    });
  } catch (error) {
    console.error('Error fetching campaign materials:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}