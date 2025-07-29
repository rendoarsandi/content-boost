import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
// import { campaignApplications, campaigns } from '@repo/database';
// import { eq, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';

const UpdateStatusSchema = z.object({
  status: z.enum(['approved', 'rejected'], {
    required_error: 'Status is required',
    invalid_type_error: 'Status must be either approved or rejected',
  }),
});

// PATCH /api/applications/[id]/status - Update application status
export async function PATCH(
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

    // Only creators can update application status
    if ((session.user as any).role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can update application status' },
        { status: 403 }
      );
    }

    const { id: applicationId } = await params;
    const body = await request.json();
    const validatedData = UpdateStatusSchema.parse(body);

    // Get application with campaign details to verify ownership
    const [applicationWithCampaign] = await db
      .select({
        application: campaignApplications,
        campaign: campaigns,
      })
      .from(campaignApplications)
      .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .where(eq(campaignApplications.id, applicationId));

    if (!applicationWithCampaign) {
      return NextResponse.json(
        { error: 'Application not found' },
        { status: 404 }
      );
    }

    // Verify that the current user owns the campaign
    if (applicationWithCampaign.campaign.creatorId !== (session.user as any).id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only update applications for your own campaigns' },
        { status: 403 }
      );
    }

    // Check if application is still pending
    if (applicationWithCampaign.application.status !== 'pending') {
      return NextResponse.json(
        { error: 'Application has already been reviewed' },
        { status: 400 }
      );
    }

    // Update application status
    const [updatedApplication] = await db
      .update(campaignApplications)
      .set({
        status: validatedData.status,
        reviewedAt: new Date(),
      })
      .where(eq(campaignApplications.id, applicationId))
      .returning();

    return NextResponse.json({
      application: updatedApplication,
      message: `Application ${validatedData.status} successfully`,
    });
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

    console.error('Error updating application status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}