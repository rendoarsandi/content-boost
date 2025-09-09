import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@repo/auth/server-only';

const ApplyCampaignSchema = z.object({
  submittedContent: z.string().optional(),
  message: z.string().max(500).optional(),
});

function generateTrackingLink(campaignId: string, promoterId: string): string {
  return `https://track.example.com/${campaignId}/${promoterId}/${Date.now()}`;
}

// POST /api/promoter/campaigns/[id]/apply - Apply to a campaign
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can apply to campaigns' },
        { status: 401 }
      );
    }

    const { id: campaignId } = await params;
    const promoterId = (session.user as any).id;

    // Mock campaign data for demo purposes
    const mockCampaigns = [
      {
        id: 'campaign-1',
        title: 'Summer Product Launch',
        status: 'active',
      },
      {
        id: 'campaign-2',
        title: 'Winter Holiday Sale',
        status: 'active',
      },
    ];

    const campaign = mockCampaigns.find(c => c.id === campaignId);

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      );
    }

    // Mock existing applications
    const mockExistingApplications = [
      {
        campaignId: 'campaign-1',
        promoterId: 'promoter-1',
      },
    ];

    const existingApplication = mockExistingApplications.find(
      app => app.campaignId === campaignId && app.promoterId === promoterId
    );

    if (existingApplication) {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const validatedData = ApplyCampaignSchema.parse(body);

    // Generate unique tracking link
    const trackingLink = generateTrackingLink(campaignId, promoterId);

    // Mock create application
    const newApplication = {
      id: `app-${Date.now()}`,
      campaignId,
      promoterId,
      submittedContent: validatedData.submittedContent || '',
      trackingLink,
      appliedAt: new Date().toISOString(),
      status: 'PENDING',
    };

    console.log('Mock application created:', newApplication);

    return NextResponse.json(
      {
        application: newApplication,
        message: 'Application submitted successfully',
      },
      { status: 201 }
    );
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

    console.error('Error applying to campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}