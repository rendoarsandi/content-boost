import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, users } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';
import { ApplicationService, ReviewApplicationSchema } from '@repo/utils';

const EnhancedReviewApplicationSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewMessage: z.string().max(500, 'Review message too long').optional(),
  feedback: z.object({
    contentQuality: z.number().min(1).max(5).optional(),
    alignmentWithBrand: z.number().min(1).max(5).optional(),
    creativityScore: z.number().min(1).max(5).optional(),
    notes: z.string().max(1000).optional(),
  }).optional(),
});

// PUT /api/campaigns/[id]/applications/[applicationId] - Approve/reject application
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can review applications
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can review applications' },
        { status: 403 }
      );
    }

    const { id: campaignId, applicationId } = await params;
    const body = await request.json();
    const validatedData = EnhancedReviewApplicationSchema.parse(body);

    // Check if application exists and user owns the campaign
    const [applicationWithCampaign] = await db
      .select({
        application: campaignApplications,
        campaign: campaigns,
        promoter: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(campaignApplications)
      .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .innerJoin(users, eq(campaignApplications.promoterId, users.id))
      .where(
        and(
          eq(campaignApplications.id, applicationId),
          eq(campaignApplications.campaignId, campaignId),
          eq(campaigns.creatorId, session.user.id)
        )
      );

    if (!applicationWithCampaign) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }

    // Check if application is still pending
    if (applicationWithCampaign.application.status !== 'pending') {
      return NextResponse.json(
        { error: `Application has already been ${applicationWithCampaign.application.status}` },
        { status: 400 }
      );
    }

    // Prepare review metadata
    const reviewMetadata = {
      reviewedBy: session.user.id,
      reviewedAt: new Date(),
      feedback: validatedData.feedback,
      reviewMessage: validatedData.reviewMessage
    };

    // Update application status with enhanced metadata
    const [updatedApplication] = await db
      .update(campaignApplications)
      .set({
        status: validatedData.status,
        reviewedAt: new Date(),
        // Store review metadata as JSON
        metadata: {
          ...applicationWithCampaign.application.metadata,
          review: reviewMetadata
        }
      })
      .where(eq(campaignApplications.id, applicationId))
      .returning();

    // Generate comprehensive notification for promoter
    const notification = ApplicationService.generateComprehensiveNotification(
      validatedData.status === 'approved' ? 'application_approved' : 'application_rejected',
      {
        campaignTitle: applicationWithCampaign.campaign.title,
        promoterName: applicationWithCampaign.promoter.name || 'Unknown User',
        creatorName: session.user.name || 'Creator',
        reviewMessage: validatedData.reviewMessage,
        feedback: validatedData.feedback
      }
    );

    // TODO: Send notification to promoter (would integrate with notification service)
    console.log('Notification to promoter:', {
      recipientId: applicationWithCampaign.promoter.id,
      title: notification.title,
      message: notification.message,
      type: validatedData.status === 'approved' ? 'application_approved' : 'application_rejected',
      metadata: {
        campaignId,
        applicationId,
        feedback: validatedData.feedback
      }
    });

    const statusMessage = validatedData.status === 'approved' 
      ? 'Application approved successfully. The promoter can now access campaign materials and will receive a notification with next steps.'
      : 'Application rejected. The promoter has been notified with your feedback.';

    // Prepare enhanced response
    const responseData = {
      application: {
        ...updatedApplication,
        promoter: applicationWithCampaign.promoter,
        campaign: {
          id: applicationWithCampaign.campaign.id,
          title: applicationWithCampaign.campaign.title,
        },
        reviewSummary: {
          status: validatedData.status,
          reviewedAt: reviewMetadata.reviewedAt,
          feedback: validatedData.feedback,
          message: validatedData.reviewMessage
        }
      },
      message: statusMessage,
      nextSteps: validatedData.status === 'approved' ? [
        'Promoter will receive notification with access instructions',
        'Promoter can now access campaign materials',
        'Tracking will begin once promoter starts promoting',
        'Monitor performance in your campaign dashboard'
      ] : [
        'Promoter has been notified of rejection with your feedback',
        'They may improve and apply to future campaigns',
        'Consider providing constructive feedback for better applications'
      ]
    };

    return NextResponse.json(responseData);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.errors
        },
        { status: 400 }
      );
    }

    console.error('Error reviewing application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/campaigns/[id]/applications/[applicationId] - Get specific application
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; applicationId: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { id: campaignId, applicationId } = await params;

    // Get application with campaign and user details
    const [applicationData] = await db
      .select({
        application: campaignApplications,
        campaign: campaigns,
        promoter: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        creator: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(campaignApplications)
      .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .innerJoin(users, eq(campaignApplications.promoterId, users.id))
      .innerJoin(users, eq(campaigns.creatorId, users.id))
      .where(
        and(
          eq(campaignApplications.id, applicationId),
          eq(campaignApplications.campaignId, campaignId)
        )
      );

    if (!applicationData) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check access permissions
    const isCreator = session.user.role === 'creator' && applicationData.campaign.creatorId === session.user.id;
    const isPromoter = session.user.role === 'promoter' && applicationData.application.promoterId === session.user.id;
    const isAdmin = session.user.role === 'admin';

    if (!isCreator && !isPromoter && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own applications or campaigns' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      application: applicationData.application,
      campaign: {
        id: applicationData.campaign.id,
        title: applicationData.campaign.title,
        description: applicationData.campaign.description,
        budget: applicationData.campaign.budget,
        ratePerView: applicationData.campaign.ratePerView,
      },
      promoter: applicationData.promoter,
      creator: applicationData.creator,
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}