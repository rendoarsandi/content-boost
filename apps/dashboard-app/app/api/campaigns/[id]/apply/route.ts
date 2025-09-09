import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@repo/auth/server-only';

const EnhancedApplicationSchema = z.object({
  submittedContent: z
    .string()
    .min(10, 'Content description must be at least 10 characters')
    .optional(),
  message: z.string().max(500, 'Message too long').optional(),
  proposedContent: z
    .object({
      platform: z.enum(['tiktok', 'instagram']),
      contentType: z.enum(['video', 'image', 'story', 'reel']),
      description: z
        .string()
        .min(20, 'Content description must be at least 20 characters'),
      hashtags: z
        .array(z.string())
        .max(30, 'Maximum 30 hashtags allowed')
        .optional(),
      estimatedReach: z.number().positive().optional(),
    })
    .optional(),
});

// POST /api/campaigns/[id]/apply - Apply to a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Only promoters can apply to campaigns
    if ((session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Forbidden - Only promoters can apply to campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = EnhancedApplicationSchema.parse(body);

    // Mock campaign data for demo purposes
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        creatorId: 'creator-1',
        status: 'active',
        createdAt: new Date('2024-01-01').toISOString(),
      },
      {
        id: 'campaign-2',
        title: 'Winter Holiday Sale', 
        creatorId: 'creator-1',
        status: 'active',
        createdAt: new Date('2024-02-01').toISOString(),
      },
    ];

    const campaign = mockCampaigns.find(c => c.id === campaignId);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Mock existing applications check
    const mockExistingApplications = [
      {
        id: 'app-1',
        campaignId: 'campaign-1',
        promoterId: 'promoter-1',
      },
    ];

    const existingApplication = mockExistingApplications.find(
      app => app.campaignId === campaignId && app.promoterId === (session.user as any).id
    );

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 400 }
      );
    }

    // Generate tracking link
    const trackingLink = `https://track.example.com/${campaignId}/${(session.user as any).id}/${Date.now()}`;

    // Mock create application
    const newApplication = {
      id: `app-${Date.now()}`,
      campaignId: campaignId,
      promoterId: (session.user as any).id,
      submittedContent: validatedData.submittedContent || '',
      trackingLink: trackingLink,
      appliedAt: new Date().toISOString(),
      status: 'PENDING',
    };

    console.log('Mock application created:', newApplication);

    // Return success response
    return NextResponse.json({
      success: true,
      message: 'Application submitted successfully',
      application: {
        id: newApplication.id,
        status: newApplication.status,
        appliedAt: newApplication.appliedAt,
        trackingLink: newApplication.trackingLink,
      },
      campaign: {
        id: campaign.id,
        title: campaign.title,
      },
      nextSteps: [
        'Your application is now under review by the campaign creator',
        'You will receive a notification once your application is reviewed',
        'If approved, you can start promoting using your tracking link',
      ],
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Validation error',
          details: error.issues,
        },
        { status: 400 }
      );
    }

    console.error('Error submitting application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}