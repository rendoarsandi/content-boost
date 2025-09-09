import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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

    // Mock application data for demo purposes
    const mockApplications = [
      {
        id: 'app-1',
        promoterId: 'promoter-1',
        campaignId: 'campaign-1',
        submittedContent: 'https://example.com/my-content',
        appliedAt: new Date('2024-01-15').toISOString(),
        campaign: {
          id: 'campaign-1',
          title: 'Summer Product Launch',
          budget: 5000000,
        },
      },
      {
        id: 'app-2',
        promoterId: 'promoter-2',
        campaignId: 'campaign-2',
        submittedContent: 'https://example.com/my-content-2',
        appliedAt: new Date('2024-02-05').toISOString(),
        campaign: {
          id: 'campaign-2',
          title: 'Winter Holiday Sale',
          budget: 3000000,
        },
      },
    ];

    const application = mockApplications.find(
      app => app.id === applicationId && app.promoterId === promoterId
    );

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }

    // Mock campaign materials
    const mockMaterials = [
      {
        id: 'material-1',
        campaignId: 'campaign-1',
        type: 'image',
        url: 'https://example.com/campaign-banner.jpg',
        title: 'Campaign Banner',
        description: 'Main promotional banner for the campaign',
        createdAt: new Date('2024-01-01').toISOString(),
      },
      {
        id: 'material-2',
        campaignId: 'campaign-1',
        type: 'video',
        url: 'https://example.com/product-demo.mp4',
        title: 'Product Demo Video',
        description: 'Video showcasing product features',
        createdAt: new Date('2024-01-02').toISOString(),
      },
      {
        id: 'material-3',
        campaignId: 'campaign-2',
        type: 'google_drive',
        url: 'https://drive.google.com/file/d/example',
        title: 'Brand Guidelines',
        description: 'Complete brand guidelines document',
        createdAt: new Date('2024-02-01').toISOString(),
      },
    ];

    const materials = mockMaterials.filter(m => m.campaignId === application.campaign.id);

    return NextResponse.json({
      application,
      campaign: {
        id: application.campaign.id,
        name: application.campaign.title,
        budget: application.campaign.budget,
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
        {
          error: 'Unauthorized - Only promoters can update application content',
        },
        { status: 401 }
      );
    }

    const { id: applicationId } = await params;
    const promoterId = (session.user as any).id;

    // Mock application data for demo purposes
    const mockApplications = [
      {
        id: 'app-1',
        promoterId: 'promoter-1',
        campaignId: 'campaign-1',
        submittedContent: 'https://example.com/my-content',
        appliedAt: new Date('2024-01-15').toISOString(),
      },
      {
        id: 'app-2',
        promoterId: 'promoter-2',
        campaignId: 'campaign-2',
        submittedContent: 'https://example.com/my-content-2',
        appliedAt: new Date('2024-02-05').toISOString(),
      },
    ];

    const application = mockApplications.find(
      app => app.id === applicationId && app.promoterId === promoterId
    );

    if (!application) {
      return NextResponse.json(
        { error: 'Application not found or access denied' },
        { status: 404 }
      );
    }

    const body = await request.json();
    const validatedData = UpdateContentSchema.parse(body);

    // Mock update application content
    const updatedApplication = {
      ...application,
      submittedContent: validatedData.submittedContent,
      updatedAt: new Date().toISOString(),
    };

    console.log('Mock application updated:', updatedApplication);

    return NextResponse.json({
      application: updatedApplication,
      message: 'Content updated successfully',
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

    console.error('Error updating application content:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}