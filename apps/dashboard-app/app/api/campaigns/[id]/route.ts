import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  requirements: z.array(z.string()).optional(),
});

// GET /api/campaigns/[id] - Simplified campaign endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    return NextResponse.json({
      id: campaignId,
      name: 'Sample Campaign',
      description: 'This is a sample campaign description',
      budget: 1000000,
      requirements: [
        'Must have 1000+ followers',
        'Content must be family-friendly',
      ],
      status: 'active',
      createdAt: new Date().toISOString(),
      creator: {
        id: 'creator-123',
        name: 'Sample Creator',
        email: 'creator@example.com',
      },
      stats: {
        totalApplications: 25,
        approvedApplications: 15,
        totalViews: 50000,
        totalSpent: 250000,
      },
    });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/campaigns/[id] - Update campaign
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = UpdateCampaignSchema.parse(body);

    return NextResponse.json({
      id: campaignId,
      ...validatedData,
      updatedAt: new Date().toISOString(),
      message: 'Campaign updated successfully',
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

    console.error('Error updating campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/campaigns/[id] - Delete campaign
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;

    return NextResponse.json({
      id: campaignId,
      message: 'Campaign deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
