import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// import { campaigns, campaignApplications, users } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { auth } from '@repo/auth/server-only';
import { CampaignService } from '@repo/utils';
import { ApplicationService, ApplicationValidationSchema } from '@repo/utils';

const EnhancedApplicationSchema = z.object({
  submittedContent: z.string().min(10, 'Content description must be at least 10 characters').optional(),
  message: z.string().max(500, 'Message too long').optional(),
  proposedContent: z.object({
    platform: z.enum(['tiktok', 'instagram']),
    contentType: z.enum(['video', 'image', 'story', 'reel']),
    description: z.string().min(20, 'Content description must be at least 20 characters'),
    hashtags: z.array(z.string()).max(30, 'Maximum 30 hashtags allowed').optional(),
    estimatedReach: z.number().positive().optional(),
  }).optional(),
});

// POST /api/campaigns/[id]/apply - Apply to a campaign
export async function POST(
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

    // Only promoters can apply to campaigns
    if (session.user.role !== 'promoter') {
      return NextResponse.json(
        { error: 'Forbidden - Only promoters can apply to campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = EnhancedApplicationSchema.parse(body);

    // Check if campaign exists and is active
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if promoter has already applied
    const [existingApplication] = await db
      .select()
      .from(campaignApplications)
      .where(
        and(
          eq(campaignApplications.campaignId, campaignId),
          eq(campaignApplications.promoterId, session.user.id)
        )
      );

    // Validate application eligibility
    const eligibilityCheck = ApplicationService.validateApplicationEligibility(
      {
        status: campaign.status,
        startDate: campaign.startDate,
        endDate: campaign.endDate
      },
      existingApplication
    );

    if (!eligibilityCheck.valid) {
      return NextResponse.json(
        { error: eligibilityCheck.error },
        { status: 400 }
      );
    }

    // Validate proposed content against campaign requirements
    if (validatedData.proposedContent && campaign.requirements) {
      const contentValidation = ApplicationService.validateProposedContent(
        validatedData.proposedContent,
        campaign.requirements as string[]
      );

      if (!contentValidation.valid) {
        return NextResponse.json(
          { 
            error: 'Proposed content does not meet campaign requirements',
            issues: contentValidation.issues
          },
          { status: 400 }
        );
      }
    }

    // Validate promoter requirements (mock data for now - would come from user profile)
    const mockPromoterProfile = {
      socialAccounts: [
        { platform: 'tiktok', verified: true },
        { platform: 'instagram', verified: true }
      ],
      followerCount: 5000,
      engagementRate: 3.5
    };

    const requirementValidation = ApplicationService.validatePromoterRequirements(
      campaign.requirements as string[] || [],
      mockPromoterProfile
    );

    if (!requirementValidation.valid) {
      return NextResponse.json(
        { 
          error: 'You do not meet the campaign requirements',
          missingRequirements: requirementValidation.missingRequirements
        },
        { status: 400 }
      );
    }

    // Generate enhanced tracking link with metadata
    const trackingMetadata = validatedData.proposedContent ? {
      platform: validatedData.proposedContent.platform,
      contentType: validatedData.proposedContent.contentType,
      expectedReach: validatedData.proposedContent.estimatedReach
    } : undefined;

    const trackingLink = ApplicationService.generateEnhancedTrackingLink(
      campaignId, 
      session.user.id,
      trackingMetadata
    );

    // Calculate application score for internal use
    const applicationScore = ApplicationService.calculateApplicationScore({
      proposedContent: validatedData.proposedContent,
      promoterProfile: {
        followerCount: mockPromoterProfile.followerCount,
        engagementRate: mockPromoterProfile.engagementRate,
        previousCampaigns: 0, // Would come from database
        successRate: 0 // Would come from database
      },
      campaignRequirements: campaign.requirements as string[] || []
    });

    // Create application with enhanced data
    const applicationData = {
      campaignId,
      promoterId: session.user.id,
      status: 'pending' as const,
      submittedContent: validatedData.submittedContent,
      trackingLink,
      appliedAt: new Date(),
      // Store proposed content and metadata as JSON
      metadata: {
        proposedContent: validatedData.proposedContent,
        applicationScore: applicationScore.score,
        scoreBreakdown: applicationScore.breakdown,
        message: validatedData.message
      }
    };

    const [newApplication] = await db
      .insert(campaignApplications)
      .values(applicationData)
      .returning();

    // Get campaign details with creator info for response and notification
    const [campaignWithCreator] = await db
      .select({
        campaign: campaigns,
        creator: {
          id: users.id,
          name: users.name,
          email: users.email,
        },
        promoter: {
          id: users.id,
          name: users.name,
          email: users.email,
        }
      })
      .from(campaigns)
      .innerJoin(users, eq(campaigns.creatorId, users.id))
      .crossJoin(users)
      .where(
        and(
          eq(campaigns.id, campaignId),
          eq(users.id, session.user.id)
        )
      );

    // Generate notification for creator
    const notification = ApplicationService.generateComprehensiveNotification(
      'application_submitted',
      {
        campaignTitle: campaign.title,
        promoterName: session.user.name || 'Unknown Promoter',
        creatorName: campaignWithCreator?.creator.name
      }
    );

    // TODO: Send notification to creator (would integrate with notification service)
    console.log('Notification to creator:', {
      recipientId: campaign.creatorId,
      title: notification.title,
      message: notification.message,
      type: 'application_submitted'
    });

    // Prepare response with enhanced information
    const responseData = {
      application: {
        ...newApplication,
        score: applicationScore.score,
        recommendations: applicationScore.recommendations
      },
      campaign: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        ratePerView: campaign.ratePerView
      },
      creator: campaignWithCreator?.creator,
      message: 'Application submitted successfully. You will be notified when the creator reviews your application.',
      nextSteps: [
        'Wait for creator review (typically within 24-48 hours)',
        'If approved, you will receive access to campaign materials',
        'Use your tracking link when promoting the content',
        'Monitor your performance in the dashboard'
      ]
    };

    return NextResponse.json(responseData, { status: 201 });
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

    console.error('Error applying to campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/campaigns/[id]/apply - Get application status
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

    const { id: campaignId } = await params;

    // Get application if exists
    const [application] = await db
      .select({
        application: campaignApplications,
        campaign: campaigns,
        creator: {
          id: users.id,
          name: users.name,
        }
      })
      .from(campaignApplications)
      .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .innerJoin(users, eq(campaigns.creatorId, users.id))
      .where(
        and(
          eq(campaignApplications.campaignId, campaignId),
          eq(campaignApplications.promoterId, session.user.id)
        )
      );

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ application });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}