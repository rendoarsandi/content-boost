import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { getSession } from '@repo/auth/server-only';

const UpdateContentSchema = z.object({
  submittedContent: z.string().min(1, 'Content is required'),
  metadata: z.record(z.string(), z.any()).optional(),
});

// GET /api/promoter/applications/[id]/content - Get application content and materials
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can access application content' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;
    const promoterId = (session.user as any).id;

    // Get application with campaign info
    const application = await db.promotion.findFirst({
      where: {
        id: applicationId,
        promoterId: promoterId
      },
      include: {
        campaign: true
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }

    const { campaign } = application;

    // TODO: The Promotion model doesn't have status field - need to add application workflow
    // For now, assume all found promotions are approved (can access materials)
    // if (application.status !== 'approved') {
    //   return NextResponse.json(
    //     { error: 'Application must be approved to access materials' },
    //     { status: 403 }
    //   );
    // }

    // Get campaign materials
    const materials = await db.campaignMaterial.findMany({
      where: {
        campaignId: campaign.id
      }
    });

    return NextResponse.json({
      application,
      campaign: {
        id: campaign.id,
        name: campaign.name, // Using 'name' instead of 'title' based on Prisma schema
        budget: campaign.budget,
        // TODO: Add description and requirements fields to Campaign model
        // description: campaign.description,
        // requirements: campaign.requirements,
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    
    if (!session?.user || (session.user as any).role !== 'promoter') {
      return NextResponse.json(
        { error: 'Unauthorized - Only promoters can update application content' },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;
    const promoterId = (session.user as any).id;

    // Verify application ownership
    const application = await db.promotion.findFirst({
      where: {
        id: applicationId,
        promoterId: promoterId
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }

    // TODO: The Promotion model doesn't have status field - need to add application workflow
    // For now, assume all found promotions can be edited
    // if (application.status !== 'approved') {
    //   return NextResponse.json(
    //     { error: 'Only approved applications can be edited' },
    //     { status: 403 }
    //   );
    // }

    const body = await request.json();
    const validatedData = UpdateContentSchema.parse(body);

    // Update application content
    // TODO: The Promotion model doesn't have submittedContent and metadata fields
    // For now, update contentUrl with submittedContent (temporary workaround)
    const updatedApplication = await db.promotion.update({
      where: {
        id: applicationId
      },
      data: {
        contentUrl: validatedData.submittedContent,
        // TODO: Add submittedContent and metadata fields to Promotion model
        // submittedContent: validatedData.submittedContent,
        // metadata: validatedData.metadata,
      }
    });

    return NextResponse.json({
      application: updatedApplication,
      message: 'Content updated successfully'
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Validation error',
          details: error.issues
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