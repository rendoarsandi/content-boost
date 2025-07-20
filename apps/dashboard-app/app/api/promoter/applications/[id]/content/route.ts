import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { campaignApplications, campaigns, campaignMaterials } from '@repo/database';
import { eq, and } from 'drizzle-orm';
import { getSession } from '@repo/auth/server-only';

const UpdateContentSchema = z.object({
  submittedContent: z.string().min(1, 'Content is required'),
  metadata: z.record(z.any()).optional(),
});

// GET /api/promoter/applications/[id]/content - Get application content and materials
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can access application content' },
        { status: 401 }
      );
    }

    const applicationId = params.id;
    const promoterId = (session.user as any).id;

    // Get application with campaign info
    const applicationData = await db
      .select({
        application: campaignApplications,
        campaign: campaigns,
      })
      .from(campaignApplications)
      .innerJoin(campaigns, eq(campaignApplications.campaignId, campaigns.id))
      .where(
        and(
          eq(campaignApplications.id, applicationId),
          eq(campaignApplications.promoterId, promoterId)
        )
      )
      .limit(1);

    if (!applicationData.length) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }

    const { application, campaign } = applicationData[0];

    // Only approved applications can access materials
    if (application.status !== 'approved') {
      return NextResponse.json(
        { error: 'Application must be approved to access materials' },
        { status: 403 }
      );
    }

    // Get campaign materials
    const materials = await db
      .select()
      .from(campaignMaterials)
      .where(eq(campaignMaterials.campaignId, campaign.id));

    return NextResponse.json({
      application,
      campaign: {
        id: campaign.id,
        title: campaign.title,
        description: campaign.description,
        requirements: campaign.requirements,
      },
      materials,
    });
  } catch (error) {
    console.error('Error fetching application content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/promoter/applications/[id]/content - Update application content
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can update application content' },
        { status: 401 }
      );
    }

    const applicationId = params.id;
    const promoterId = (session.user as any).id;

    // Verify application ownership
    const application = await db
      .select()
      .from(campaignApplications)
      .where(
        and(
          eq(campaignApplications.id, applicationId),
          eq(campaignApplications.promoterId, promoterId)
        )
      )
      .limit(1);

    if (!application.length) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }

    // Only approved applications can be edited
    if (application[0].status !== 'approved') {
      return NextResponse.json(
        { error: 'Only approved applications can be edited' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateContentSchema.parse(body);

    // Update application content
    const [updatedApplication] = await db
      .update(campaignApplications)
      .set({
        submittedContent: validatedData.submittedContent,
        metadata: validatedData.metadata,
      })
      .where(eq(campaignApplications.id, applicationId))
      .returning();

    return NextResponse.json({
      application: updatedApplication,
      message: 'Content updated successfully'
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

    console.error('Error updating application content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}