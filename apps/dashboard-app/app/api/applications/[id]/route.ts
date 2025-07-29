import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// import { campaignApplications, campaigns } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';
import { generateTrackingLink } from '@repo/utils';

const CreateApplicationSchema = z.object({
  campaignId: z.string().uuid('Invalid campaign ID'),
  submittedContent: z.string().optional(),
});

// POST /api/applications/[id] - Apply to a campaign
export async function POST(
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

    // Only promoters can apply to campaigns
    if ((session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Forbidden - Only promoters can apply to campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = CreateApplicationSchema.parse({ 
      ...body, 
      campaignId 
    });

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

    if (campaign.status !== 'active') {
      return NextResponse.json(
        { error: 'Campaign is not active' },
        { status: 400 }
      );
    }

    // Check if user already applied
    const existingApplication = await db
      .select()
      .from(campaignApplications)
      .where(
        and(
          eq(campaignApplications.campaignId, campaignId),
          eq(campaignApplications.promoterId, (session.user as any).id)
        )
      );

    if (existingApplication.length > 0) {
      return NextResponse.json(
        { error: 'You have already applied to this campaign' },
        { status: 400 }
      );
    }

    // Generate unique tracking link
    const trackingLink = generateTrackingLink((session.user as any).id, campaignId);

    // Create application
    const [newApplication] = await db
      .insert(campaignApplications)
      .values({
        campaignId,
        promoterId: (session.user as any).id,
        status: 'pending',
        submittedContent: validatedData.submittedContent,
        trackingLink,
        appliedAt: new Date(),
      })
      .returning();

    return NextResponse.json(
      { 
        application: newApplication,
        message: 'Application submitted successfully'
      },
      { status: 201 }
    );
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

    console.error('Error creating application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/applications/[id] - Get application details
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

    const { id: applicationId } = await params;

    // Get application with campaign details
    const [application] = await db
      .select({
        application: campaignApplications,
        campaign: campaigns,
      })
      .from(campaignApplications)
      .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .where(eq(campaignApplications.id, applicationId));

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Check if user owns this application or is the campaign creator
    const isOwner = application.application.promoterId === (session.user as any).id;
    const isCreator = application.campaign.creatorId === (session.user as any).id;

    if (!isOwner && !isCreator) {
      return NextResponse.json(
        { error: 'Forbidden - You can only view your own applications' },
        { status: 403 }
      );
    }

    return NextResponse.json({ 
      application: application.application,
      campaign: application.campaign
    });
  } catch (error) {
    console.error('Error fetching application:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}