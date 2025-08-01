import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@repo/database';
import { auth } from '@repo/auth/server-only';

const UpdateCampaignSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  budget: z.number().positive().optional(),
  requirements: z.array(z.string()).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

// GET /api/campaigns/[id] - Get specific campaign
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

    // Get campaign
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
      include: {
        creator: true,
        promotions: true
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaign not found' },
        { status: 404 }
      );
    }

    // Check if user owns this campaign (creators only) or is admin
    if (session.user.role === 'creator' && campaign.creatorId !== session.user.id) {
      return NextResponse.json(
        { error: 'Forbidden - You can only access your own campaigns' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      campaign
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
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can update campaigns
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can update campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;
    const body = await request.json();
    const validatedData = UpdateCampaignSchema.parse(body);

    // Check if campaign exists and user owns it
    const existingCampaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        creatorId: session.user.id
      }
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Update campaign
    const updateData: any = {
      ...validatedData,
    };

    // Convert string dates to Date objects
    if (validatedData.startDate) {
      updateData.startDate = new Date(validatedData.startDate);
    }
    if (validatedData.endDate) {
      updateData.endDate = new Date(validatedData.endDate);
    }

    const updatedCampaign = await db.campaign.update({
      where: { id: campaignId },
      data: updateData
    });

    return NextResponse.json({
      campaign: updatedCampaign,
      message: 'Campaign updated successfully'
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
    const session = await auth();
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Only creators can delete campaigns
    if (session.user.role !== 'creator') {
      return NextResponse.json(
        { error: 'Forbidden - Only creators can delete campaigns' },
        { status: 403 }
      );
    }

    const { id: campaignId } = await params;

    // Check if campaign exists and user owns it
    const existingCampaign = await db.campaign.findFirst({
      where: {
        id: campaignId,
        creatorId: session.user.id
      }
    });

    if (!existingCampaign) {
      return NextResponse.json(
        { error: 'Campaign not found or access denied' },
        { status: 404 }
      );
    }

    // Delete campaign (promotions will be deleted via cascade)
    await db.campaign.delete({
      where: { id: campaignId }
    });

    return NextResponse.json({
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}